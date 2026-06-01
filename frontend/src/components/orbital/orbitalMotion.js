export function isReducedMotionPreferred(mediaQueryListFactory = globalThis.matchMedia) {
  if (typeof mediaQueryListFactory !== 'function') {
    return false;
  }

  try {
    return Boolean(mediaQueryListFactory('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}
