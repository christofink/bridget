'use client';

import type { RefObject } from 'react';
import styles from './ControlsBar.module.css';

export interface ControlsBarProps {
  onSettingsClick?: () => void;
  settingsButtonRef?: RefObject<HTMLButtonElement | null>;
  hasVoiceProfile?: boolean;
  filterMode?: 'all' | 'my-voice';
  onToggleFilter?: () => void;
}

export default function ControlsBar({
  onSettingsClick,
  settingsButtonRef,
  hasVoiceProfile,
  filterMode,
  onToggleFilter,
}: ControlsBarProps) {
  return (
    <nav className={styles.bar} aria-label="App controls">
      <span className={styles.title}>Bridget</span>
      <div className={styles.actions}>
        {hasVoiceProfile && onToggleFilter && (
          <button
            className={`${styles.filterBtn} ${filterMode === 'my-voice' ? styles.filterActive : ''}`}
            onClick={onToggleFilter}
            aria-pressed={filterMode === 'my-voice'}
            aria-label={filterMode === 'my-voice' ? 'Showing my voice only' : 'Showing all voices'}
            type="button"
          >
            {filterMode === 'my-voice' ? 'My Voice' : 'All'}
          </button>
        )}
        <button
          ref={settingsButtonRef}
          className={styles.settingsBtn}
          onClick={onSettingsClick}
          aria-label="Settings"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
