import type { SpeakerEmbedding } from './types';

/**
 * Model size options. 'mobile-128' is recommended for iPad (5MB, fastest).
 * 'standard-128' (7.5MB) is a good balance if more accuracy is needed.
 */
export type ModelSize = 'mobile-128' | 'standard-128' | 'standard-256';

interface SpeakerVerificationInstance {
  initialize(model: string): Promise<void>;
  getEmbedding(audio: Float32Array): Promise<{ embedding: Float32Array; processingTime: number }>;
  compareEmbeddings(a: Float32Array, b: Float32Array): number;
  cleanup(): void;
}

let verifierInstance: SpeakerVerificationInstance | null = null;
let initPromise: Promise<void> | null = null;

async function getVerifier(model: ModelSize): Promise<SpeakerVerificationInstance> {
  if (verifierInstance) return verifierInstance;

  if (initPromise) {
    await initPromise;
    return verifierInstance!;
  }

  initPromise = (async () => {
    // Dynamic import to avoid SSR issues and enable code splitting.
    // ONNX Runtime WASM files are served from public/ via beforeFiles
    // rewrites in next.config.ts (dev) or static export (production).
    const { SpeakerVerification } = await import('@jaehyun-ko/speaker-verification');
    const instance = new SpeakerVerification();
    await instance.initialize(model);
    verifierInstance = instance as SpeakerVerificationInstance;
  })();

  await initPromise;
  return verifierInstance!;
}

/**
 * Extract a speaker embedding from a raw audio chunk.
 * Audio should be mono Float32Array at any sample rate (library handles resampling).
 */
export async function extractEmbedding(
  audio: Float32Array,
  model: ModelSize = 'mobile-128',
): Promise<SpeakerEmbedding> {
  const verifier = await getVerifier(model);
  const result = await verifier.getEmbedding(audio);
  return {
    vector: result.embedding,
    timestamp: Date.now(),
  };
}

/**
 * Compare two embeddings using the library's built-in comparison.
 * Returns a similarity score between 0 and 1.
 */
export async function compareEmbeddings(
  a: Float32Array,
  b: Float32Array,
  model: ModelSize = 'mobile-128',
): Promise<number> {
  const verifier = await getVerifier(model);
  return verifier.compareEmbeddings(a, b);
}

/** Release ONNX resources. Call when speaker ID is disabled. */
export function disposeExtractor(): void {
  verifierInstance?.cleanup();
  verifierInstance = null;
  initPromise = null;
}
