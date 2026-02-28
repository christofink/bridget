'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { BridgetSettings } from '@/lib/settings/types';
import type { RefObject } from 'react';
import styles from './SettingsPanel.module.css';

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: BridgetSettings;
  onUpdateSettings: (partial: Partial<BridgetSettings>) => void;
  onResetDefaults: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const COLOR_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Yellow', value: '#ffff00' },
  { label: 'Green', value: '#00ff00' },
  { label: 'Cyan', value: '#00ffff' },
];

const FONT_FAMILIES = [
  { label: 'System Default', value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: '"Courier New", Courier, monospace' },
  { label: 'OpenDyslexic', value: 'OpenDyslexic, sans-serif' },
];

export default function SettingsPanel({
  open,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
  triggerRef,
}: SettingsPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wasOpen = useRef(false);

  // Open/close the dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Focus first focusable element
      const focusable = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }

    // Return focus to trigger when closing
    if (wasOpen.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open, triggerRef]);

  // Handle Escape key and focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusableElements = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  // Prevent native dialog cancel (Escape) from closing without our handler
  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.panel}
      aria-modal="true"
      aria-label="Settings"
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close settings"
          type="button"
        >
          &times;
        </button>
      </div>

      <div className={styles.content}>
        {/* Font Size */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Font Size</legend>
          <label className={styles.rangeLabel}>
            <input
              type="range"
              min="1"
              max="4"
              step="0.25"
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: parseFloat(e.target.value) })}
              aria-label="Font size"
            />
            <span>{settings.fontSize}rem</span>
          </label>
        </fieldset>

        {/* Font Family */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Font Family</legend>
          <select
            value={settings.fontFamily}
            onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
            className={styles.select}
            aria-label="Font family"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </fieldset>

        {/* Text Color */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Text Color</legend>
          <div className={styles.colorPresets}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`${styles.colorBtn} ${settings.textColor === c.value ? styles.colorBtnActive : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => onUpdateSettings({ textColor: c.value })}
                aria-label={c.label}
                aria-pressed={settings.textColor === c.value}
              />
            ))}
          </div>
        </fieldset>

        {/* Background Opacity */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Background Opacity</legend>
          <label className={styles.rangeLabel}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.bgOpacity}
              onChange={(e) => onUpdateSettings({ bgOpacity: parseFloat(e.target.value) })}
              aria-label="Background opacity"
            />
            <span>{Math.round(settings.bgOpacity * 100)}%</span>
          </label>
        </fieldset>

        {/* Subtitle Position */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Subtitle Position</legend>
          <div className={styles.radioGroup}>
            {(['top', 'center', 'bottom'] as const).map((pos) => (
              <label key={pos} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="subtitlePosition"
                  value={pos}
                  checked={settings.subtitlePosition === pos}
                  onChange={() => onUpdateSettings({ subtitlePosition: pos })}
                />
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>

        {/* High Contrast */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>High Contrast</legend>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
            />
            Enable high contrast mode
          </label>
        </fieldset>

        {/* Reduced Motion */}
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Reduced Motion</legend>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
            />
            Reduce animations
          </label>
        </fieldset>

        {/* Reset */}
        <button
          type="button"
          className={styles.resetBtn}
          onClick={onResetDefaults}
        >
          Reset to Defaults
        </button>
      </div>
    </dialog>
  );
}
