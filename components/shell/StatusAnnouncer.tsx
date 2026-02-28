'use client';

import type { AudioCaptureState } from '@/hooks/useAudioCapture';

export interface StatusAnnouncerProps {
  state: AudioCaptureState;
}

const STATE_LABELS: Record<AudioCaptureState, string> = {
  idle: '',
  'requesting-permission': 'Requesting microphone access',
  listening: 'Listening',
  paused: 'Paused',
  error: 'Error occurred',
};

export default function StatusAnnouncer({ state }: StatusAnnouncerProps) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {STATE_LABELS[state]}
    </div>
  );
}
