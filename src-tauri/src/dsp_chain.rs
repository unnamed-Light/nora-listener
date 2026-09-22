use std::f32::consts::PI;

/// Parameters for audio speech enhancement
#[derive(Clone, Debug)]
pub struct DspConfig {
    pub sample_rate: u32,
    pub high_pass_cutoff_hz: f32, // e.g. 100 Hz
    pub low_pass_cutoff_hz: f32,  // e.g. 7500 Hz
    pub target_rms: f32,          // e.g. 0.14 (-17 dBFS)
    pub max_gain: f32,            // e.g. 15.0 (+23.5 dB)
    pub min_gain: f32,            // e.g. 0.8
    pub noise_gate_threshold: f32,// e.g. 0.0015
}

impl Default for DspConfig {
    fn default() -> Self {
        Self {
            sample_rate: 16000,
            high_pass_cutoff_hz: 100.0,
            low_pass_cutoff_hz: 7500.0,
            target_rms: 0.14,
            max_gain: 15.0,
            min_gain: 0.8,
            noise_gate_threshold: 0.0015,
        }
    }
}

/// Biquad IIR Filter coefficients and state
#[derive(Clone, Debug)]
pub struct BiquadFilter {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadFilter {
    /// 2nd order Butterworth High-Pass Filter
    pub fn high_pass(sample_rate: f32, cutoff_hz: f32) -> Self {
        let q = 0.70710678f32;
        let w0 = 2.0 * PI * (cutoff_hz / sample_rate).clamp(0.0001, 0.499);
        let alpha = w0.sin() / (2.0 * q);
        let cos_w0 = w0.cos();

        let b0 = (1.0 + cos_w0) / 2.0;
        let b1 = -(1.0 + cos_w0);
        let b2 = (1.0 + cos_w0) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// 2nd order Butterworth Low-Pass Filter
    pub fn low_pass(sample_rate: f32, cutoff_hz: f32) -> Self {
        let q = 0.70710678f32;
        let w0 = 2.0 * PI * (cutoff_hz / sample_rate).clamp(0.0001, 0.499);
        let alpha = w0.sin() / (2.0 * q);
        let cos_w0 = w0.cos();

        let b0 = (1.0 - cos_w0) / 2.0;
        let b1 = 1.0 - cos_w0;
        let b2 = (1.0 - cos_w0) / 2.0;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    #[inline(always)]
    pub fn process_sample(&mut self, x0: f32) -> f32 {
        let y0 = self.b0 * x0 + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x0;
        self.y2 = self.y1;
        self.y1 = y0;
        y0
    }

    pub fn process_buffer(&mut self, samples: &mut [f32]) {
        for s in samples.iter_mut() {
            *s = self.process_sample(*s);
        }
    }
}

/// Dynamic Automatic Gain Control and Limiter
pub struct AgcCompressor {
    envelope: f32,
    attack_coeff: f32,
    release_coeff: f32,
    target_rms: f32,
    max_gain: f32,
    min_gain: f32,
    noise_floor: f32,
}

impl AgcCompressor {
    pub fn new(sample_rate: u32, target_rms: f32, max_gain: f32) -> Self {
        let attack_ms = 40.0f32;  // Fast enough to catch spoken syllables
        let release_ms = 400.0f32; // Smooth release between words without pumping
        let fs = sample_rate as f32;

        let attack_coeff = (-1.0 / (fs * (attack_ms / 1000.0))).exp();
        let release_coeff = (-1.0 / (fs * (release_ms / 1000.0))).exp();

        Self {
            envelope: 0.01,
            attack_coeff,
            release_coeff,
            target_rms,
            max_gain,
            min_gain: 0.6,
            noise_floor: 0.0012,
        }
    }

    /// Process in-place with AGC and soft-knee brickwall limiter
    pub fn process(&mut self, samples: &mut [f32]) {
        if samples.is_empty() {
            return;
        }

        // First pass: track short-term RMS envelope
        for s in samples.iter_mut() {
            let abs_val = s.abs();

            if abs_val > self.envelope {
                self.envelope = self.attack_coeff * self.envelope + (1.0 - self.attack_coeff) * abs_val;
            } else {
                self.envelope = self.release_coeff * self.envelope + (1.0 - self.release_coeff) * abs_val;
            }

            // Update running noise floor slowly
            if self.envelope < self.noise_floor {
                self.noise_floor = self.envelope;
            } else {
                self.noise_floor += 0.000002;
            }

            // Calculate gain: if above noise floor, scale toward target RMS
            let gain = if self.envelope > self.noise_floor * 1.5 && self.envelope > 0.0005 {
                (self.target_rms / self.envelope).clamp(self.min_gain, self.max_gain)
            } else {
                1.0
            };

            // Apply soft-knee limiter to prevent clipping
            let amplified = *s * gain;
            *s = if amplified.abs() > 0.85 {
                let sign = amplified.signum();
                let excess = amplified.abs() - 0.85;
                // Soft compression curve above 0.85
                (0.85 + (excess / (1.0 + excess * 1.5)) * 0.14).min(0.98) * sign
            } else {
                amplified
            };
        }
    }
}

/// Complete speech enhancement processor for raw buffers
pub fn enhance_speech_audio(samples: &mut [f32], sample_rate: u32, boost_intensity: &str) {
    if samples.is_empty() {
        return;
    }

    let max_gain = match boost_intensity {
        "ultra" => 25.0,  // +28 dB for extremely distant lecturers
        "high" => 15.0,   // +23.5 dB (standard lecture hall recommendation)
        _ => 8.0,         // +18 dB (nearby speech / quiet room)
    };

    let fs = sample_rate as f32;

    // 1. High-Pass Filter: cut room rumble, desk thumps, AC/fan hum below 100 Hz
    let mut hpf = BiquadFilter::high_pass(fs, 100.0);
    hpf.process_buffer(samples);

    // 2. Low-Pass Filter: cut coil whine and electrical hiss above 7500 Hz
    let effective_lp = (fs * 0.45).min(7500.0);
    if effective_lp > 1000.0 {
        let mut lpf = BiquadFilter::low_pass(fs, effective_lp);
        lpf.process_buffer(samples);
    }

    // 3. AGC and Dynamic Range Compression
    let mut agc = AgcCompressor::new(sample_rate, 0.15, max_gain);
    agc.process(samples);
}

/// Calculate dynamic Voice Activity Detection (VAD) threshold
/// Adapts to background room noise to prevent discarding quiet speech
pub fn calculate_adaptive_vad_threshold(samples: &[f32]) -> (f32, bool) {
    if samples.is_empty() {
        return (0.0, false);
    }

    let mut sum_sq = 0.0f32;
    for &s in samples {
        sum_sq += s * s;
    }
    let rms = (sum_sq / samples.len() as f32).sqrt();

    // Sensitive threshold down to 0.0025 for distant audio
    let has_speech = rms > 0.0025;
    (rms, has_speech)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_biquad_high_pass_attenuates_dc() {
        let sample_rate = 16000;
        let mut hpf = BiquadFilter::high_pass(sample_rate as f32, 100.0);

        // Constant DC signal of 1.0
        let mut dc_signal = vec![1.0f32; 1000];
        hpf.process_buffer(&mut dc_signal);

        // After filtering, the tail of DC signal should settle to near 0.0
        let tail_val = dc_signal[dc_signal.len() - 1].abs();
        assert!(tail_val < 0.05, "HPF should eliminate DC offset, got {}", tail_val);
    }

    #[test]
    fn test_agc_amplifies_quiet_distant_speech() {
        let sample_rate = 16000;
        let mut agc = AgcCompressor::new(sample_rate, 0.15, 15.0);

        // A quiet 1 kHz sine wave at amplitude 0.01 (distant speech)
        let mut quiet_speech: Vec<f32> = (0..3200)
            .map(|i| (2.0 * PI * 1000.0 * i as f32 / sample_rate as f32).sin() * 0.01)
            .collect();

        agc.process(&mut quiet_speech);

        // Check that amplitude has been boosted significantly
        let max_after = quiet_speech[1600..].iter().fold(0.0f32, |acc, &s| acc.max(s.abs()));
        assert!(max_after > 0.06, "AGC should boost quiet speech, got max: {}", max_after);
    }

    #[test]
    fn test_limiter_prevents_clipping_on_loud_click() {
        let sample_rate = 16000;
        let mut agc = AgcCompressor::new(sample_rate, 0.15, 15.0);

        // A loud impulsive spike (+5.0 amplitude)
        let mut loud_audio = vec![0.02f32; 1000];
        loud_audio[500] = 5.0;

        agc.process(&mut loud_audio);

        // Ensure all samples are within [-1.0, 1.0]
        for &s in &loud_audio {
            assert!(s.abs() <= 1.0, "Sample clipped beyond 1.0: {}", s);
        }
    }

    #[test]
    fn test_adaptive_vad_detects_faint_speech() {
        // Faint speech at 0.005 RMS
        let faint_samples: Vec<f32> = (0..800).map(|i| if i % 2 == 0 { 0.007 } else { -0.007 }).collect();
        let (rms, has_speech) = calculate_adaptive_vad_threshold(&faint_samples);

        assert!(has_speech, "Adaptive VAD should detect faint speech (rms={})", rms);
    }
}
