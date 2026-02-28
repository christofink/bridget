class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    let offset = 0;
    while (offset < input.length) {
      const remaining = 2048 - this.bufferIndex;
      const toCopy = Math.min(remaining, input.length - offset);
      this.buffer.set(input.subarray(offset, offset + toCopy), this.bufferIndex);
      this.bufferIndex += toCopy;
      offset += toCopy;

      if (this.bufferIndex >= 2048) {
        const toSend = this.buffer;
        this.buffer = new Float32Array(2048);
        this.bufferIndex = 0;
        this.port.postMessage(toSend, [toSend.buffer]);
      }
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
