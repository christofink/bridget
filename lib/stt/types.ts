import type { SpeakerLabel } from '@/lib/speaker/types';

export interface TranscriptSegment {
  id: number;
  text: string;
  isFinal: boolean;
  timestamp: number;
  speaker?: SpeakerLabel;
  speakerConfidence?: number;
}
