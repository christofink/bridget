import { renderHook, act } from '@testing-library/react';
import { useSettings } from '@/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults';

const STORAGE_KEY = 'bridget_settings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset CSS custom properties
    document.documentElement.style.cssText = '';
    document.body.classList.remove('high-contrast');
  });

  it('returns default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('reads persisted settings from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: 2.0 }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.fontSize).toBe(2.0);
  });

  it('writes settings to localStorage on change', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ fontSize: 3.0 });
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.fontSize).toBe(3.0);
  });

  it('applies CSS custom properties to document root on change', () => {
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.updateSettings({ fontSize: 2.5 });
    });
    expect(
      document.documentElement.style.getPropertyValue('--font-size-subtitle')
    ).toBe('2.5rem');
  });

  it('resetToDefaults() clears localStorage and restores defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: 3.0 }));
    const { result } = renderHook(() => useSettings());
    act(() => {
      result.current.resetToDefaults();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(() => {
      renderHook(() => useSettings());
    }).not.toThrow();
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});
