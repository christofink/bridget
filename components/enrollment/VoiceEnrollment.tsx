'use client';

import type { EnrollmentState } from '@/hooks/useVoiceEnrollment';
import styles from './VoiceEnrollment.module.css';

export interface VoiceEnrollmentProps {
  state: EnrollmentState;
  progress: number;
  error: string | null;
  onStart: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function VoiceEnrollment({
  state,
  progress,
  error,
  onStart,
  onCancel,
  onComplete,
  onSkip,
}: VoiceEnrollmentProps) {
  if (state === 'complete') {
    return (
      <div className={styles.step}>
        <div className={styles.icon} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2>Voice profile created</h2>
        <p>Bridget will recognise your voice and can filter out other speakers.</p>
        <button type="button" onClick={onComplete}>Continue</button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className={styles.step}>
        <div className={styles.spinner} aria-hidden="true" />
        <h2>Creating voice profile...</h2>
        <p>Analysing your voice. This may take a moment.</p>
      </div>
    );
  }

  if (state === 'recording') {
    const percent = Math.round(progress * 100);
    return (
      <div className={styles.step}>
        <div className={styles.progressRing} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <svg viewBox="0 0 100 100" className={styles.progressSvg}>
            <circle cx="50" cy="50" r="45" className={styles.progressTrack} />
            <circle
              cx="50"
              cy="50"
              r="45"
              className={styles.progressFill}
              style={{ strokeDashoffset: `${283 * (1 - progress)}` }}
            />
          </svg>
          <span className={styles.progressText}>{percent}%</span>
        </div>
        <h2>Recording your voice...</h2>
        <p>Keep talking naturally. Read something aloud or describe your day.</p>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    );
  }

  // idle or error
  return (
    <div className={styles.step}>
      <div className={styles.icon} aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      <h2>Learn your voice</h2>
      <p>Record a short sample so Bridget can recognise you and filter out other speakers.</p>
      {error && (
        <div role="alert">
          <p>{error}</p>
        </div>
      )}
      <button type="button" onClick={onStart}>Start Recording</button>
      {onSkip && (
        <button type="button" onClick={onSkip} className={styles.skipBtn}>
          Skip for now
        </button>
      )}
    </div>
  );
}
