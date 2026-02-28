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
                className={`${styles.segment} ${seg.isFinal ? styles.final : styles.interim}`}
                style={{ opacity: Math.max(0, 1 - i * 0.3) }}
              >
                {seg.text}
              </div>
            ))
          : children}
      </div>
    </main>
  );
}
