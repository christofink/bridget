import { requestPersistentStorage } from '@/lib/pwa/storage';
import { isStandalone } from '@/lib/pwa/standalone';

describe('requestPersistentStorage', () => {
  const originalStorage = navigator.storage;

  afterEach(() => {
    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      configurable: true,
    });
  });

  it('returns false when navigator.storage.persist is undefined', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persist: undefined },
      configurable: true,
    });

    const result = await requestPersistentStorage();
    expect(result).toBe(false);
  });

  it('calls navigator.storage.persist when available', async () => {
    const mockPersist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', {
      value: { persist: mockPersist },
      configurable: true,
    });

    const result = await requestPersistentStorage();
    expect(mockPersist).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when persist throws', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { persist: () => Promise.reject(new Error('SecurityError')) },
      configurable: true,
    });

    const result = await requestPersistentStorage();
    expect(result).toBe(false);
  });
});

describe('isStandalone', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    delete (window.navigator as any).standalone;
  });

  it('returns true for matchMedia display-mode: standalone', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    expect(isStandalone()).toBe(true);
  });

  it('returns true for navigator.standalone (Safari)', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    (window.navigator as any).standalone = true;

    expect(isStandalone()).toBe(true);
  });
});
