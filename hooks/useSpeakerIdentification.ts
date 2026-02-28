'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { SpeakerProfile } from '@/lib/speaker/types';
import type { SpeakerLabel } from '@/lib/speaker/types';
import type { TranscriptSegment } from '@/lib/stt/types';
import { AudioRingBuffer } from '@/lib/audio/audio-ring-buffer';
import { cosineSimilarity } from '@/lib/speaker/cosine-similarity';

const RING_BUFFER_SECONDS = 30;
const SAMPLE_RATE = 16000;
const WORDS_PER_MINUTE = 150;
const LOOKBACK_PADDING_MS = 500;
const LOOKAHEAD_PADDING_MS = 200;

export interface UseSpeakerIdentificationOptions {
  profile: SpeakerProfile | null;
  enabled: boolean;
  threshold: number;
}

export interface UseSpeakerIdentificationReturn {
  /** Feed raw audio chunks (Float32Array at 16kHz) into the ring buffer. */
  writeAudio: (chunk: Float32Array) => void;
  /** Label a final transcript segment by comparing its audio against the enrolled profile. */
  labelSegment: (segment: TranscriptSegment) => Promise<{ label: SpeakerLabel; confidence: number }>;
}

export function useSpeakerIdentification(
  options: UseSpeakerIdentificationOptions,
): UseSpeakerIdentificationReturn {
  const ringBufferRef = useRef<AudioRingBuffer | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize ring buffer on first use
  useEffect(() => {
    if (options.enabled && options.profile) {
      if (!ringBufferRef.current) {
        ringBufferRef.current = new AudioRingBuffer(RING_BUFFER_SECONDS, SAMPLE_RATE);
      }
    }
    return () => {
      ringBufferRef.current?.clear();
    };
  }, [options.enabled, options.profile]);

  const writeAudio = useCallback((chunk: Float32Array) => {
    if (!ringBufferRef.current) {
      ringBufferRef.current = new AudioRingBuffer(RING_BUFFER_SECONDS, SAMPLE_RATE);
    }
    ringBufferRef.current.write(chunk, Date.now());
  }, []);

  const labelSegment = useCallback(
    async (segment: TranscriptSegment): Promise<{ label: SpeakerLabel; confidence: number }> => {
      const { profile, enabled, threshold } = optionsRef.current;

      if (!enabled || !profile || !ringBufferRef.current) {
        return { label: 'unknown', confidence: 0 };
      }

      // Estimate speech duration from word count
      const wordCount = segment.text.split(/\s+/).length;
      const estimatedDurationMs = (wordCount / WORDS_PER_MINUTE) * 60 * 1000;
      const minDuration = 1000; // At least 1 second of audio
      const duration = Math.max(estimatedDurationMs, minDuration);

      const endTime = segment.timestamp + LOOKAHEAD_PADDING_MS;
      const startTime = segment.timestamp - duration - LOOKBACK_PADDING_MS;

      const audioWindow = ringBufferRef.current.getWindow(startTime, endTime);

      if (!audioWindow || audioWindow.length < SAMPLE_RATE * 0.5) {
        // Not enough audio (less than 0.5s)
        return { label: 'unknown', confidence: 0 };
      }

      try {
        const { extractEmbedding } = await import('@/lib/speaker/embedding-extractor');
        const segmentEmbedding = await extractEmbedding(audioWindow);

        const similarity = cosineSimilarity(
          profile.embedding.vector,
          segmentEmbedding.vector,
        );

        // The library returns similarity 0-1 where higher = more similar
        const label: SpeakerLabel = similarity >= threshold ? 'user' : 'other';
        return { label, confidence: similarity };
      } catch {
        return { label: 'unknown', confidence: 0 };
      }
    },
    [],
  );

  return { writeAudio, labelSegment };
}
