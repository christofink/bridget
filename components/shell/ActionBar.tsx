'use client';

import type { AudioCaptureState } from '@/hooks/useAudioCapture';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  state: AudioCaptureState;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export default function ActionBar({ state, onStart, onStop, onPause, onResume }: ActionBarProps) {
  return (
    <footer className={styles.bar} aria-label="Audio controls">
      {state === 'requesting-permission' && (
        <button className={styles.startBtn} type="button" disabled style={{ minWidth: 44, minHeight: 44, opacity: 0.6 }}>
          Requesting…
        </button>
      )}

      {state === 'idle' && (
        <button className={styles.startBtn} onClick={onStart} type="button" style={{ minWidth: 44, minHeight: 44 }}>
          Start Listening
        </button>
      )}

      {state === 'listening' && (
        <>
          <button className={styles.actionBtn} onClick={onPause} type="button" style={{ minWidth: 44, minHeight: 44 }}>
            Pause
          </button>
          <button className={styles.actionBtn} onClick={onStop} type="button" style={{ minWidth: 44, minHeight: 44 }}>
            Stop
          </button>
        </>
      )}

      {state === 'paused' && (
        <>
          <button className={styles.actionBtn} onClick={onResume} type="button" style={{ minWidth: 44, minHeight: 44 }}>
            Resume
          </button>
          <button className={styles.actionBtn} onClick={onStop} type="button" style={{ minWidth: 44, minHeight: 44 }}>
            Stop
          </button>
        </>
      )}

      {state === 'error' && (
        <button className={styles.startBtn} onClick={onStart} type="button" style={{ minWidth: 44, minHeight: 44 }}>
          Start Listening
        </button>
      )}
    </footer>
  );
}
