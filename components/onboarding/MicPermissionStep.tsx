'use client';

import { useState } from 'react';

export interface MicPermissionStepProps {
  onNext: () => void;
}

export default function MicPermissionStep({ onNext }: MicPermissionStepProps) {
  const [error, setError] = useState(false);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      onNext();
    } catch {
      setError(true);
    }
  };

  return (
    <div>
      <h2>Microphone Access</h2>
      <p>
        Bridget needs access to your microphone to hear the conversation and
        create subtitles.
      </p>
      {error && (
        <div role="alert" id="mic-error">
          <p>
            Microphone access was denied or blocked. Please enable it in your
            device Settings under Privacy &amp; Security &gt; Microphone.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={requestPermission}
        aria-describedby={error ? 'mic-error' : undefined}
      >
        {error ? 'Try Again' : 'Allow Microphone'}
      </button>
    </div>
  );
}
