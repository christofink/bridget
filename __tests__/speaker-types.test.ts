import {
  serializeProfile,
  deserializeProfile,
  type SpeakerProfile,
} from '@/lib/speaker/types';

describe('SpeakerProfile serialization', () => {
  it('round-trips a profile through serialize/deserialize', () => {
    const profile: SpeakerProfile = {
      id: 'test-123',
      name: 'Test User',
      embedding: {
        vector: new Float32Array([0.1, 0.2, 0.3, -0.5, 1.0]),
        timestamp: 1234567890,
      },
      createdAt: 1234567890,
    };

    const json = serializeProfile(profile);
    expect(typeof json.embeddingBase64).toBe('string');
    expect(json.id).toBe('test-123');
    expect(json.name).toBe('Test User');

    const restored = deserializeProfile(json);
    expect(restored.id).toBe(profile.id);
    expect(restored.name).toBe(profile.name);
    expect(restored.createdAt).toBe(profile.createdAt);
    expect(restored.embedding.timestamp).toBe(profile.embedding.timestamp);
    expect(restored.embedding.vector.length).toBe(profile.embedding.vector.length);

    for (let i = 0; i < profile.embedding.vector.length; i++) {
      expect(restored.embedding.vector[i]).toBeCloseTo(profile.embedding.vector[i]);
    }
  });

  it('handles empty embedding vector', () => {
    const profile: SpeakerProfile = {
      id: 'empty',
      name: 'Empty',
      embedding: { vector: new Float32Array(0), timestamp: 0 },
      createdAt: 0,
    };

    const json = serializeProfile(profile);
    const restored = deserializeProfile(json);
    expect(restored.embedding.vector.length).toBe(0);
  });
});
