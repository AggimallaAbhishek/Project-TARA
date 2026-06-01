import { buildClockSnapshot } from './timeClock';

describe('timeClock utilities', () => {
  it('builds consistent UTC and local snapshots', () => {
    const date = new Date('2026-06-01T09:41:30Z');
    const snapshot = buildClockSnapshot(date);

    expect(snapshot.utc).toBe('09:41:30Z');
    expect(snapshot.local).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(snapshot.localZoneLabel.length).toBeGreaterThan(0);
  });
});
