'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioCaptureState } from '@/hooks/useAudioCapture';
import type { TranscriptSegment } from '@/lib/stt/types';

const MAX_SEGMENTS = 200;

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string; readonly confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventMap {
  result: { readonly resultIndex: number; readonly results: SpeechRecognitionResultList };
  error: { readonly error: string };
  start: Event;
  end: Event;
}

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventMap['result']) => void) | null;
  onerror: ((event: SpeechRecognitionEventMap['error']) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getSpeechRecognitionClass(): (new () => ISpeechRecognition) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => ISpeechRecognition)
    | undefined;
}

export interface UseTranscriptionOptions {
  lang?: string;
  onError?: (error: Error) => void;
  onStateChange?: (state: AudioCaptureState) => void;
}

export function useTranscription(options?: UseTranscriptionOptions) {
  const [state, setState] = useState<AudioCaptureState>('idle');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const intentRef = useRef<'idle' | 'listening' | 'paused'>('idle');
  const idCounterRef = useRef(0);
  const segmentsRef = useRef<TranscriptSegment[]>([]);

  const setStateAndNotify = useCallback((newState: AudioCaptureState) => {
    setState(newState);
    optionsRef.current?.onStateChange?.(newState);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionClass();
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      setStateAndNotify('error');
      optionsRef.current?.onError?.(
        new Error('Speech recognition is not supported in this browser'),
      );
      return;
    }

    if (recognitionRef.current) return;

    setError(null);
    setStateAndNotify('requesting-permission');

    const recognition = new SpeechRecognition();
    recognition.lang = optionsRef.current?.lang ?? 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    intentRef.current = 'listening';

    recognition.onstart = () => {
      setStateAndNotify('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEventMap['result']) => {
      if (intentRef.current === 'idle') return; // Ignore late events after stop()
      const finals = segmentsRef.current.filter((s) => s.isFinal);
      const newSegments: TranscriptSegment[] = [...finals];

      const interimParts: string[] = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          idCounterRef.current += 1;
          newSegments.push({
            id: idCounterRef.current,
            text: transcript,
            isFinal: true,
            timestamp: Date.now(),
          });
        } else {
          interimParts.push(transcript);
        }
      }

      if (interimParts.length > 0) {
        newSegments.push({
          id: -1,
          text: interimParts.join(' '),
          isFinal: false,
          timestamp: Date.now(),
        });
      }

      // Cap final segments to prevent unbounded growth
      const finalCount = newSegments.filter((s) => s.isFinal).length;
      if (finalCount > MAX_SEGMENTS) {
        const interim = newSegments.filter((s) => !s.isFinal);
        const trimmedFinals = newSegments
          .filter((s) => s.isFinal)
          .slice(-MAX_SEGMENTS);
        segmentsRef.current = [...trimmedFinals, ...interim];
      } else {
        segmentsRef.current = newSegments;
      }
      setSegments(segmentsRef.current);
    };

    recognition.onerror = (event: SpeechRecognitionEventMap['error']) => {
      switch (event.error) {
        case 'no-speech':
        case 'aborted':
          // Normal during silence or manual stop — onend handles restart
          break;
        case 'not-allowed': {
          const msg = 'Microphone permission denied';
          setError(msg);
          setStateAndNotify('error');
          intentRef.current = 'idle';
          recognitionRef.current = null;
          optionsRef.current?.onError?.(new Error(msg));
          break;
        }
        case 'network': {
          const msg = 'Speech recognition requires an internet connection';
          setError(msg);
          setStateAndNotify('error');
          intentRef.current = 'idle';
          recognitionRef.current = null;
          optionsRef.current?.onError?.(new Error(msg));
          break;
        }
        default: {
          const msg = `Speech recognition error: ${event.error}`;
          setError(msg);
          setStateAndNotify('error');
          intentRef.current = 'idle';
          recognitionRef.current = null;
          optionsRef.current?.onError?.(new Error(msg));
        }
      }
    };

    recognition.onend = () => {
      if (intentRef.current === 'listening') {
        // Clear stale interim segments before auto-restart
        segmentsRef.current = segmentsRef.current.filter((s) => s.isFinal);
        setSegments(segmentsRef.current);
        // Auto-restart after silence timeout
        try {
          recognition.start();
        } catch {
          // If restart fails, clean up
          recognitionRef.current = null;
          setStateAndNotify('error');
          intentRef.current = 'idle';
        }
      } else {
        recognitionRef.current = null;
      }
    };

    try {
      recognition.start();
    } catch {
      setError('Failed to start speech recognition');
      setStateAndNotify('error');
      intentRef.current = 'idle';
      recognitionRef.current = null;
    }
  }, [setStateAndNotify]);

  const stop = useCallback(() => {
    intentRef.current = 'idle';
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    segmentsRef.current = [];
    idCounterRef.current = 0;
    setSegments([]);
    setError(null);
    setStateAndNotify('idle');
  }, [setStateAndNotify]);

  const pause = useCallback(() => {
    intentRef.current = 'paused';
    recognitionRef.current?.stop();
    setStateAndNotify('paused');
  }, [setStateAndNotify]);

  const resume = useCallback(() => {
    if (!getSpeechRecognitionClass() || !recognitionRef.current) {
      // Need to create a fresh instance since stop() was called on pause
      intentRef.current = 'listening';
      // Trigger a fresh start flow but keep segments
      const savedSegments = segmentsRef.current;
      start();
      segmentsRef.current = savedSegments;
      setSegments(savedSegments);
      return;
    }
    intentRef.current = 'listening';
    try {
      recognitionRef.current.start();
      setStateAndNotify('listening');
    } catch {
      // Instance may be dead, create fresh
      recognitionRef.current = null;
      const savedSegments = segmentsRef.current;
      start();
      segmentsRef.current = savedSegments;
      setSegments(savedSegments);
    }
  }, [setStateAndNotify, start]);

  const clearSegments = useCallback(() => {
    segmentsRef.current = [];
    idCounterRef.current = 0;
    setSegments([]);
  }, []);

  useEffect(() => {
    return () => {
      intentRef.current = 'idle';
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  return { state, segments, error, start, stop, pause, resume, clearSegments };
}
