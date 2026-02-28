import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import * as standaloneModule from '@/lib/pwa/standalone';

// Mock isStandalone
vi.mock('@/lib/pwa/standalone', () => ({
  isStandalone: vi.fn(() => false),
}));

const mockGetUserMedia = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockGetUserMedia.mockReset();

  // Set up navigator.mediaDevices.getUserMedia mock
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });

  // Ensure wakeLock exists by default
  Object.defineProperty(navigator, 'wakeLock', {
    value: {},
    writable: true,
    configurable: true,
  });

  vi.mocked(standaloneModule.isStandalone).mockReturnValue(false);
});

/** Helper: advance through welcome → mic → voice enrollment (skipped) */
async function advancePastMicAndEnrollment() {
  fireEvent.click(screen.getByRole('button', { name: /get started/i }));
  fireEvent.click(screen.getByRole('button', { name: /allow microphone/i }));

  // Wait for voice enrollment step
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /learn your voice/i })).toBeTruthy();
  });

  // Skip enrollment
  fireEvent.click(screen.getByRole('button', { name: /skip/i }));
}

describe('OnboardingFlow', () => {
  it('first visit shows welcome screen', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Meet Bridget/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /get started/i })).toBeTruthy();
  });

  it('"Get Started" button advances to microphone permission step', () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByRole('heading', { name: /microphone/i })).toBeTruthy();
  });

  it('microphone granted advances to voice enrollment step', async () => {
    const mockTrack = { stop: vi.fn() };
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });

    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByRole('button', { name: /allow microphone/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /learn your voice/i })).toBeTruthy();
    });
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('voice enrollment can be skipped to reach PWA install', async () => {
    const mockTrack = { stop: vi.fn() };
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });

    render(<OnboardingFlow onComplete={vi.fn()} />);
    await advancePastMicAndEnrollment();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /home screen/i })).toBeTruthy();
    });
  });

  it('microphone denied shows retry UI with explanation', async () => {
    const error = new DOMException('Permission denied', 'NotAllowedError');
    mockGetUserMedia.mockRejectedValue(error);

    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByRole('button', { name: /allow microphone/i }));

    await waitFor(() => {
      expect(screen.getByText(/denied|blocked|enable/i)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('PWA install step shows "Skip for now" option', async () => {
    const mockTrack = { stop: vi.fn() };
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });

    render(<OnboardingFlow onComplete={vi.fn()} />);
    await advancePastMicAndEnrollment();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /skip/i })).toBeTruthy();
    });
  });

  it('PWA install step is hidden when already in standalone mode', async () => {
    vi.mocked(standaloneModule.isStandalone).mockReturnValue(true);
    const onComplete = vi.fn();
    const mockTrack = { stop: vi.fn() };
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });

    render(<OnboardingFlow onComplete={onComplete} />);
    await advancePastMicAndEnrollment();

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('completing onboarding transitions to main view', async () => {
    const onComplete = vi.fn();
    const mockTrack = { stop: vi.fn() };
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });

    render(<OnboardingFlow onComplete={onComplete} />);
    await advancePastMicAndEnrollment();

    // PWA install step - skip
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /skip/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(onComplete).toHaveBeenCalled();
  });

  it('wake lock unavailable triggers auto-lock hint display', async () => {
    // Remove wakeLock
    // @ts-expect-error - deleting for test
    delete navigator.wakeLock;

    const mockTrack = { stop: vi.fn() };
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [mockTrack] });

    render(<OnboardingFlow onComplete={vi.fn()} />);
    await advancePastMicAndEnrollment();

    await waitFor(() => {
      expect(screen.getByText(/auto-lock/i)).toBeTruthy();
    });
  });
});
