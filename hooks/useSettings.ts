'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BridgetSettings } from '@/lib/settings/types';
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults';

const STORAGE_KEY = 'bridget_settings';

function loadSettings(): BridgetSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyCSSProperties(settings: BridgetSettings) {
  const root = document.documentElement;
  root.style.setProperty('--font-size-subtitle', `${settings.fontSize}rem`);
  root.style.setProperty('--font-family', settings.fontFamily);
  root.style.setProperty('--text-subtitle', settings.textColor);
  root.style.setProperty('--bg-subtitle', `rgba(0, 0, 0, ${settings.bgOpacity})`);

  if (settings.highContrast) {
    document.body.classList.add('high-contrast');
  } else {
    document.body.classList.remove('high-contrast');
  }

  if (settings.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<BridgetSettings>(loadSettings);
  const settingsRef = useRef(settings);

  // Apply CSS properties on mount
  useEffect(() => {
    applyCSSProperties(settingsRef.current);
  }, []);

  const updateSettings = useCallback((partial: Partial<BridgetSettings>) => {
    const next = { ...settingsRef.current, ...partial };
    settingsRef.current = next;
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applyCSSProperties(next);
  }, []);

  const resetToDefaults = useCallback(() => {
    settingsRef.current = DEFAULT_SETTINGS;
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
    applyCSSProperties(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetToDefaults };
}
