import { AudioRingBuffer } from '@/lib/audio/audio-ring-buffer';

describe('AudioRingBuffer', () => {
  const SAMPLE_RATE = 16000;

  it('returns null when empty', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);
    expect(buf.getRecent(1)).toBeNull();
    expect(buf.getWindow(0, 1000)).toBeNull();
  });

  it('stores and retrieves a simple chunk', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);
    const chunk = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
    buf.write(chunk, 1000);

    const recent = buf.getRecent(1);
    expect(recent).not.toBeNull();
    expect(recent!.length).toBe(5);
    expect(recent![0]).toBeCloseTo(0.1);
    expect(recent![4]).toBeCloseTo(0.5);
  });

  it('getRecent returns at most the requested duration', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);
    // Write 2 seconds of audio (32000 samples)
    const chunk = new Float32Array(32000);
    for (let i = 0; i < chunk.length; i++) chunk[i] = i / chunk.length;
    buf.write(chunk, 0);

    const recent = buf.getRecent(1);
    expect(recent).not.toBeNull();
    expect(recent!.length).toBe(16000); // 1 second at 16kHz
  });

  it('wraps around correctly', () => {
    // Buffer holds 1 second = 16000 samples
    const buf = new AudioRingBuffer(1, SAMPLE_RATE);

    // Write 1.5 seconds (24000 samples) — should wrap
    const chunk1 = new Float32Array(16000).fill(0.5);
    buf.write(chunk1, 0);

    const chunk2 = new Float32Array(8000).fill(0.9);
    buf.write(chunk2, 1000);

    const recent = buf.getRecent(1);
    expect(recent).not.toBeNull();
    expect(recent!.length).toBe(16000);

    // First 8000 samples should be from chunk1 (0.5)
    expect(recent![0]).toBeCloseTo(0.5);
    // Last 8000 samples should be from chunk2 (0.9)
    expect(recent![15999]).toBeCloseTo(0.9);
    expect(recent![8000]).toBeCloseTo(0.9);
  });

  it('getWindow returns correct time range', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);

    // Write 2 seconds of audio
    const chunk1 = new Float32Array(16000).fill(0.3);
    buf.write(chunk1, 0);

    const chunk2 = new Float32Array(16000).fill(0.7);
    buf.write(chunk2, 1000);

    // Get second 1-2 (should be mostly 0.7)
    const window = buf.getWindow(1000, 2000);
    expect(window).not.toBeNull();
    expect(window!.length).toBeGreaterThan(0);
    // All samples in this window should be 0.7
    for (let i = 0; i < window!.length; i++) {
      expect(window![i]).toBeCloseTo(0.7, 1);
    }
  });

  it('getWindow clamps to available range', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);
    const chunk = new Float32Array(16000).fill(0.5);
    buf.write(chunk, 1000);

    // Request window before data exists
    const window = buf.getWindow(0, 500);
    expect(window).toBeNull();

    // Request window partially in range
    const partial = buf.getWindow(500, 1500);
    expect(partial).not.toBeNull();
    expect(partial!.length).toBeGreaterThan(0);
  });

  it('clear resets the buffer', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);
    const chunk = new Float32Array(16000).fill(0.5);
    buf.write(chunk, 0);

    buf.clear();

    expect(buf.getRecent(1)).toBeNull();
    expect(buf.currentTimestamp).toBe(0);
  });

  it('currentTimestamp tracks write progress', () => {
    const buf = new AudioRingBuffer(5, SAMPLE_RATE);
    expect(buf.currentTimestamp).toBe(0);

    // Write 1 second of audio starting at t=5000
    const chunk = new Float32Array(16000).fill(0);
    buf.write(chunk, 5000);

    // Should be 5000 + (16000/16000)*1000 = 6000
    expect(buf.currentTimestamp).toBeCloseTo(6000);
  });
});
