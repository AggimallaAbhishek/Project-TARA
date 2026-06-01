import {
  deriveBootModuleStatus,
  generateHexTelemetry,
  shouldRunLandingBoot,
} from './landingBootUtils';

describe('landing boot utils', () => {
  it('runs boot only when motion is allowed and not in e2e mode', () => {
    expect(shouldRunLandingBoot({ isE2E: false, prefersReducedMotion: false })).toBe(true);
    expect(shouldRunLandingBoot({ isE2E: true, prefersReducedMotion: false })).toBe(false);
    expect(shouldRunLandingBoot({ isE2E: false, prefersReducedMotion: true })).toBe(false);
  });

  it('derives stable module states from progress', () => {
    expect(deriveBootModuleStatus(0, 0, 4)).toBe('pending');
    expect(deriveBootModuleStatus(12, 0, 4)).toBe('loading');
    expect(deriveBootModuleStatus(24, 0, 4)).toBe('ok');
    expect(deriveBootModuleStatus(70, 3, 4)).toBe('loading');
    expect(deriveBootModuleStatus(100, 3, 4)).toBe('ok');
  });

  it('generates uppercase hex telemetry with spacing', () => {
    const telemetry = generateHexTelemetry(16);
    expect(telemetry).toMatch(/^[0-9A-F ]+$/);
    expect(telemetry.length).toBeGreaterThanOrEqual(16);
  });
});
