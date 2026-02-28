'use client';

export interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div>
      <h1>Meet Bridget</h1>
      <p>Real-time subtitles for face-to-face conversations</p>
      <p>Bridget turns speech into text so you never miss a word.</p>
      <button type="button" onClick={onNext}>
        Get Started
      </button>
    </div>
  );
}
