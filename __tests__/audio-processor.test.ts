describe('AudioCaptureProcessor', () => {
  let registeredName: string;
  let ProcessorClass: any;

  beforeAll(async () => {
    // Mock AudioWorklet globals
    (globalThis as any).AudioWorkletProcessor = class {
      port = { postMessage: vi.fn() };
    };
    (globalThis as any).registerProcessor = (name: string, cls: any) => {
      registeredName = name;
      ProcessorClass = cls;
    };

    // Import the processor file to trigger registration
    await import('../public/audio-processor.js');
  });

  afterAll(() => {
    delete (globalThis as any).AudioWorkletProcessor;
    delete (globalThis as any).registerProcessor;
  });

  it('registers with registerProcessor("audio-capture-processor", ...)', () => {
    expect(registeredName).toBe('audio-capture-processor');
    expect(ProcessorClass).toBeDefined();
  });

  it('accumulates frames until buffer reaches 2048 samples', () => {
    const processor = new ProcessorClass();
    const postMessage = processor.port.postMessage;

    // Feed 8 frames of 128 samples = 1024 (less than 2048)
    for (let i = 0; i < 8; i++) {
      const input = new Float32Array(128);
      processor.process([[input]], [[]], {});
    }

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('sends a message when buffer is full (2048 samples)', () => {
    const processor = new ProcessorClass();
    const postMessage = processor.port.postMessage;

    // Feed 16 frames of 128 = 2048
    for (let i = 0; i < 16; i++) {
      const input = new Float32Array(128).fill(0.5);
      processor.process([[input]], [[]], {});
    }

    expect(postMessage).toHaveBeenCalledTimes(1);
    const sentData = postMessage.mock.calls[0][0];
    expect(sentData).toBeInstanceOf(Float32Array);
    expect(sentData.length).toBe(2048);
  });

  it('does not send partial buffers', () => {
    const processor = new ProcessorClass();
    const postMessage = processor.port.postMessage;

    // Feed 15 frames of 128 = 1920 (not 2048)
    for (let i = 0; i < 15; i++) {
      const input = new Float32Array(128);
      processor.process([[input]], [[]], {});
    }

    expect(postMessage).not.toHaveBeenCalled();
  });
});
