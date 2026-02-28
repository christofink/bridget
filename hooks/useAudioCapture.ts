'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { downsample, float32ToInt16 } from '@/lib/audio/downsampler';

export type AudioCaptureState =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'paused'
  | 'error';

export interface UseAudioCaptureOptions {
  onAudioChunk?: (chunk: Int16Array) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: AudioCaptureState) => void;
}

export function useAudioCapture(options?: UseAudioCaptureOptions) {
  const [state, setState] = useState<AudioCaptureState>('idle');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const setStateAndNotify = useCallback((newState: AudioCaptureState) => {
    setState(newState);
    optionsRef.current?.onStateChange?.(newState);
  }, []);

  const stopInternal = useCallback(() => {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (audioContextRef.current) return; // Guard against double-start

    try {
      setStateAndNotify('requesting-permission');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      // Listen for mic disconnect
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.addEventListener('ended', () => {
          setStateAndNotify('error');
          optionsRef.current?.onError?.(new Error('Microphone disconnected'));
        });
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      await audioContext.audioWorklet.addModule('/audio-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      workletNodeRef.current = workletNode;

      source.connect(workletNode);

      workletNode.port.onmessage = (e: MessageEvent) => {
        const floatData = e.data as Float32Array;
        const downsampled = downsample(floatData, audioContext.sampleRate, 16000);
        const int16Data = float32ToInt16(downsampled);
        optionsRef.current?.onAudioChunk?.(int16Data);
      };

      // Request Wake Lock
      if (navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch {
          // Ignore wake lock failures
        }
      }

      // iOS audio interruption handling
      audioContext.onstatechange = () => {
        if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') {
          setStateAndNotify('paused');
        }
      };

      setStateAndNotify('listening');
    } catch (error) {
      setStateAndNotify('error');
      optionsRef.current?.onError?.(error as Error);
    }
  }, [setStateAndNotify]);

  const stop = useCallback(() => {
    stopInternal();
    setStateAndNotify('idle');
  }, [stopInternal, setStateAndNotify]);

  const pause = useCallback(async () => {
    await audioContextRef.current?.suspend();
    setStateAndNotify('paused');
  }, [setStateAndNotify]);

  const resume = useCallback(async () => {
    await audioContextRef.current?.resume();
    setStateAndNotify('listening');
  }, [setStateAndNotify]);

  useEffect(() => {
    return () => {
      stopInternal();
    };
  }, [stopInternal]);

  return { state, start, stop, pause, resume };
}
