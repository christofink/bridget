'use client';

import { useEffect, useState } from 'react';

export default function SWUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    const sw = navigator.serviceWorker;
    // Skip the first controllerchange which fires on initial SW activation
    let isFirstController = !sw.controller;

    const handleControllerChange = () => {
      if (isFirstController) {
        isFirstController = false;
        return;
      }
      setUpdateAvailable(true);
    };

    sw.addEventListener('controllerchange', handleControllerChange);

    return () => {
      sw.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px',
        background: 'var(--accent, #4a9eff)',
        color: '#fff',
        textAlign: 'center',
        zIndex: 9999,
        cursor: 'pointer',
      }}
      onClick={() => window.location.reload()}
    >
      New version available — tap to refresh
    </div>
  );
}
