import { renderHook, act } from '@testing-library/react';
import { useTranscription } from '@/hooks/useTranscription';

// Mock SpeechRecognition
let mockInstance: MockSpeechRecognition | null = null;

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;

  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  start = vi.fn(() => {
    setTimeout(() => this.onstart?.(), 0);
  });
  stop = vi.fn(() => {
    setTimeout(() => this.onend?.(), 0);
  });
  abort = vi.fn();

  constructor() {
    mockInstance = this;
  }
}

function createResultEvent(
  results: Array<{ transcript: string; isFinal: boolean }>,
  resultIndex = 0,
) {
  const resultList = results.map((r) => {
    const alt = [{ transcript: r.transcript, confidence: 0.9 }];
    Object.defineProperty(alt, 'isFinal', { value: r.isFinal });
    return alt;
  });
  Object.defineProperty(resultList, 'length', { value: results.length });
  return { results: resultList, resultIndex };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockInstance = null;
  (globalThis as Record<string, unknown>).webkitSpeechRecognition =
    MockSpeechRecognition;
});

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
  delete (globalThis as Record<string, unknown>).SpeechRecognition;
});

describe('useTranscription', () => {
  it('initial state is idle with empty segments', () => {
    const { result } = renderHook(() => useTranscription());
    expect(result.current.state).toBe('idle');
    expect(result.current.segments).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('start() transitions through requesting-permission to listening', async () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() => useTranscription({ onStateChange }));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('requesting-permission');

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.state).toBe('listening');
    expect(onStateChange).toHaveBeenCalledWith('requesting-permission');
    expect(onStateChange).toHaveBeenCalledWith('listening');
  });

  it('start() configures SpeechRecognition correctly', () => {
    const { result } = renderHook(() => useTranscription({ lang: 'en-GB' }));

    act(() => {
      result.current.start();
    });

    expect(mockInstance).not.toBeNull();
    expect(mockInstance!.continuous).toBe(true);
    expect(mockInstance!.interimResults).toBe(true);
    expect(mockInstance!.maxAlternatives).toBe(1);
    expect(mockInstance!.lang).toBe('en-GB');
  });

  it('defaults lang to en-US', () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });

    expect(mockInstance!.lang).toBe('en-US');
  });

  it('stop() transitions to idle and clears segments', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    // Add a segment
    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello', isFinal: true }]),
      );
    });
    expect(result.current.segments.length).toBe(1);

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.segments).toEqual([]);
    expect(mockInstance!.stop).toHaveBeenCalled();
  });

  it('pause() stops recognition and sets state to paused', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.state).toBe('paused');
    expect(mockInstance!.stop).toHaveBeenCalled();
  });

  it('pause() retains segments', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello world', isFinal: true }]),
      );
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.segments.length).toBe(1);
    expect(result.current.segments[0].text).toBe('hello world');
  });

  it('resume() restarts recognition after pause', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.pause();
    });

    // onend fires after stop
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.resume();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.state).toBe('listening');
  });

  it('onresult with interim results creates interim segment', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello wor', isFinal: false }]),
      );
    });

    expect(result.current.segments.length).toBe(1);
    expect(result.current.segments[0].isFinal).toBe(false);
    expect(result.current.segments[0].text).toBe('hello wor');
    expect(result.current.segments[0].id).toBe(-1);
  });

  it('onresult with final results creates final segment', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello world', isFinal: true }]),
      );
    });

    expect(result.current.segments.length).toBe(1);
    expect(result.current.segments[0].isFinal).toBe(true);
    expect(result.current.segments[0].text).toBe('hello world');
    expect(result.current.segments[0].id).toBe(1);
  });

  it('interim segment is replaced by next result', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    // First interim
    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hel', isFinal: false }]),
      );
    });
    expect(result.current.segments.length).toBe(1);
    expect(result.current.segments[0].text).toBe('hel');

    // Updated interim
    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello world', isFinal: false }]),
      );
    });
    expect(result.current.segments.length).toBe(1);
    expect(result.current.segments[0].text).toBe('hello world');
  });

  it('final segment followed by new interim', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    // Final result
    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello world', isFinal: true }]),
      );
    });

    // New interim
    act(() => {
      mockInstance!.onresult?.(
        createResultEvent(
          [
            { transcript: 'hello world', isFinal: true },
            { transcript: 'how are', isFinal: false },
          ],
          1,
        ),
      );
    });

    expect(result.current.segments.length).toBe(2);
    expect(result.current.segments[0].isFinal).toBe(true);
    expect(result.current.segments[0].text).toBe('hello world');
    expect(result.current.segments[1].isFinal).toBe(false);
    expect(result.current.segments[1].text).toBe('how are');
  });

  it('auto-restarts on onend when intent is listening', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockInstance!.start).toHaveBeenCalledTimes(1);

    // Simulate onend (silence timeout)
    act(() => {
      mockInstance!.onend?.();
    });

    expect(mockInstance!.start).toHaveBeenCalledTimes(2);
  });

  it('does not restart on onend when paused', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.pause();
    });

    const startCallCount = mockInstance!.start.mock.calls.length;

    await act(async () => {
      vi.runAllTimers();
    });

    // onend fired from pause, but should NOT restart
    expect(mockInstance!.start.mock.calls.length).toBe(startCallCount);
  });

  it('no-speech error does not transition to error state', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onerror?.({ error: 'no-speech' });
    });

    expect(result.current.state).toBe('listening');
    expect(result.current.error).toBeNull();
  });

  it('not-allowed error transitions to error state', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useTranscription({ onError }));

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onerror?.({ error: 'not-allowed' });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Microphone permission denied');
    expect(onError).toHaveBeenCalled();
  });

  it('network error transitions to error state', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useTranscription({ onError }));

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onerror?.({ error: 'network' });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe(
      'Speech recognition requires an internet connection',
    );
    expect(onError).toHaveBeenCalled();
  });

  it('error state when SpeechRecognition is unavailable', () => {
    delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
    delete (globalThis as Record<string, unknown>).SpeechRecognition;

    // Need to re-import hook to pick up missing SpeechRecognition
    // Since the module caches the class at import time, we test via a fresh hook
    // that detects the missing API at runtime
    const onError = vi.fn();
    const { result } = renderHook(() => useTranscription({ onError }));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe(
      'Speech recognition is not supported in this browser',
    );
  });

  it('clearSegments() removes all segments without stopping', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: 'hello', isFinal: true }]),
      );
    });
    expect(result.current.segments.length).toBe(1);

    act(() => {
      result.current.clearSegments();
    });

    expect(result.current.segments).toEqual([]);
    expect(result.current.state).toBe('listening');
  });

  it('cleanup on unmount stops recognition', async () => {
    const { result, unmount } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    const instance = mockInstance!;
    unmount();

    expect(instance.stop).toHaveBeenCalled();
  });

  it('ignores empty transcripts', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      mockInstance!.onresult?.(
        createResultEvent([{ transcript: '   ', isFinal: true }]),
      );
    });

    expect(result.current.segments).toEqual([]);
  });

  it('guards against double-start', async () => {
    const { result } = renderHook(() => useTranscription());

    act(() => {
      result.current.start();
    });
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.start();
    });

    // Should only have one instance
    expect(mockInstance!.start).toHaveBeenCalledTimes(1);
  });
});
