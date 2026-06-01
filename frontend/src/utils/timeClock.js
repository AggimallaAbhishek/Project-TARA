function pad2(value) {
  return String(value).padStart(2, '0');
}

function formatUtcTime(date) {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}Z`;
}

function formatLocalTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
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
  const date = now instanceof Date ? now : new Date(now);
  return {
    utc: formatUtcTime(date),
    local: formatLocalTime(date),
    localZoneLabel: resolveLocalZoneLabel(),
  };
}
