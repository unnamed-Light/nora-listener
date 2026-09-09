use std::f32::consts::PI;

#[derive(Debug, Clone)]
pub struct AcousticSegment {
    pub start: f64,
    pub end: f64,
    pub speaker_id: usize,
    pub pitch: f32,
    pub centroid: f32,
}

#[derive(Debug, Clone)]
pub struct DiarizationResult {
    pub segments: Vec<AcousticSegment>,
    pub num_speakers: usize,
    pub speaker_pitches: Vec<(usize, f32)>,
}

impl DiarizationResult {
    pub fn get_speaker_at(&self, time_sec: f64) -> usize {
        if self.segments.is_empty() {
            return 1;
        }

        // Direct containment in a speech segment
        for seg in &self.segments {
            if time_sec >= (seg.start - 0.15) && time_sec <= (seg.end + 0.15) {
                return seg.speaker_id;
            }
        }

        // Closest segment
        let mut min_dist = f64::MAX;
        let mut closest_speaker = 1;
        for seg in &self.segments {
            let dist = if time_sec < seg.start {
                seg.start - time_sec
            } else {
                time_sec - seg.end
            };
            if dist < min_dist {
                min_dist = dist;
                closest_speaker = seg.speaker_id;
            }
        }
        closest_speaker
    }
}

// Simple in-place Radix-2 Cooley-Tukey FFT for 512 points
fn fft_512(real: &mut [f32; 512], imag: &mut [f32; 512]) {
    let n = 512;
    // Bit reversal permutation
    let mut j = 0;
    for i in 0..n {
        if i < j {
            real.swap(i, j);
            imag.swap(i, j);
        }
        let mut m = n >> 1;
        while m >= 1 && j >= m {
            j -= m;
            m >>= 1;
        }
        j += m;
    }

    // Cooley-Tukey butterflies
    let mut len = 2;
    while len <= n {
        let half = len / 2;
        let angle = -2.0 * PI / (len as f32);
        let w_step_re = angle.cos();
        let w_step_im = angle.sin();

        let mut i = 0;
        while i < n {
            let mut w_re = 1.0f32;
            let mut w_im = 0.0f32;
            for k in 0..half {
                let u_re = real[i + k];
                let u_im = imag[i + k];
                let v_re = real[i + k + half] * w_re - imag[i + k + half] * w_im;
                let v_im = real[i + k + half] * w_im + imag[i + k + half] * w_re;

                real[i + k] = u_re + v_re;
                imag[i + k] = u_im + v_im;
                real[i + k + half] = u_re - v_re;
                imag[i + k + half] = u_im - v_im;

                let next_w_re = w_re * w_step_re - w_im * w_step_im;
                let next_w_im = w_re * w_step_im + w_im * w_step_re;
                w_re = next_w_re;
                w_im = next_w_im;
            }
            i += len;
        }
        len <<= 1;
    }
}

// Compute spectral centroid of a 512-sample frame
fn compute_frame_centroid(frame: &[f32], sample_rate: u32) -> f32 {
    let mut real = [0.0f32; 512];
    let mut imag = [0.0f32; 512];

    for i in 0..512 {
        if i < frame.len() {
            // Hann window
            let w = 0.5 * (1.0 - (2.0 * PI * i as f32 / 511.0).cos());
            real[i] = frame[i] * w;
        }
    }

    fft_512(&mut real, &mut imag);

    let bin_hz = sample_rate as f32 / 512.0;
    let mut weighted_sum = 0.0f32;
    let mut total_power = 0.0f32;

    for k in 1..256 {
        let p = real[k] * real[k] + imag[k] * imag[k];
        let freq = k as f32 * bin_hz;
        weighted_sum += freq * p;
        total_power += p;
    }

    if total_power > 1e-6 {
        weighted_sum / total_power
    } else {
        1000.0
    }
}

// Normalized Autocorrelation for Pitch (F0) detection
fn detect_frame_pitch(frame: &[f32], sample_rate: u32) -> Option<f32> {
    if frame.len() < 400 {
        return None;
    }

    // Human vocal range: 75 Hz to 360 Hz
    let min_lag = (sample_rate as f32 / 360.0).round() as usize;
    let max_lag = (sample_rate as f32 / 75.0).round() as usize;
    let n = frame.len();

    let mut max_corr = 0.0f32;
    let mut best_lag = 0;

    for lag in min_lag..=max_lag.min(n / 2) {
        let mut num = 0.0f32;
        let mut den1 = 0.0f32;
        let mut den2 = 0.0f32;

        let window_len = n - max_lag;
        for i in 0..window_len {
            let a = frame[i];
            let b = frame[i + lag];
            num += a * b;
            den1 += a * a;
            den2 += b * b;
        }

        let den = (den1 * den2).sqrt();
        if den > 1e-6 {
            let corr = num / den;
            if corr > max_corr {
                max_corr = corr;
                best_lag = lag;
            }
        }
    }

    // Correlation > 0.42 indicates voiced speech (vowels/periodic harmonics)
    if max_corr > 0.42 && best_lag > 0 {
        Some(sample_rate as f32 / best_lag as f32)
    } else {
        None
    }
}

#[derive(Debug)]
struct RawSegment {
    start: f64,
    end: f64,
    pitch: f32,
    centroid: f32,
}

#[derive(Debug)]
struct SpeakerCluster {
    id: usize,
    mean_pitch: f32,
    mean_centroid: f32,
    total_pitch: f32,
    voiced_count: usize,
    total_centroid: f32,
    total_segments: usize,
}

pub fn acoustic_diarize(pcm: &[f32], sample_rate: u32) -> DiarizationResult {
    if pcm.is_empty() || sample_rate == 0 {
        return DiarizationResult {
            segments: Vec::new(),
            num_speakers: 1,
            speaker_pitches: vec![(1, 150.0)],
        };
    }

    // Step 1: VAD with RMS Energy
    let frame_len = (sample_rate as f32 * 0.030) as usize; // 30 ms
    let hop_len = (sample_rate as f32 * 0.015) as usize;   // 15 ms

    if pcm.len() < frame_len {
        return DiarizationResult {
            segments: Vec::new(),
            num_speakers: 1,
            speaker_pitches: vec![(1, 150.0)],
        };
    }

    let mut energies = Vec::new();
    let mut i = 0;
    let mut total_rms = 0.0f32;

    while i + frame_len <= pcm.len() {
        let frame = &pcm[i..i + frame_len];
        let mut sum_sq = 0.0f32;
        for &s in frame {
            sum_sq += s * s;
        }
        let rms = (sum_sq / frame_len as f32).sqrt();
        energies.push(rms);
        total_rms += rms;
        i += hop_len;
    }

    let avg_rms = total_rms / energies.len().max(1) as f32;
    // Adaptive silence threshold: speech typically peaks far above noise floor
    let speech_thresh = (avg_rms * 0.40).clamp(0.012, 0.06);

    // Group active speech frames separated by silence < 0.40s
    let silence_frames_max = (0.40 / 0.015) as usize; // ~26 frames
    let mut speech_intervals = Vec::new();

    let mut in_speech = false;
    let mut speech_start_frame = 0;
    let mut silence_counter = 0;
    let mut speech_end_frame = 0;

    for (idx, &rms) in energies.iter().enumerate() {
        if rms > speech_thresh {
            if !in_speech {
                in_speech = true;
                speech_start_frame = idx;
            }
            silence_counter = 0;
            speech_end_frame = idx;
        } else if in_speech {
            silence_counter += 1;
            if silence_counter > silence_frames_max {
                // End segment
                speech_intervals.push((speech_start_frame, speech_end_frame));
                in_speech = false;
                silence_counter = 0;
            }
        }
    }

    if in_speech {
        speech_intervals.push((speech_start_frame, speech_end_frame));
    }

    // Step 2: Feature extraction per speech segment
    let mut raw_segments = Vec::new();

    for (start_f, end_f) in speech_intervals {
        let start_sec = start_f as f64 * 0.015;
        let end_sec = (end_f + 1) as f64 * 0.015;
        let duration = end_sec - start_sec;

        // Ignore micro noise clicks (< 0.22 sec)
        if duration < 0.22 {
            continue;
        }

        let start_sample = (start_sec * sample_rate as f64) as usize;
        let end_sample = ((end_sec * sample_rate as f64) as usize).min(pcm.len());
        if end_sample <= start_sample + 512 {
            continue;
        }

        let seg_samples = &pcm[start_sample..end_sample];

        // Analyze pitch and centroid across sub-frames in this segment
        let sub_window = (sample_rate as f32 * 0.040) as usize; // 40ms
        let sub_hop = (sample_rate as f32 * 0.020) as usize;    // 20ms

        let mut pitch_samples = Vec::new();
        let mut centroid_samples = Vec::new();

        let mut pos = 0;
        while pos + 512 <= seg_samples.len() {
            let win = &seg_samples[pos..pos + 512];
            let c = compute_frame_centroid(win, sample_rate);
            centroid_samples.push(c);

            if pos + sub_window <= seg_samples.len() {
                let pitch_win = &seg_samples[pos..pos + sub_window];
                if let Some(p) = detect_frame_pitch(pitch_win, sample_rate) {
                    pitch_samples.push(p);
                }
            }

            pos += sub_hop;
        }

        let avg_pitch = if !pitch_samples.is_empty() {
            pitch_samples.sort_by(|a, b| a.partial_cmp(b).unwrap());
            // Median pitch is resistant to octave errors
            pitch_samples[pitch_samples.len() / 2]
        } else {
            0.0
        };

        let avg_centroid = if !centroid_samples.is_empty() {
            centroid_samples.iter().sum::<f32>() / centroid_samples.len() as f32
        } else {
            1200.0
        };

        raw_segments.push(RawSegment {
            start: start_sec,
            end: end_sec,
            pitch: avg_pitch,
            centroid: avg_centroid,
        });
    }

    if raw_segments.is_empty() {
        return DiarizationResult {
            segments: Vec::new(),
            num_speakers: 1,
            speaker_pitches: vec![(1, 150.0)],
        };
    }

    // Step 3: Acoustic Speaker Clustering
    let mut clusters: Vec<SpeakerCluster> = Vec::new();
    let mut result_segments = Vec::new();

    for seg in raw_segments {
        if clusters.is_empty() {
            let has_pitch = seg.pitch > 0.0;
            clusters.push(SpeakerCluster {
                id: 1,
                mean_pitch: if has_pitch { seg.pitch } else { 150.0 },
                mean_centroid: seg.centroid,
                total_pitch: if has_pitch { seg.pitch } else { 0.0 },
                voiced_count: if has_pitch { 1 } else { 0 },
                total_centroid: seg.centroid,
                total_segments: 1,
            });
            result_segments.push(AcousticSegment {
                start: seg.start,
                end: seg.end,
                speaker_id: 1,
                pitch: seg.pitch,
                centroid: seg.centroid,
            });
            continue;
        }

        // Find distance to each existing speaker cluster
        let mut best_cluster_idx = None;
        let mut min_distance = f32::MAX;

        for (idx, cl) in clusters.iter().enumerate() {
            let pitch_diff = if seg.pitch > 0.0 && cl.mean_pitch > 0.0 {
                (seg.pitch - cl.mean_pitch).abs()
            } else {
                0.0
            };

            let centroid_diff = (seg.centroid - cl.mean_centroid).abs();

            // Distinct speaker detection metric:
            // Pitch difference > 30 Hz is a very strong clue for human hearing
            // Centroid difference > 500 Hz indicates different timbre/vocal tract
            let dist = if seg.pitch > 0.0 && cl.mean_pitch > 0.0 {
                (pitch_diff / 28.0) + (centroid_diff / 650.0) * 0.6
            } else {
                centroid_diff / 500.0
            };

            if dist < min_distance {
                min_distance = dist;
                best_cluster_idx = Some(idx);
            }
        }

        // Threshold for creating a new speaker cluster:
        // A pitch difference > 32 Hz with dist > 1.25 signals a new voice
        let is_distinct_speaker = min_distance > 1.25;

        let assigned_id = if is_distinct_speaker && clusters.len() < 8 {
            let new_id = clusters.len() + 1;
            let has_pitch = seg.pitch > 0.0;
            clusters.push(SpeakerCluster {
                id: new_id,
                mean_pitch: if has_pitch { seg.pitch } else { 180.0 },
                mean_centroid: seg.centroid,
                total_pitch: if has_pitch { seg.pitch } else { 0.0 },
                voiced_count: if has_pitch { 1 } else { 0 },
                total_centroid: seg.centroid,
                total_segments: 1,
            });
            new_id
        } else if let Some(idx) = best_cluster_idx {
            let cl = &mut clusters[idx];
            cl.total_segments += 1;
            cl.total_centroid += seg.centroid;
            cl.mean_centroid = cl.total_centroid / cl.total_segments as f32;

            if seg.pitch > 0.0 {
                cl.total_pitch += seg.pitch;
                cl.voiced_count += 1;
                cl.mean_pitch = cl.total_pitch / cl.voiced_count as f32;
            }
            cl.id
        } else {
            1
        };

        result_segments.push(AcousticSegment {
            start: seg.start,
            end: seg.end,
            speaker_id: assigned_id,
            pitch: seg.pitch,
            centroid: seg.centroid,
        });
    }

    let mut speaker_pitches = Vec::new();
    for cl in &clusters {
        speaker_pitches.push((cl.id, cl.mean_pitch));
    }

    DiarizationResult {
        num_speakers: clusters.len().max(1),
        segments: result_segments,
        speaker_pitches,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pitch_detection_sine() {
        let sample_rate = 16000;
        let freq = 200.0f32; // 200 Hz tone
        let mut samples = Vec::new();
        for i in 0..800 {
            let t = i as f32 / sample_rate as f32;
            samples.push((2.0 * PI * freq * t).sin());
        }

        let detected = detect_frame_pitch(&samples, sample_rate);
        assert!(detected.is_some(), "Should detect pitch for 200Hz sine");
        let pitch = detected.unwrap();
        assert!((pitch - 200.0).abs() < 10.0, "Detected pitch {} should be near 200", pitch);
    }

    #[test]
    fn test_diarize_two_different_voices() {
        let sample_rate = 16000;
        let mut pcm = Vec::new();

        // Speaker 1: 120 Hz (Male bass) for 1.5 seconds
        for i in 0..(sample_rate as usize * 3 / 2) {
            let t = i as f32 / sample_rate as f32;
            pcm.push(0.3 * (2.0 * PI * 120.0 * t).sin());
        }

        // Silence for 0.6 seconds
        for _ in 0..(sample_rate as usize * 6 / 10) {
            pcm.push(0.0);
        }

        // Speaker 2: 240 Hz (Higher voice) for 1.5 seconds
        for i in 0..(sample_rate as usize * 3 / 2) {
            let t = i as f32 / sample_rate as f32;
            pcm.push(0.3 * (2.0 * PI * 240.0 * t).sin());
        }

        let result = acoustic_diarize(&pcm, sample_rate);
        assert_eq!(result.num_speakers, 2, "Must detect exactly 2 speakers for 120Hz and 240Hz voices");
        assert_eq!(result.get_speaker_at(0.5), 1, "0.5s should be Speaker 1");
        assert_eq!(result.get_speaker_at(2.5), 2, "2.5s should be Speaker 2");
    }
}
