'use client';

import { useState, useCallback } from 'react';
import WelcomeStep from './WelcomeStep';
import MicPermissionStep from './MicPermissionStep';
import PwaInstallStep from './PwaInstallStep';
import { isStandalone } from '@/lib/pwa/standalone';
import styles from './OnboardingFlow.module.css';

type OnboardingStep = 'welcome' | 'mic-permission' | 'pwa-install';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');

  // Focus the step container when it mounts (key={step} causes remount)
  const focusRef = useCallback((node: HTMLElement | null) => {
    node?.focus();
  }, []);

  const handleMicGranted = () => {
    if (isStandalone()) {
      onComplete();
    } else {
      setStep('pwa-install');
    }
  };

  return (
    <div className={styles.overlay}>
      <section key={step} ref={focusRef} className={styles.container} tabIndex={-1} aria-label="Setup">
        {step === 'welcome' && (
          <WelcomeStep onNext={() => setStep('mic-permission')} />
        )}
        {step === 'mic-permission' && (
          <MicPermissionStep onNext={handleMicGranted} />
        )}
        {step === 'pwa-install' && (
          <PwaInstallStep
            onNext={onComplete}
            onSkip={onComplete}
          />
        )}
      </section>
    </div>
  );
}
