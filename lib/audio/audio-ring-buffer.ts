/**
 * A rolling audio buffer that holds the last N seconds of audio
 * with wall-clock timestamp tracking for time-based window retrieval.
 */
export class AudioRingBuffer {
  private buffer: Float32Array;
  private writeIndex = 0;
  private totalSamplesWritten = 0;
  private readonly sampleRate: number;
  private startTimestamp = 0;

  constructor(durationSeconds: number, sampleRate: number) {
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(Math.ceil(durationSeconds * sampleRate));
  }

  /** Write a chunk of audio samples. timestamp is the wall-clock time (Date.now()) for the start of this chunk. */
  write(chunk: Float32Array, timestamp: number): void {
    if (this.totalSamplesWritten === 0) {
      this.startTimestamp = timestamp;
    }

    for (let i = 0; i < chunk.length; i++) {
      this.buffer[this.writeIndex] = chunk[i];
      this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    }
    this.totalSamplesWritten += chunk.length;
  }

  /**
   * Get audio between two wall-clock timestamps (ms).
   * Returns null if the requested window is outside the buffer.
   */
  getWindow(startTime: number, endTime: number): Float32Array | null {
    if (this.totalSamplesWritten === 0) return null;

    const filledSamples = Math.min(this.totalSamplesWritten, this.buffer.length);
    const filledDurationMs = (filledSamples / this.sampleRate) * 1000;
    const currentTime = this.startTimestamp + (this.totalSamplesWritten / this.sampleRate) * 1000;
    const oldestTime = currentTime - filledDurationMs;

    // Clamp to available range
    const clampedStart = Math.max(startTime, oldestTime);
    const clampedEnd = Math.min(endTime, currentTime);

    if (clampedStart >= clampedEnd) return null;

    const startOffset = Math.floor(((clampedStart - oldestTime) / 1000) * this.sampleRate);
    const endOffset = Math.ceil(((clampedEnd - oldestTime) / 1000) * this.sampleRate);
    const length = endOffset - startOffset;

    if (length <= 0) return null;

    const result = new Float32Array(length);
    const totalInBuffer = Math.min(this.totalSamplesWritten, this.buffer.length);

    // The oldest sample in the buffer is at (writeIndex - totalInBuffer + bufferLength) % bufferLength
    const oldestIndex = (this.writeIndex - totalInBuffer + this.buffer.length) % this.buffer.length;

    for (let i = 0; i < length; i++) {
      const readIndex = (oldestIndex + startOffset + i) % this.buffer.length;
      result[i] = this.buffer[readIndex];
    }

    return result;
  }

  /** Get the most recent N seconds of audio. */
  getRecent(durationSeconds: number): Float32Array | null {
    if (this.totalSamplesWritten === 0) return null;

    const requestedSamples = Math.ceil(durationSeconds * this.sampleRate);
    const availableSamples = Math.min(this.totalSamplesWritten, this.buffer.length);
    const length = Math.min(requestedSamples, availableSamples);

    const result = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const readIndex = (this.writeIndex - length + i + this.buffer.length) % this.buffer.length;
      result[i] = this.buffer[readIndex];
    }

    return result;
  }

  /** Reset the buffer. */
  clear(): void {
    this.buffer.fill(0);
    this.writeIndex = 0;
    this.totalSamplesWritten = 0;
    this.startTimestamp = 0;
  }

  get currentTimestamp(): number {
    if (this.totalSamplesWritten === 0) return 0;
    return this.startTimestamp + (this.totalSamplesWritten / this.sampleRate) * 1000;
  }
}
