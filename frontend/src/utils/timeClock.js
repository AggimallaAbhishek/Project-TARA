function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatUtcTime(date) {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}Z`;
}

function formatLocalTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatUtcOffset(date) {
  // JS offset is minutes behind UTC; invert it for display (+east / -west).
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = pad2(Math.floor(absoluteMinutes / 60));
  const minutes = pad2(absoluteMinutes % 60);
  return `UTC${sign}${hours}:${minutes}`;
}

function resolveLocalZoneLabel() {
  try {
    const rawZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (!rawZone) return 'LOCAL';
    const tail = rawZone.split('/').pop() || rawZone;
    return tail.replaceAll('_', ' ').toUpperCase();
  } catch {
    return 'LOCAL';
  }
}

export function buildClockSnapshot(now = new Date()) {
  const candidate = now instanceof Date ? now : new Date(now);
  const date = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  return {
    utc: formatUtcTime(date),
    local: formatLocalTime(date),
    localZoneLabel: resolveLocalZoneLabel(),
    localUtcOffset: formatUtcOffset(date),
  };
}
