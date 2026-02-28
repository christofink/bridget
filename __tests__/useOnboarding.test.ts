import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from '@/hooks/useOnboarding';

const STORAGE_KEY = 'bridget_onboarding_complete';

describe('useOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns needsOnboarding: true when localStorage has no completion flag', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.needsOnboarding).toBe(true);
  });

  it('returns needsOnboarding: false when completion flag is set', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.needsOnboarding).toBe(false);
  });

  it('completeOnboarding() sets localStorage flag', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.completeOnboarding();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    expect(result.current.needsOnboarding).toBe(false);
  });

  it('resetOnboarding() clears localStorage flag', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.resetOnboarding();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.needsOnboarding).toBe(true);
  });
});
