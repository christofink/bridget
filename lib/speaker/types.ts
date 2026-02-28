export type SpeakerLabel = 'user' | 'other' | 'unknown';

export interface SpeakerEmbedding {
  vector: Float32Array;
  timestamp: number;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  embedding: SpeakerEmbedding;
  createdAt: number;
}

/** Serializable form for localStorage persistence */
export interface SpeakerProfileJSON {
  id: string;
  name: string;
  embeddingBase64: string;
  embeddingTimestamp: number;
  createdAt: number;
}

export interface SpeakerWindow {
  startTime: number;
  endTime: number;
  label: SpeakerLabel;
  confidence: number;
}

export function serializeProfile(profile: SpeakerProfile): SpeakerProfileJSON {
  const bytes = new Uint8Array(profile.embedding.vector.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    id: profile.id,
    name: profile.name,
    embeddingBase64: btoa(binary),
    embeddingTimestamp: profile.embedding.timestamp,
    createdAt: profile.createdAt,
  };
}

export function deserializeProfile(json: SpeakerProfileJSON): SpeakerProfile {
  const binary = atob(json.embeddingBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    id: json.id,
    name: json.name,
    embedding: {
      vector: new Float32Array(bytes.buffer),
      timestamp: json.embeddingTimestamp,
    },
    createdAt: json.createdAt,
  };
}
