'use client';

import WakeLockHint from './WakeLockHint';

export interface PwaInstallStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function PwaInstallStep({ onNext, onSkip }: PwaInstallStepProps) {
  return (
    <div>
      <h2>Add to Home Screen</h2>
      <p>Install Bridget for the best experience:</p>
      <ol>
        <li>Tap the Share button in Safari</li>
        <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
        <li>Tap &quot;Add&quot; to confirm</li>
      </ol>
      <WakeLockHint />
      <div>
        <button type="button" onClick={onNext}>
          Done
        </button>
        <button type="button" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
