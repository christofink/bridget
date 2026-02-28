import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PWA Manifest', () => {
  const manifestPath = resolve(__dirname, '../public/manifest.webmanifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  it('returns valid JSON with required fields', () => {
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
  });

  it('display is standalone', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('name is Bridget', () => {
    expect(manifest.name).toBe('Bridget');
  });

  it('icons include 192x192 and 512x512 entries', () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });
});
