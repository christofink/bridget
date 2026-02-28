'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ControlsBar from '@/components/shell/ControlsBar';
import SubtitleArea from '@/components/shell/SubtitleArea';
import ActionBar from '@/components/shell/ActionBar';
import SettingsPanel from '@/components/shell/SettingsPanel';
import StatusAnnouncer from '@/components/shell/StatusAnnouncer';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import VoiceEnrollment from '@/components/enrollment/VoiceEnrollment';
import { useTranscription } from '@/hooks/useTranscription';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useVoiceEnrollment } from '@/hooks/useVoiceEnrollment';
import { useSpeakerIdentification } from '@/hooks/useSpeakerIdentification';
import { useSettings } from '@/hooks/useSettings';
import { useOnboarding } from '@/hooks/useOnboarding';
import { requestPersistentStorage } from '@/lib/pwa/storage';
import type { TranscriptSegment } from '@/lib/stt/types';

export default function Home() {
  const { needsOnboarding, completeOnboarding } = useOnboarding();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const { settings, updateSettings, resetToDefaults } = useSettings();

  const { state, segments, start: startTranscription, stop: stopTranscription, pause: pauseTranscription, resume: resumeTranscription } = useTranscription();

  const enrollment = useVoiceEnrollment();

  const speakerId = useSpeakerIdentification({
    profile: enrollment.profile,
    enabled: settings.speakerIdEnabled,
    threshold: settings.speakerIdThreshold,
  });

  // Audio capture feeds raw audio into the speaker ID ring buffer
  const { start: startAudio, stop: stopAudio, pause: pauseAudio, resume: resumeAudio } = useAudioCapture({
    onAudioChunk: (int16Chunk) => {
      if (!settings.speakerIdEnabled || !enrollment.profile) return;
      // Convert Int16 back to Float32 for the ring buffer
      const float32 = new Float32Array(int16Chunk.length);
      for (let i = 0; i < int16Chunk.length; i++) {
        float32[i] = int16Chunk[i] / (int16Chunk[i] < 0 ? 0x8000 : 0x7FFF);
      }
      speakerId.writeAudio(float32);
    },
  });

  // Track which segments have been labeled to avoid re-processing
  const labeledIdsRef = useRef(new Set<number>());
  const [labeledSegments, setLabeledSegments] = useState<Map<number, { label: TranscriptSegment['speaker']; confidence: number }>>(new Map());

  // Label new final segments asynchronously
  useEffect(() => {
    if (!settings.speakerIdEnabled || !enrollment.profile) return;

    const unlabeled = segments.filter(
      (s) => s.isFinal && s.id > 0 && !labeledIdsRef.current.has(s.id),
    );

    for (const seg of unlabeled) {
      labeledIdsRef.current.add(seg.id);
      speakerId.labelSegment(seg).then((result) => {
        setLabeledSegments((prev) => {
          const next = new Map(prev);
          next.set(seg.id, result);
          return next;
        });
      });
    }
  }, [segments, settings.speakerIdEnabled, enrollment.profile, speakerId]);

  // Merge speaker labels into segments for display
  const enrichedSegments: TranscriptSegment[] = segments.map((seg) => {
    const label = labeledSegments.get(seg.id);
    if (label) {
      return { ...seg, speaker: label.label, speakerConfidence: label.confidence };
    }
    return seg;
  });

  // Apply filter mode
  const displaySegments = settings.filterMode === 'my-voice'
    ? enrichedSegments.filter((s) => s.speaker === 'user' || !s.isFinal)
    : enrichedSegments;

  // Coordinate start/stop between transcription and audio capture
  const handleStart = useCallback(() => {
    startTranscription();
    if (settings.speakerIdEnabled && enrollment.profile) {
      startAudio();
    }
  }, [startTranscription, startAudio, settings.speakerIdEnabled, enrollment.profile]);

  const handleStop = useCallback(() => {
    stopTranscription();
    stopAudio();
    labeledIdsRef.current.clear();
    setLabeledSegments(new Map());
  }, [stopTranscription, stopAudio]);

  const handlePause = useCallback(() => {
    pauseTranscription();
    pauseAudio();
  }, [pauseTranscription, pauseAudio]);

  const handleResume = useCallback(() => {
    resumeTranscription();
    if (settings.speakerIdEnabled && enrollment.profile) {
      resumeAudio();
    }
  }, [resumeTranscription, resumeAudio, settings.speakerIdEnabled, enrollment.profile]);

  const handleOnboardingComplete = () => {
    completeOnboarding();
    requestPersistentStorage();
  };

  // Close settings dialog before starting enrollment so the enrollment UI is visible
  const handleEnrollFromSettings = useCallback(() => {
    setSettingsOpen(false);
    enrollment.startRecording();
  }, [enrollment]);

  // Whether to show the standalone enrollment overlay (outside onboarding)
  const showEnrollmentOverlay =
    !needsOnboarding &&
    enrollment.state !== 'idle' &&
    enrollment.state !== 'complete';

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-shell">
      <ControlsBar
        onSettingsClick={() => setSettingsOpen(true)}
        settingsButtonRef={settingsButtonRef}
        hasVoiceProfile={!!enrollment.profile}
        filterMode={settings.filterMode}
        onToggleFilter={() =>
          updateSettings({
            filterMode: settings.filterMode === 'all' ? 'my-voice' : 'all',
          })
        }
      />
      <SubtitleArea segments={displaySegments} />
      <ActionBar
        state={state}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetDefaults={resetToDefaults}
        triggerRef={settingsButtonRef}
        hasVoiceProfile={!!enrollment.profile}
        onEnrollVoice={handleEnrollFromSettings}
        onDeleteVoiceProfile={enrollment.clearProfile}
      />
      <StatusAnnouncer state={state} />
      {showEnrollmentOverlay && (
        <div className="enrollment-overlay">
          <VoiceEnrollment
            state={enrollment.state}
            progress={enrollment.progress}
            error={enrollment.error}
            onStart={enrollment.startRecording}
            onCancel={enrollment.cancelRecording}
            onComplete={() => {/* overlay hides automatically when state → complete */}}
          />
        </div>
      )}
    </div>
  );
}
