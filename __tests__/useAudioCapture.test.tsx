import { renderHook, act } from '@testing-library/react';
import { useAudioCapture } from '@/hooks/useAudioCapture';

// Mock AudioContext
const mockResume = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockSuspend = vi.fn().mockResolvedValue(undefined);
let mockOnStateChange: (() => void) | null = null;

const mockWorkletNode = {
  port: { onmessage: null as ((e: MessageEvent) => void) | null },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAudioWorklet = {
  addModule: vi.fn().mockResolvedValue(undefined),
};

const mockSourceNode = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};

function createMockAudioContext() {
  return {
    state: 'suspended' as string,
    resume: mockResume,
    close: mockClose,
    suspend: mockSuspend,
    sampleRate: 48000,
    audioWorklet: mockAudioWorklet,
    createMediaStreamSource: vi.fn().mockReturnValue(mockSourceNode),
    get onstatechange() { return mockOnStateChange; },
    set onstatechange(fn: (() => void) | null) { mockOnStateChange = fn; },
  };
}

// Mock getUserMedia
const mockTrackStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: mockTrackStop, addEventListener: vi.fn(), removeEventListener: vi.fn() }],
  getAudioTracks: () => [{ stop: mockTrackStop, addEventListener: vi.fn(), removeEventListener: vi.fn() }],
};
const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

// Mock Wake Lock
const mockWakeLockRelease = vi.fn().mockResolvedValue(undefined);
const mockWakeLockRequest = vi.fn().mockResolvedValue({ release: mockWakeLockRelease });

beforeEach(() => {
  vi.clearAllMocks();
  mockOnStateChange = null;

  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  });

  (globalThis as any).AudioContext = vi.fn().mockImplementation(createMockAudioContext);
  (globalThis as any).AudioWorkletNode = vi.fn().mockImplementation(function () { return mockWorkletNode; });

  Object.defineProperty(navigator, 'wakeLock', {
    value: { request: mockWakeLockRequest },
    configurable: true,
  });
});

describe('useAudioCapture', () => {
  it('initial state is idle', () => {
    const { result } = renderHook(() => useAudioCapture());
    expect(result.current.state).toBe('idle');
  });

  it('start() transitions through requesting-permission to listening', async () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() => useAudioCapture({ onStateChange }));

    await act(async () => {
      await result.current.start();
    });

    const states = onStateChange.mock.calls.map((c: [string]) => c[0]);
    expect(states).toContain('requesting-permission');
    expect(result.current.state).toBe('listening');
  });

  it('stop() transitions state to idle', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe('idle');
  });

  it('pause() transitions state to paused', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.pause();
    });

    expect(result.current.state).toBe('paused');
  });

  it('resume() from paused transitions to listening', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.pause();
    });

    await act(async () => {
      await result.current.resume();
    });

    expect(result.current.state).toBe('listening');
  });

  it('start() calls getUserMedia with correct constraints', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      }),
    });

    // Ensure no sampleRate constraint
    const audioConstraints = mockGetUserMedia.mock.calls[0][0].audio;
    expect(audioConstraints).not.toHaveProperty('sampleRate');
  });

  it('start() resumes AudioContext', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    expect(mockResume).toHaveBeenCalled();
  });

  it('stop() calls track.stop() on all media stream tracks', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockTrackStop).toHaveBeenCalled();
  });

  it('stop() calls audioContext.close()', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockClose).toHaveBeenCalled();
  });

  it('stop() disconnects AudioWorkletNode', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockWorkletNode.disconnect).toHaveBeenCalled();
  });

  it('hook cleanup on unmount releases all resources', async () => {
    const { result, unmount } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(mockTrackStop).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('onAudioChunk callback receives Int16Array data', async () => {
    const onAudioChunk = vi.fn();
    const { result } = renderHook(() => useAudioCapture({ onAudioChunk }));

    await act(async () => {
      await result.current.start();
    });

    // Simulate worklet sending audio data
    const audioData = new Float32Array(2048).fill(0.5);
    act(() => {
      mockWorkletNode.port.onmessage?.({ data: audioData } as MessageEvent);
    });

    expect(onAudioChunk).toHaveBeenCalled();
    expect(onAudioChunk.mock.calls[0][0]).toBeInstanceOf(Int16Array);
  });

  it('onError is called when getUserMedia permission is denied', async () => {
    const permError = new DOMException('Permission denied', 'NotAllowedError');
    mockGetUserMedia.mockRejectedValueOnce(permError);

    const onError = vi.fn();
    const { result } = renderHook(() => useAudioCapture({ onError }));

    await act(async () => {
      await result.current.start();
    });

    expect(onError).toHaveBeenCalled();
    expect(result.current.state).toBe('error');
  });

  it('onStateChange is called on each state transition', async () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() => useAudioCapture({ onStateChange }));

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(onStateChange).toHaveBeenCalledWith('requesting-permission');
    expect(onStateChange).toHaveBeenCalledWith('listening');
    expect(onStateChange).toHaveBeenCalledWith('idle');
  });

  it('Wake Lock is requested when capture starts', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    expect(mockWakeLockRequest).toHaveBeenCalledWith('screen');
  });

  it('Wake Lock is released when capture stops', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockWakeLockRelease).toHaveBeenCalled();
  });

  it('AudioContext state change to suspended updates capture state to paused', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe('listening');

    // Simulate iOS audio interruption
    act(() => {
      // Get the mock audio context and change its state
      const mockCtx = (globalThis as any).AudioContext.mock.results[0].value;
      mockCtx.state = 'suspended';
      mockOnStateChange?.();
    });

    expect(result.current.state).toBe('paused');
  });

  it('AudioContext state change to interrupted updates capture state to paused', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      const mockCtx = (globalThis as any).AudioContext.mock.results[0].value;
      mockCtx.state = 'interrupted';
      mockOnStateChange?.();
    });

    expect(result.current.state).toBe('paused');
  });

  it('resume after interruption calls audioContext.resume()', async () => {
    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    // Simulate interruption
    act(() => {
      const mockCtx = (globalThis as any).AudioContext.mock.results[0].value;
      mockCtx.state = 'suspended';
      mockOnStateChange?.();
    });

    expect(result.current.state).toBe('paused');

    mockResume.mockClear();
    await act(async () => {
      await result.current.resume();
    });

    expect(mockResume).toHaveBeenCalled();
    expect(result.current.state).toBe('listening');
  });

  it('no error when Wake Lock API is unavailable', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      configurable: true,
    });

    const { result } = renderHook(() => useAudioCapture());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe('listening');
  });
});
