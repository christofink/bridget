'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SpeakerProfile, SpeakerProfileJSON } from '@/lib/speaker/types';
import { serializeProfile, deserializeProfile } from '@/lib/speaker/types';

const STORAGE_KEY = 'bridget_speaker_profile';
const RECORD_DURATION_MS = 7000;
const SAMPLE_RATE = 16000;

export type EnrollmentState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error';

export interface UseVoiceEnrollmentReturn {
  state: EnrollmentState;
  progress: number;
  profile: SpeakerProfile | null;
  error: string | null;
  startRecording: () => void;
  cancelRecording: () => void;
  clearProfile: () => void;
}

export function useVoiceEnrollment(): UseVoiceEnrollmentReturn {
  const [state, setState] = useState<EnrollmentState>('idle');
  const [progress, setProgress] = useState(0);
  const [profile, setProfile] = useState<SpeakerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const cancelledRef = useRef(false);

  // Load existing profile from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const json: SpeakerProfileJSON = JSON.parse(stored);
        setProfile(deserializeProfile(json));
        setState('complete');
      }
    } catch {
      // Corrupt data — ignore
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState('recording');
      setError(null);
      setProgress(0);
      cancelledRef.current = false;
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      await audioContext.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        chunksRef.current.push(new Float32Array(e.data));
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      startTimeRef.current = Date.now();

      // Progress timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const p = Math.min(1, elapsed / RECORD_DURATION_MS);
        setProgress(p);

        if (p >= 1) {
          // Recording complete — process
          finishRecording();
        }
      }, 100);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      cleanup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup]);

  const finishRecording = useCallback(async () => {
    // Grab recorded chunks before cleanup wipes them
    const chunks = chunksRef.current;
    chunksRef.current = [];
    cleanup();
    setState('processing');

    try {
      // Combine all audio chunks
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const combined = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      // Resample to 16kHz if needed (browser typically captures at 44.1/48kHz)
      // We pass the raw audio to the embedding extractor which handles resampling
      const { extractEmbedding } = await import('@/lib/speaker/embedding-extractor');
      const embedding = await extractEmbedding(combined);

      const newProfile: SpeakerProfile = {
        id: crypto.randomUUID(),
        name: 'My Voice',
        embedding,
        createdAt: Date.now(),
      };

      // Persist to localStorage
      const json = serializeProfile(newProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json));

      setProfile(newProfile);
      setState('complete');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to create voice profile');
    }
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    cleanup();
    setState(profile ? 'complete' : 'idle');
    setProgress(0);
  }, [cleanup, profile]);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    setState('idle');
    setProgress(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    progress,
    profile,
    error,
    startRecording,
    cancelRecording,
    clearProfile,
  };
}
