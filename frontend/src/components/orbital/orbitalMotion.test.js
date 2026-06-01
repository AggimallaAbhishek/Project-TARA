import {
  isReducedMotionPreferred,
} from './orbitalMotion';

describe('orbitalMotion', () => {
  it('returns false when matchMedia is unavailable', () => {
    expect(isReducedMotionPreferred(undefined)).toBe(false);
  });

  it('reads reduced-motion preference when supported', () => {
    const factory = () => ({ matches: true });
    expect(isReducedMotionPreferred(factory)).toBe(true);
  });
  it('returns false when matchMedia throws', () => {
    const throwingFactory = () => {
      throw new Error('unavailable');
    };
    expect(isReducedMotionPreferred(throwingFactory)).toBe(false);
  });
});
