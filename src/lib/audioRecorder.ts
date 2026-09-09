/**
 * AudioRecorder: captures microphone input and encodes to standard 16kHz 16-bit Mono WAV.
 * 16kHz mono PCM is the native input format for OpenAI Whisper (both Candle and Groq API).
 */

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export async function getAudioInputDevices(): Promise<AudioInputDevice[]> {
  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    let audioDevices = devices.filter((d) => d.kind === 'audioinput');

    // If device labels are empty (happens before first getUserMedia request),
    // trigger a short audio stream to unlock device labels in Chromium/WebView2
    if (audioDevices.some((d) => !d.label)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        devices = await navigator.mediaDevices.enumerateDevices();
        audioDevices = devices.filter((d) => d.kind === 'audioinput');
      } catch (e) {
        console.warn('Microphone permission check warning:', e);
      }
    }

    return audioDevices.map((d, idx) => ({
      deviceId: d.deviceId,
      label: d.label || `Микрофон ${idx + 1}`,
    }));
  } catch (err) {
    console.error('Failed to enumerate audio devices', err);
    return [];
  }
}

class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dummyDest: MediaStreamAudioDestinationNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaRecorderChunks: Blob[] = [];
  private pcmChunks: Float32Array[] = [];
  private isRecording: boolean = false;
  private startTime: number = 0;

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async start(deviceId?: string): Promise<void> {
    if (this.isRecording) return;

    this.pcmChunks = [];
    this.mediaRecorderChunks = [];

    const audioConstraints: MediaTrackConstraints = {
      channelCount: { ideal: 1 },
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
    };

    if (deviceId && deviceId.trim() !== '' && deviceId !== 'default') {
      audioConstraints.deviceId = { ideal: deviceId };
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
    } catch (err) {
      console.warn('Falling back to default audio stream:', err);
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    // Create AudioContext
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();

    // CRITICAL: Ensure AudioContext is actively running (WebView2 may start suspended)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // 1. Setup AnalyserNode for live Equalizer and Audio Tape visualizer
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;
    this.sourceNode.connect(this.analyser);

    // 2. Setup ScriptProcessorNode with MediaStreamDestination sink
    // MediaStreamDestination ensures Chromium actively pulls audio through the graph
    // without playing microphone output through speakers (no feedback howl!)
    this.dummyDest = this.audioContext.createMediaStreamDestination();
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      this.pcmChunks.push(new Float32Array(inputData));
    };

    this.sourceNode.connect(this.processor);
    this.processor.connect(this.dummyDest);

    // 3. Setup MediaRecorder as redundant hardware capture
    try {
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      this.mediaRecorder = mime ? new MediaRecorder(this.mediaStream, { mimeType: mime }) : new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.mediaRecorderChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
    } catch (e) {
      console.warn('MediaRecorder fallback init error:', e);
    }

    this.isRecording = true;
    this.startTime = Date.now();
  }

  async stop(): Promise<{ data: Uint8Array; durationSeconds: number; maxPeak: number }> {
    if (!this.isRecording) {
      throw new Error('Запись звука не была запущена');
    }

    this.isRecording = false;
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    // Stop MediaRecorder if running
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    // Disconnect and release audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }

    if (this.dummyDest) {
      this.dummyDest.disconnect();
      this.dummyDest = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    const inputSampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;

    let fullBuffer: Float32Array;

    // Use PCM chunks captured from ScriptProcessor
    if (this.pcmChunks.length > 0) {
      let totalLength = 0;
      for (const chunk of this.pcmChunks) {
        totalLength += chunk.length;
      }
      fullBuffer = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.pcmChunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      this.pcmChunks = [];
    } else if (this.mediaRecorderChunks.length > 0 && this.audioContext) {
      // Fallback: decode MediaRecorder webm chunks
      try {
        const blob = new Blob(this.mediaRecorderChunks, { type: 'audio/webm' });
        const ab = await blob.arrayBuffer();
        const decoded = await this.audioContext.decodeAudioData(ab);
        fullBuffer = decoded.getChannelData(0);
      } catch {
        fullBuffer = new Float32Array(0);
      }
      this.mediaRecorderChunks = [];
    } else {
      fullBuffer = new Float32Array(0);
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // Resample down to 16000 Hz
    const targetSampleRate = 16000;
    const resampled = this.downsample(fullBuffer, inputSampleRate, targetSampleRate);

    // Calculate maximum peak amplitude
    let maxPeak = 0;
    for (let i = 0; i < resampled.length; i++) {
      const abs = Math.abs(resampled[i]);
      if (abs > maxPeak) maxPeak = abs;
    }

    // PEAK NORMALIZATION:
    // If audio contains signal (maxPeak > 0.0008), amplify to ~0.92 peak amplitude.
    // This amplifies quiet microphones so Whisper hears speech clearly without silence hallucinations!
    if (maxPeak > 0.0008) {
      const gain = Math.min(25.0, 0.92 / maxPeak);
      for (let i = 0; i < resampled.length; i++) {
        resampled[i] = Math.max(-1, Math.min(1, resampled[i] * gain));
      }
    }

    // Encode to standard 16-bit PCM WAV
    const wavBytes = this.encodeWav(resampled, targetSampleRate);

    return { data: wavBytes, durationSeconds, maxPeak };
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  private downsample(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate) return buffer;
    if (buffer.length === 0) return new Float32Array(0);

    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIdx = Math.min(Math.round(i * ratio), buffer.length - 1);
      result[i] = buffer[srcIdx];
    }
    return result;
  }

  private encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF identifier
    writeString(0, 'RIFF');
    // file length minus RIFF identifier & length (36 + data size)
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(8, 'WAVE');
    // format chunk identifier
    writeString(12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count (1 = mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * channels * bitsPerSample / 8)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channels * bitsPerSample / 8)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    // write 16-bit integer PCM samples
    let byteOffset = 44;
    for (let i = 0; i < samples.length; i++, byteOffset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(byteOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Uint8Array(buffer);
  }
}

export const audioRecorder = new AudioRecorder();
