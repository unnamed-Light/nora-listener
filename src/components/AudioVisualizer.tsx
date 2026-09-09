import React, { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';

interface AudioVisualizerProps {
  isRecording: boolean;
  width?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  width = 340,
  height = 56,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestWaveRef = useRef<{ waveform: number[]; peak: number }>({
    waveform: new Array(64).fill(0),
    peak: 0,
  });

  // Bars smoothed heights (28 bands)
  const barHeightsRef = useRef<number[]>(new Array(28).fill(0));
  const peakCapsRef = useRef<number[]>(new Array(28).fill(0));

  useEffect(() => {
    if (!isRecording) {
      latestWaveRef.current = { waveform: new Array(64).fill(0), peak: 0 };
      barHeightsRef.current = new Array(28).fill(0);
      peakCapsRef.current = new Array(28).fill(0);
      return;
    }

    let unlisten: (() => void) | null = null;
    listen<[number[], number]>('native-audio-wave', (event) => {
      if (event.payload && Array.isArray(event.payload[0])) {
        latestWaveRef.current = {
          waveform: event.payload[0],
          peak: Math.max(0, Math.min(1, event.payload[1] || 0)),
        };
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      animationId = requestAnimationFrame(render);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isRecording) {
        // Draw idle center line
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(15, 108, 189, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      const { waveform, peak } = latestWaveRef.current;
      const barCount = 28;
      const gap = Math.max(2, Math.floor(canvas.width / 120));
      const barWidth = Math.max(2, Math.floor((canvas.width - (barCount - 1) * gap) / barCount));

      // Calculate pseudo-spectrum from 64 waveform points + peak
      // Low bands correspond to longer trends, high bands to fast transitions
      const targetBars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        // Sample points around this band
        const sampleIdx = Math.floor((i / barCount) * (waveform.length - 1));
        const sampleVal = Math.abs(waveform[sampleIdx] || 0);
        const nextVal = Math.abs(waveform[Math.min(waveform.length - 1, sampleIdx + 1)] || 0);
        const diff = Math.abs(nextVal - sampleVal);

        // Mix peak, sample amplitude and high-frequency delta
        const rawEnergy = sampleVal * 0.6 + diff * 0.8 + peak * 0.4;
        // Non-linear perceptual scaling
        const scaled = Math.min(1.0, Math.pow(rawEnergy, 0.75) * 1.6);
        targetBars.push(scaled);
      }

      // Smooth bars with decay
      const heights = barHeightsRef.current;
      const caps = peakCapsRef.current;

      for (let i = 0; i < barCount; i++) {
        const target = targetBars[i];
        if (target > heights[i]) {
          heights[i] = heights[i] * 0.3 + target * 0.7; // Fast attack
        } else {
          heights[i] = heights[i] * 0.84 + target * 0.16; // Smooth release
        }

        // Peak caps (dots)
        if (heights[i] > caps[i]) {
          caps[i] = heights[i];
        } else {
          caps[i] = Math.max(0, caps[i] - 0.02); // Slow falloff
        }
      }

      // 1. Draw Equalizer Bars
      for (let i = 0; i < barCount; i++) {
        const val = heights[i];
        const barH = Math.max(3, val * (canvas.height * 0.85));
        const x = i * (barWidth + gap);
        const y = canvas.height - barH;

        // Dynamic vertical gradient: Blue -> Green -> Coral
        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height * 0.15);
        grad.addColorStop(0, 'rgba(15, 108, 189, 0.45)');
        grad.addColorStop(0.55, 'rgba(16, 124, 65, 0.75)');
        grad.addColorStop(0.9, 'rgba(209, 52, 56, 0.95)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();

        // Draw peak cap dot
        if (caps[i] > 0.05) {
          const capY = canvas.height - Math.max(4, caps[i] * (canvas.height * 0.85)) - 2;
          ctx.fillStyle = caps[i] > 0.8 ? '#d13438' : '#107c41';
          ctx.fillRect(x, Math.max(0, capY), barWidth, 1.5);
        }
      }

      // 2. Draw Live Audio Tape Waveform (Oscilloscope Line)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0078d4';
      ctx.shadowColor = 'rgba(0, 120, 212, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();

      const waveLen = waveform.length;
      const sliceWidth = canvas.width / (waveLen - 1);
      const halfH = canvas.height / 2;

      for (let i = 0; i < waveLen; i++) {
        const sample = waveform[i] || 0;
        // Scale sample amplitude to 80% of half height
        const y = halfH - sample * (halfH * 0.85);
        const x = i * sliceWidth;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        height: `${height}px`,
        borderRadius: '6px',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'block',
      }}
    />
  );
};
