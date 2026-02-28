'use client';

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'bridget_onboarding_complete';

export function useOnboarding() {
  const [needsOnboarding, setNeedsOnboarding] = useState(true);

  useEffect(() => {
    setNeedsOnboarding(localStorage.getItem(STORAGE_KEY) !== 'true');
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setNeedsOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNeedsOnboarding(true);
  }, []);

  return { needsOnboarding, completeOnboarding, resetOnboarding };
}
