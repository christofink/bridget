'use client';

import { useState, useRef } from 'react';
import ControlsBar from '@/components/shell/ControlsBar';
import SubtitleArea from '@/components/shell/SubtitleArea';
import ActionBar from '@/components/shell/ActionBar';
import SettingsPanel from '@/components/shell/SettingsPanel';
import StatusAnnouncer from '@/components/shell/StatusAnnouncer';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { useTranscription } from '@/hooks/useTranscription';
import { useSettings } from '@/hooks/useSettings';
import { useOnboarding } from '@/hooks/useOnboarding';
import { requestPersistentStorage } from '@/lib/pwa/storage';

export default function Home() {
  const { needsOnboarding, completeOnboarding } = useOnboarding();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const { settings, updateSettings, resetToDefaults } = useSettings();

  const { state, segments, start, stop, pause, resume } = useTranscription();

  const handleOnboardingComplete = () => {
    completeOnboarding();
    requestPersistentStorage();
  };

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-shell">
      <ControlsBar
        onSettingsClick={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButtonRef}
      />
      <SubtitleArea segments={segments} />
      <ActionBar
        state={state}
        onStart={start}
        onStop={stop}
        onPause={pause}
        onResume={resume}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetDefaults={resetToDefaults}
        triggerRef={settingsButtonRef}
      />
      <StatusAnnouncer state={state} />
    </div>
  );
}
