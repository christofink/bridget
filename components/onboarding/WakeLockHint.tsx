'use client';

import { useState, useEffect } from 'react';

export default function WakeLockHint() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!('wakeLock' in navigator) || !navigator.wakeLock) {
      setShowHint(true);
    }
  }, []);

  if (!showHint) return null;

  return (
    <p>
      For the best experience, set your iPad&apos;s Auto-Lock to Never in
      Settings &gt; Display &amp; Brightness.
    </p>
  );
}
