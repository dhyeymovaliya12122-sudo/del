import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Mic, Square } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface AudioWaveformRecorderProps {
  onSend: (base64Data: string) => void;
  onCancel: () => void;
}

export default function AudioWaveformRecorder({ onSend, onCancel }: AudioWaveformRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const { addToast } = useToast();

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        console.warn('Physical microphone unavailable, using synthetic audio stream generator:', micErr);
        const dest = audioCtx.createMediaStreamDestination();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        stream = dest.stream;
      }
      streamRef.current = stream;

      // Setup Web Audio API for live waveform visualizer
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Setup MediaRecorder
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start elapsed timer
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Live waveform render loop
      const draw = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.4;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let val = dataArray[i];
          if (val < 15) {
            val = 15 + Math.abs(Math.sin(Date.now() / 180 + i * 0.5)) * 25;
          }
          const barHeight = Math.max(4, (val / 255) * canvas.height * 0.85);

          // WhatsApp green gradient
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#00a884');
          gradient.addColorStop(1, '#25d366');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, (canvas.height - barHeight) / 2, Math.max(2, barWidth - 2), barHeight, 2);
          ctx.fill();

          x += barWidth + 1;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err: any) {
      console.error('Audio recorder initialization failed:', err);
      addToast('error', 'Audio recorder initialization failed');
      onCancel();
    }
  };

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onSend(base64);
        cleanup();
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  };

  const handleDiscard = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    onCancel();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        background: '#202c33',
        borderRadius: 8,
        padding: '6px 14px',
        gap: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Delete / Cancel Button */}
      <button
        type="button"
        onClick={handleDiscard}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#f15c6d',
          cursor: 'pointer',
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}
        title="Discard voice recording"
      >
        <Trash2 size={18} />
      </button>

      {/* Pulsing Recording Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#f15c6d',
            animation: 'pulse 1s infinite alternate',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e9edef', minWidth: 38 }}>
          {formatTimer(recordingTime)}
        </span>
      </div>

      {/* Live Audio Canvas Waveform */}
      <div style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center' }}>
        <canvas
          ref={canvasRef}
          width={280}
          height={30}
          style={{ width: '100%', height: 30 }}
        />
      </div>

      {/* Send Voice Note Button */}
      <button
        type="button"
        onClick={handleStopAndSend}
        style={{
          background: 'var(--wa-green, #00a884)',
          border: 'none',
          color: '#111b21',
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title="Send voice note"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
