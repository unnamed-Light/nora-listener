
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Task {
    Transcribe,
    Translate,
}
extern crate candle_core as candle;

pub fn pcm_decode(path: &str) -> anyhow::Result<(Vec<f32>, u32)> {
    use symphonia::core::audio::SampleBuffer;
    use symphonia::core::codecs::DecoderOptions;
    use symphonia::core::errors::Error;
    use symphonia::core::formats::FormatOptions;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::meta::MetadataOptions;
    use symphonia::core::probe::Hint;

    let src = std::fs::File::open(path)?;
    let mss = MediaSourceStream::new(Box::new(src), Default::default());

    let mut hint = Hint::new();
    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| anyhow::anyhow!("Failed to probe audio: {:?}", e))?;

    let mut format = probed.format;
    let track = format.default_track().ok_or_else(|| anyhow::anyhow!("No audio track found"))?;
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| anyhow::anyhow!("Failed to create decoder: {:?}", e))?;

    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(16000);
    let channels = track.codec_params.channels.map(|c| c.count()).unwrap_or(1);

    let mut sample_buf = None;
    let mut samples: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(Error::IoError(_)) | Err(Error::ResetRequired) => break,
            Err(_) => break,
        };
        if packet.track_id() != track_id {
            continue;
        }

        match decoder.decode(&packet) {
            Ok(audio_buf) => {
                if sample_buf.is_none() {
                    let spec = *audio_buf.spec();
                    let duration = audio_buf.capacity() as u64;
                    sample_buf = Some(SampleBuffer::<f32>::new(duration, spec));
                }

                if let Some(buf) = &mut sample_buf {
                    buf.copy_interleaved_ref(audio_buf);
                    
                    let interleaved = buf.samples();
                    
                    if channels == 1 {
                        samples.extend_from_slice(interleaved);
                    } else if channels == 2 {
                        // Mix to mono
                        for chunk in interleaved.chunks_exact(2) {
                            samples.push((chunk[0] + chunk[1]) / 2.0);
                        }
                    } else {
                        // Take first channel
                        for chunk in interleaved.chunks_exact(channels) {
                            samples.push(chunk[0]);
                        }
                    }
                }
            }
            Err(Error::IoError(_)) => break,
            Err(Error::DecodeError(_)) => (),
            Err(_) => break,
        }
    }

    // Now resample to 16000 if needed (Linear interpolation)
    if sample_rate != 16000 {
        let mut resampled = Vec::new();
        let ratio = sample_rate as f64 / 16000.0;
        let new_len = (samples.len() as f64 / ratio) as usize;
        for i in 0..new_len {
            let src_idx = i as f64 * ratio;
            let mut idx_floor = src_idx.floor() as usize;
            if idx_floor >= samples.len() {
                idx_floor = samples.len().saturating_sub(1);
            }
            let idx_ceil = (idx_floor + 1).min(samples.len().saturating_sub(1));
            let frac = (src_idx - idx_floor as f64) as f32;
            let val = samples[idx_floor] * (1.0 - frac) + samples[idx_ceil] * frac;
            resampled.push(val);
        }
        preprocess_audio_signal(&mut resampled, 16000);
        return Ok((resampled, 16000));
    }

    preprocess_audio_signal(&mut samples, sample_rate);
    Ok((samples, sample_rate))
}

pub fn preprocess_audio_signal(samples: &mut [f32], sample_rate: u32) {
    if samples.is_empty() {
        return;
    }

    // 1. High-Pass Filter (Butterworth 2nd-order at 80 Hz) to eliminate DC-offset and low-frequency rumble
    let fs = sample_rate as f32;
    let fc = 80.0f32;
    let q = 0.7071f32;

    let w0 = 2.0 * std::f32::consts::PI * fc / fs;
    let alpha = w0.sin() / (2.0 * q);
    let cos_w0 = w0.cos();

    let b0 = (1.0 + cos_w0) / 2.0;
    let b1 = -(1.0 + cos_w0);
    let b2 = (1.0 + cos_w0) / 2.0;
    let a0 = 1.0 + alpha;
    let a1 = -2.0 * cos_w0;
    let a2 = 1.0 - alpha;

    let b0_norm = b0 / a0;
    let b1_norm = b1 / a0;
    let b2_norm = b2 / a0;
    let a1_norm = a1 / a0;
    let a2_norm = a2 / a0;

    let mut x1 = 0.0f32;
    let mut x2 = 0.0f32;
    let mut y1 = 0.0f32;
    let mut y2 = 0.0f32;
    let mut max_abs = 0.0f32;

    for s in samples.iter_mut() {
        let x0 = *s;
        let y0 = b0_norm * x0 + b1_norm * x1 + b2_norm * x2 - a1_norm * y1 - a2_norm * y2;

        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;

        *s = y0;

        let abs_val = y0.abs();
        if abs_val > max_abs {
            max_abs = abs_val;
        }
    }

    // 2. Peak normalization to 0.92 (-0.7 dBFS) for quiet recordings
    if max_abs > 0.001 && max_abs < 0.85 {
        let gain = (0.92 / max_abs).min(8.0);
        for s in samples.iter_mut() {
            *s = (*s * gain).clamp(-1.0, 1.0);
        }
    }
}
use hound::WavReader;
// https://github.com/openai/whisper/blob/main/whisper/model.py/rgs
// TODO:
// - Batch size greater than 1.
// - More token filters (SuppressBlanks, ApplyTimestampRules).

#[cfg(feature = "accelerate")]
extern crate accelerate_src;

#[cfg(feature = "mkl")]
extern crate intel_mkl_src;

use anyhow::{Error as E, Result};
use candle::{Device, IndexOp, Tensor};
use candle::IndexOp as _;
use hf_hub::api::sync::Api;
use candle_nn::{
    ops::{log_softmax, softmax},
    VarBuilder,
};

use rand::distributions::weighted::WeightedIndex;
use rand::distributions::Distribution;
use rand::SeedableRng;
use tokenizers::Tokenizer;



use candle_transformers::models::whisper::{self as m, audio, Config};

pub enum Model {
    Normal(m::model::Whisper),
    Quantized(m::quantized_model::Whisper),
}

// Maybe we should use some traits rather than doing the dispatch for all these.
impl Model {
    pub fn config(&self) -> &Config {
        match self {
            Self::Normal(m) => &m.config,
            Self::Quantized(m) => &m.config,
        }
    }

    pub fn encoder_forward(&mut self, x: &Tensor, flush: bool) -> candle::Result<Tensor> {
        match self {
            Self::Normal(m) => m.encoder.forward(x, flush),
            Self::Quantized(m) => m.encoder.forward(x, flush),
        }
    }

    pub fn decoder_forward(
        &mut self,
        x: &Tensor,
        xa: &Tensor,
        flush: bool,
    ) -> candle::Result<Tensor> {
        match self {
            Self::Normal(m) => m.decoder.forward(x, xa, flush),
            Self::Quantized(m) => m.decoder.forward(x, xa, flush),
        }
    }

    pub fn decoder_final_linear(&self, x: &Tensor) -> candle::Result<Tensor> {
        match self {
            Self::Normal(m) => m.decoder.final_linear(x),
            Self::Quantized(m) => m.decoder.final_linear(x),
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
struct DecodingResult {
    tokens: Vec<u32>,
    text: String,
    avg_logprob: f64,
    no_speech_prob: f64,
    temperature: f64,
    compression_ratio: f64,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
struct Segment {
    start: f64,
    duration: f64,
    dr: DecodingResult,
}

struct Decoder {
    model: Model,
    rng: rand::rngs::StdRng,
    task: Option<Task>,
    timestamps: bool,
    max_initial_timestamp_index: Option<u32>,
    verbose: bool,
    tokenizer: Tokenizer,
    suppress_tokens: Tensor,
    sot_token: u32,
    transcribe_token: u32,
    translate_token: u32,
    eot_token: u32,
    no_speech_token: u32,
    no_timestamps_token: u32,
    language_token: Option<u32>,
}

impl Decoder {
    #[allow(clippy::too_many_arguments)]
    fn new(
        model: Model,
        tokenizer: Tokenizer,
        seed: u64,
        device: &Device,
        language_token: Option<u32>,
        task: Option<Task>,
        timestamps: bool,
        max_initial_timestamp_index: Option<u32>,
        verbose: bool,
    ) -> Result<Self> {
        let no_timestamps_token = token_id(&tokenizer, m::NO_TIMESTAMPS_TOKEN)?;
        // Suppress the notimestamps token when in timestamps mode.
        // https://github.com/openai/whisper/blob/e8622f9afc4eba139bf796c210f5c01081000472/whisper/decoding.py#L452
        let suppress_tokens: Vec<f32> = (0..model.config().vocab_size as u32)
            .map(|i| {
                if model.config().suppress_tokens.contains(&i)
                    || timestamps && i == no_timestamps_token
                {
                    f32::NEG_INFINITY
                } else {
                    0f32
                }
            })
            .collect();
        let suppress_tokens = Tensor::new(suppress_tokens.as_slice(), device)?;
        let sot_token = token_id(&tokenizer, m::SOT_TOKEN)?;
        let transcribe_token = token_id(&tokenizer, m::TRANSCRIBE_TOKEN)?;
        let translate_token = token_id(&tokenizer, m::TRANSLATE_TOKEN)?;
        let eot_token = token_id(&tokenizer, m::EOT_TOKEN)?;
        let no_speech_token = m::NO_SPEECH_TOKENS
            .iter()
            .find_map(|token| token_id(&tokenizer, token).ok());
        let no_speech_token = match no_speech_token {
            None => anyhow::bail!("unable to find any non-speech token"),
            Some(n) => n,
        };
        Ok(Self {
            model,
            rng: rand::rngs::StdRng::seed_from_u64(seed),
            tokenizer,
            task,
            timestamps,
            max_initial_timestamp_index,
            verbose,
            suppress_tokens,
            sot_token,
            transcribe_token,
            translate_token,
            eot_token,
            no_speech_token,
            language_token,
            no_timestamps_token,
        })
    }

    fn decode(&mut self, mel: &Tensor, t: f64) -> Result<DecodingResult> {
        let audio_features = self.model.encoder_forward(mel, true)?;
        if self.verbose {
            println!("audio features: {:?}", audio_features.dims());
        }
        let sample_len = self.model.config().max_target_positions / 2;
        let mut sum_logprob = 0f64;
        let mut no_speech_prob = f64::NAN;
        let mut tokens = vec![self.sot_token];
        if let Some(language_token) = self.language_token {
            tokens.push(language_token);
        }
        match self.task {
            None | Some(Task::Transcribe) => tokens.push(self.transcribe_token),
            Some(Task::Translate) => tokens.push(self.translate_token),
        }
        if !self.timestamps {
            tokens.push(self.no_timestamps_token);
        }
        for i in 0..sample_len {
            let tokens_t = Tensor::new(tokens.as_slice(), mel.device())?;

            // The model expects a batch dim but this inference loop does not handle
            // it so we add it at this point.
            let tokens_t = tokens_t.unsqueeze(0)?;
            let ys = self
                .model
                .decoder_forward(&tokens_t, &audio_features, i == 0)?;

            // Extract the no speech probability on the first iteration by looking at the first
            // token logits and the probability for the according token.
            if i == 0 {
                let logits = self.model.decoder_final_linear(&ys.i(..1)?)?.i(0)?.i(0)?;
                no_speech_prob = softmax(&logits, 0)?
                    .i(self.no_speech_token as usize)?
                    .to_scalar::<f32>()? as f64;
            }

            let (_, seq_len, _) = ys.dims3()?;
            let logits = self
                .model
                .decoder_final_linear(&ys.i((..1, seq_len - 1..))?)?
                .i(0)?
                .i(0)?;

            // Apply timestamp rules when timestamps are enabled
            let mut logits = if self.timestamps {
                self.apply_timestamp_rules(&logits, &tokens)?
            } else {
                logits
            };

            logits = logits.broadcast_add(&self.suppress_tokens)?;

            // === Repetition Penalty ===
            let penalty_window = 50; 
            let penalty_factor = 1.2f32;
            let sum_tokens_v = tokens.as_slice(); // FIX: The variable is `tokens`
            let len = sum_tokens_v.len();
            let window_start = len.saturating_sub(penalty_window);
            let mut penalty_mask = vec![1.0f32; self.model.config().vocab_size];
            
            for &token in sum_tokens_v[window_start..].iter() {
                let token_idx = token as usize;
                if token_idx < penalty_mask.len() && token_idx < self.eot_token as usize {
                    penalty_mask[token_idx] = penalty_factor;
                }
            }
            let penalty_tensor = Tensor::new(penalty_mask.as_slice(), logits.device())?;
            
            // For logits > 0, dividing by penalty reduces them. For logits < 0, dividing INCREASES them (making them less negative).
            // Proper way is: if logit > 0 { logit / penalty } else { logit * penalty }
            // Let's use simple subtraction for penalty instead to avoid sign issues.
            // A penalty of subtracting 2.0 from the logit is usually enough.
            
            let mut penalty_sub_mask = vec![0.0f32; self.model.config().vocab_size];
            let penalty_sub_val = 2.5f32;
            for &token in sum_tokens_v[window_start..].iter() {
                let token_idx = token as usize;
                if token_idx < penalty_sub_mask.len() && token_idx < self.eot_token as usize {
                    penalty_sub_mask[token_idx] = penalty_sub_val;
                }
            }
            let penalty_sub_tensor = Tensor::new(penalty_sub_mask.as_slice(), logits.device())?;
            logits = logits.broadcast_sub(&penalty_sub_tensor)?;
            // ==========================

            let next_token = if t > 0f64 {
                let prs = softmax(&(&logits / t)?, 0)?;
                let logits_v: Vec<f32> = prs.to_vec1()?;
                let distr = WeightedIndex::new(&logits_v)?;
                distr.sample(&mut self.rng) as u32
            } else {
                let logits_v: Vec<f32> = logits.to_vec1()?;
                logits_v
                    .iter()
                    .enumerate()
                    .max_by(|(_, u), (_, v)| u.total_cmp(v))
                    .map(|(i, _)| i as u32)
                    .unwrap()
            };
            tokens.push(next_token);
            let prob = softmax(&logits, candle::D::Minus1)?
                .i(next_token as usize)?
                .to_scalar::<f32>()? as f64;
            if next_token == self.eot_token
                || tokens.len() > self.model.config().max_target_positions
            {
                break;
            }
            sum_logprob += prob.ln();
        }
        let text = self.tokenizer.decode(&tokens, true).map_err(E::msg)?;
        let avg_logprob = sum_logprob / tokens.len() as f64;
        
        let mut compression_ratio = f64::NAN;
        if !text.is_empty() {
            use std::io::Write;
            let mut encoder = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
            if encoder.write_all(text.as_bytes()).is_ok() {
                if let Ok(compressed) = encoder.finish() {
                    compression_ratio = (text.len() as f64) / (compressed.len() as f64);
                }
            }
        }

        Ok(DecodingResult {
            tokens,
            text,
            avg_logprob,
            no_speech_prob,
            temperature: t,
            compression_ratio,
        })

    }

    fn decode_with_fallback(&mut self, segment: &Tensor) -> Result<DecodingResult> {
        for (i, &t) in m::TEMPERATURES.iter().enumerate() {
            let dr: Result<DecodingResult> = self.decode(segment, t);
            if i == m::TEMPERATURES.len() - 1 {
                return dr;
            }
            // On errors, we try again with a different temperature.
            match dr {
                Ok(dr) => {
                    // m::COMPRESSION_RATIO_THRESHOLD is usually 2.4, we lower it to 1.8 for Russian
                    let compression_threshold = 1.8;
                    let needs_fallback = dr.compression_ratio > compression_threshold
                        || dr.avg_logprob < m::LOGPROB_THRESHOLD;
                    if !needs_fallback || dr.no_speech_prob > m::NO_SPEECH_THRESHOLD {
                        return Ok(dr);
                    }
                    println!("Fallback triggered at temp {t}: compression={:.2}, logprob={:.2}", dr.compression_ratio, dr.avg_logprob);
                }
                Err(err) => {
                    println!("Error running at {t}: {err}")
                }
            }
        }
        unreachable!()
    }

    fn apply_timestamp_rules(&self, input_logits: &Tensor, tokens: &[u32]) -> Result<Tensor> {
        let device = input_logits.device().clone();
        let timestamp_begin = self.no_timestamps_token + 1;
        let vocab_size = self.model.config().vocab_size as u32;

        // ========== SETUP: Extract sampled tokens for analysis ==========
        let sample_begin = if self.language_token.is_some() { 3 } else { 2 };
        let sampled_tokens = if tokens.len() > sample_begin {
            &tokens[sample_begin..]
        } else {
            &[]
        };

        let mut masks = Vec::new();
        // Pre-allocate reusable mask buffer to avoid repeated allocations
        let mut mask_buffer = vec![0.0f32; vocab_size as usize];

        // ========== RULE 1: Timestamp pairing constraints ==========
        // Timestamps must come in pairs, except directly before EOT
        if !sampled_tokens.is_empty() {
            let last_was_timestamp = sampled_tokens
                .last()
                .map(|&t| t >= timestamp_begin)
                .unwrap_or(false);

            let penultimate_was_timestamp = if sampled_tokens.len() >= 2 {
                sampled_tokens[sampled_tokens.len() - 2] >= timestamp_begin
            } else {
                false
            };

            if last_was_timestamp {
                if penultimate_was_timestamp {
                    // Has to be non-timestamp - suppress timestamp tokens
                    for i in 0..vocab_size {
                        mask_buffer[i as usize] = if i >= timestamp_begin {
                            f32::NEG_INFINITY
                        } else {
                            0.0
                        };
                    }
                    masks.push(Tensor::new(mask_buffer.as_slice(), &device)?);
                } else {
                    // Cannot be normal text tokens - suppress everything before EOT
                    for i in 0..vocab_size {
                        mask_buffer[i as usize] = if i < self.eot_token {
                            f32::NEG_INFINITY
                        } else {
                            0.0
                        };
                    }
                    masks.push(Tensor::new(mask_buffer.as_slice(), &device)?);
                }
            }

            // ========== RULE 2: Non-decreasing timestamp constraint ==========
            // Timestamps shouldn't decrease; forbid timestamp tokens smaller than the last
            let timestamp_tokens: Vec<u32> = sampled_tokens
                .iter()
                .filter(|&&t| t >= timestamp_begin)
                .cloned()
                .collect();

            if !timestamp_tokens.is_empty() {
                let timestamp_last = if last_was_timestamp && !penultimate_was_timestamp {
                    *timestamp_tokens.last().unwrap()
                } else {
                    timestamp_tokens.last().unwrap() + 1
                };

                for i in 0..vocab_size {
                    mask_buffer[i as usize] = if i >= timestamp_begin && i < timestamp_last {
                        f32::NEG_INFINITY
                    } else {
                        0.0
                    };
                }
                masks.push(Tensor::new(mask_buffer.as_slice(), &device)?);
            }
        }

        // ========== RULE 3: Force initial timestamp ==========
        // At the beginning, suppress generating non-timestamp tokens
        if tokens.len() == sample_begin {
            for i in 0..vocab_size {
                mask_buffer[i as usize] = if i < timestamp_begin {
                    f32::NEG_INFINITY
                } else {
                    0.0
                };
            }
            masks.push(Tensor::new(mask_buffer.as_slice(), &device)?);

            // Apply the max_initial_timestamp constraint
            if let Some(max_initial_timestamp_index) = self.max_initial_timestamp_index {
                let last_allowed = timestamp_begin + max_initial_timestamp_index;
                if last_allowed < vocab_size {
                    for i in 0..vocab_size {
                        mask_buffer[i as usize] = if i > last_allowed {
                            f32::NEG_INFINITY
                        } else {
                            0.0
                        };
                    }
                    masks.push(Tensor::new(mask_buffer.as_slice(), &device)?);
                }
            }
        }

        // ========== APPLY MASKS: Apply all constraint masks ==========
        let mut logits = input_logits.clone();
        for mask in masks {
            logits = logits.broadcast_add(&mask)?;
        }

        // ========== RULE 4: Probability-based timestamp preference ==========
        // If sum of probability over timestamps is above any other token, sample timestamp
        let log_probs = log_softmax(&logits, 0)?;

        // Extract timestamp and text log probabilities
        let timestamp_log_probs = log_probs.narrow(
            0,
            timestamp_begin as usize,
            vocab_size as usize - timestamp_begin as usize,
        )?;

        let text_log_probs = log_probs.narrow(0, 0, timestamp_begin as usize)?;

        // Implement logsumexp for timestamp tokens (numerically stable)
        let timestamp_logprob = {
            let max_val = timestamp_log_probs.max(0)?;
            let shifted = timestamp_log_probs.broadcast_sub(&max_val)?;
            let exp_shifted = shifted.exp()?;
            let sum_exp = exp_shifted.sum(0)?;
            let log_sum = sum_exp.log()?;
            max_val.broadcast_add(&log_sum)?.to_scalar::<f32>()?
        };

        // Get max text token log probability
        let max_text_token_logprob: f32 = text_log_probs.max(0)?.to_scalar::<f32>()?;

        // Compare in log space
        if timestamp_logprob > max_text_token_logprob {
            // Only consider timestamp tokens
            for i in 0..vocab_size {
                mask_buffer[i as usize] = if i < timestamp_begin {
                    f32::NEG_INFINITY
                } else {
                    0.0
                };
            }
            let mask_tensor = Tensor::new(mask_buffer.as_slice(), &device)?;
            logits = logits.broadcast_add(&mask_tensor)?;
        }

        Ok(logits)
    }

    fn run(&mut self, mel: &Tensor, app: &tauri::AppHandle) -> Result<Vec<Segment>> {
        use tauri::Emitter;
        let (_, _, content_frames) = mel.dims3()?;
        let mut seek = 0;
        let mut segments = vec![];
        while seek < content_frames {
            let start = std::time::Instant::now();
            let time_offset = (seek * m::HOP_LENGTH) as f64 / m::SAMPLE_RATE as f64;
            let segment_size = usize::min(content_frames - seek, m::N_FRAMES);
            let mel_segment = mel.narrow(2, seek, segment_size)?;
            let segment_duration = (segment_size * m::HOP_LENGTH) as f64 / m::SAMPLE_RATE as f64;
            let dr = self.decode_with_fallback(&mel_segment)?;
            seek += segment_size;
            
            let progress = (seek as f32 / content_frames as f32) * 100.0;
            let _ = app.emit("transcription-progress", progress);

            if dr.no_speech_prob > m::NO_SPEECH_THRESHOLD && dr.avg_logprob < m::LOGPROB_THRESHOLD {
                println!("no speech detected, skipping {seek} {dr:?}");
                continue;
            }
            
            // Final hallucination check before sending to UI
            let is_hallucination = dr.compression_ratio > 1.8 || crate::cloud_api::is_hallucination(&dr.text);
            if is_hallucination {
                println!("Hallucination detected (compression={:.2}, text='{}'), skipping segment.", dr.compression_ratio, dr.text);
            }

            if !is_hallucination {
                let _ = app.emit("transcription-event", dr.text.clone());
            }
            
            let segment = Segment {
                start: time_offset,
                duration: segment_duration,
                dr,
            };
            if self.timestamps {
                println!(
                    "{:.1}s -- {:.1}s",
                    segment.start,
                    segment.start + segment.duration,
                );
                let mut tokens_to_decode = vec![];
                let mut prev_timestamp_s = 0f32;
                for &token in segment.dr.tokens.iter() {
                    if token == self.sot_token || token == self.eot_token {
                        continue;
                    }
                    // The no_timestamp_token is the last before the timestamp ones.
                    if token > self.no_timestamps_token {
                        let timestamp_s = (token - self.no_timestamps_token + 1) as f32 / 50.;
                        if !tokens_to_decode.is_empty() {
                            let text = self
                                .tokenizer
                                .decode(&tokens_to_decode, true)
                                .map_err(E::msg)?;
                            println!("  {:.1}s-{:.1}s: {}", prev_timestamp_s, timestamp_s, text);
                            tokens_to_decode.clear()
                        }
                        prev_timestamp_s = timestamp_s;
                    } else {
                        tokens_to_decode.push(token)
                    }
                }
                if !tokens_to_decode.is_empty() {
                    let text = self
                        .tokenizer
                        .decode(&tokens_to_decode, true)
                        .map_err(E::msg)?;
                    if !text.is_empty() {
                        println!("  {:.1}s-...: {}", prev_timestamp_s, text);
                    }
                    tokens_to_decode.clear()
                }
            } else {
                println!(
                    "{:.1}s -- {:.1}s: {}",
                    segment.start,
                    segment.start + segment.duration,
                    segment.dr.text,
                )
            }
            if self.verbose {
                println!("{seek}: {segment:?}, in {:?}", start.elapsed());
            }
            segments.push(segment)
        }
        Ok(segments)
    }
}

pub fn token_id(tokenizer: &Tokenizer, token: &str) -> candle::Result<u32> {
    match tokenizer.token_to_id(token) {
        None => candle::bail!("no token-id for {token}"),
        Some(id) => Ok(id),
    }

}

pub fn transcribe_audio(audio_path: &str, model_size: &str, app: &tauri::AppHandle, enable_diarization: bool) -> anyhow::Result<String> {
    use hf_hub::api::sync::Api;
    use tauri::Emitter;

    let device = candle::Device::Cpu;
    let api = Api::new()?;
    
    let repo_id = match model_size {
        "tiny" => "openai/whisper-tiny",
        "base" => "openai/whisper-base",
        "small" => "openai/whisper-small",
        "medium" => "openai/whisper-medium",
        "large" => "openai/whisper-large-v3",
        _ => "openai/whisper-small",
    };
    
    let repo = api.model(repo_id.to_string());
    
    let config_filename = repo.get("config.json")?;
    let tokenizer_filename = repo.get("tokenizer.json")?;
    let weights_filename = repo.get("model.safetensors")?;
    
    let config = std::fs::read_to_string(config_filename)?;
    let config: Config = serde_json::from_str(&config)?;
    let tokenizer = Tokenizer::from_file(tokenizer_filename).map_err(E::msg)?;
    
    let mel_bytes = match config.num_mel_bins {
        80 => include_bytes!("melfilters.bytes").as_slice(),
        128 => include_bytes!("melfilters128.bytes").as_slice(),
        nmel => anyhow::bail!("unexpected num_mel_bins {nmel}"),
    };
    let mut mel_filters = vec![0f32; mel_bytes.len() / 4];
    <byteorder::LittleEndian as byteorder::ByteOrder>::read_f32_into(mel_bytes, &mut mel_filters);
    
    let (pcm_data, sample_rate) = pcm_decode(audio_path)?;
    if sample_rate != m::SAMPLE_RATE as u32 {
        anyhow::bail!("input file must have a {} sampling rate", m::SAMPLE_RATE)
    }
    
    let diar_res = if enable_diarization {
        app.emit("transcription-log", "[Акустическая диаризация] Анализ звуковой волны (высота тона F0, форманты и тембр)...").ok();
        let res = crate::diarization::acoustic_diarize(&pcm_data, sample_rate);
        let mut spk_info = Vec::new();
        for &(id, pitch) in &res.speaker_pitches {
            spk_info.push(format!("Спикер {}: ~{:.0} Гц", id, pitch));
        }
        app.emit("transcription-log", format!(
            "[Акустическая диаризация] Обнаружено физических голосов: {} ({})",
            res.num_speakers,
            spk_info.join(", ")
        )).ok();
        Some(res)
    } else {
        None
    };

    let mel = audio::pcm_to_mel(&config, &pcm_data, &mel_filters);
    let mel_len = mel.len();
    let mel = Tensor::from_vec(
        mel,
        (1, config.num_mel_bins, mel_len / config.num_mel_bins),
        &device,
    )?;
    
    let vb = unsafe { VarBuilder::from_mmaped_safetensors(&[weights_filename], m::DTYPE, &device)? };
    let mut model = Model::Normal(m::model::Whisper::load(&vb, config)?);
    
    let language_token = Some(token_id(&tokenizer, "<|ru|>")?);
    
    let mut dc = Decoder::new(
        model,
        tokenizer,
        299792458,
        &device,
        language_token,
        Some(Task::Transcribe),
        false, // timestamps
        None,
        false, // verbose
    )?;
    
    let segments = dc.run(&mel, app)?;
    let mut result_text = String::new();
    let mut last_speaker: Option<usize> = None;

    for s in segments {
        if !crate::cloud_api::is_hallucination(&s.dr.text) {
            let text = s.dr.text.trim();
            if !text.is_empty() {
                if let Some(ref diar) = diar_res {
                    let spk = diar.get_speaker_at(s.start);
                    if Some(spk) != last_speaker {
                        if !result_text.is_empty() {
                            result_text.push_str("\n\n");
                        }
                        result_text.push_str(&format!("[Спикер {}]: {}", spk, text));
                        last_speaker = Some(spk);
                    } else {
                        if !result_text.is_empty() {
                            result_text.push(' ');
                        }
                        result_text.push_str(text);
                    }
                } else {
                    if !result_text.is_empty() {
                        result_text.push(' ');
                    }
                    result_text.push_str(text);
                }
            }
        }
    }
    
    let final_text = result_text.trim().to_string();

    if enable_diarization && !final_text.is_empty() {
        let _ = app.emit("transcription-diarized", final_text.clone());
        app.emit("transcription-log", "[Диаризация] Акустическая разметка спикеров успешно применена!").ok();
    }

    // Emit 100% progress at the very end just in case
    let _ = app.emit("transcription-progress", 100.0);
    
    Ok(final_text)
}
