import { useRef, useEffect } from 'react';
import type { TranscriptSegment } from '@/lib/stt/types';
import styles from './SubtitleArea.module.css';

export interface SubtitleAreaProps {
  segments?: TranscriptSegment[];
  children?: React.ReactNode;
}

export default function SubtitleArea({ segments = [], children }: SubtitleAreaProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const segmentCount = segments.length;

  useEffect(() => {
    if (!segmentCount) return;
    const log = logRef.current;
    if (log) {
      log.scrollTop = 0;
    }
  }, [segmentCount]);

  const reversed = segments.length > 0 ? [...segments].reverse() : [];

  return (
    <main id="main-content" className={styles.area} aria-label="Subtitles">
      <div
        ref={logRef}
        className={styles.log}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        {reversed.length > 0
          ? reversed.map((seg, i) => (
              <div
                key={seg.isFinal ? seg.id : `interim-${i}`}
                className={`${styles.segment} ${seg.isFinal ? styles.final : styles.interim} ${seg.speaker === 'user' ? styles.userSpeaker : ''}`}
                style={{ opacity: Math.max(0, 1 - i * 0.3) }}
              >
                {seg.speaker === 'user' && (
                  <span className={styles.speakerIcon} role="img" aria-label="You">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </span>
                )}
                <span>{seg.text}</span>
              </div>
            ))
          : children}
      </div>
    </main>
  );
}
