import { downsample, float32ToInt16 } from '@/lib/audio/downsampler';

describe('downsample', () => {
  it('outputs buffer 1/3 the input length for 48000 → 16000', () => {
    const input = new Float32Array(480); // 10ms at 48kHz
    const output = downsample(input, 48000, 16000);
    expect(output.length).toBe(160); // 10ms at 16kHz
  });

  it('outputs correctly sized buffer for 44100 → 16000', () => {
    const input = new Float32Array(441); // 10ms at 44.1kHz
    const output = downsample(input, 44100, 16000);
    expect(output.length).toBe(160); // 10ms at 16kHz
  });

  it('returns original buffer when input/output rate are the same', () => {
    const input = new Float32Array(160);
    const output = downsample(input, 16000, 16000);
    expect(output).toBe(input);
  });
});

describe('float32ToInt16', () => {
  it('converts 0.0 to 0', () => {
    expect(float32ToInt16(new Float32Array([0.0]))[0]).toBe(0);
  });

  it('converts 1.0 to 32767', () => {
    expect(float32ToInt16(new Float32Array([1.0]))[0]).toBe(32767);
  });

  it('converts -1.0 to -32768', () => {
    expect(float32ToInt16(new Float32Array([-1.0]))[0]).toBe(-32768);
  });

  it('clamps values outside [-1, 1]', () => {
    const result = float32ToInt16(new Float32Array([1.5, -1.5]));
    expect(result[0]).toBe(32767);
    expect(result[1]).toBe(-32768);
  });
});
