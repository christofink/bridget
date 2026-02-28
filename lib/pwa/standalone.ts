export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const matchMedia = window.matchMedia('(display-mode: standalone)');
  if (matchMedia.matches) return true;

  // Safari-specific property
  if ((navigator as unknown as { standalone?: boolean }).standalone) return true;

  return false;
}
