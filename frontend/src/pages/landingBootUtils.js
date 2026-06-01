const HEX_CHARS = '0123456789ABCDEF';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function shouldRunLandingBoot({ isE2E = false, prefersReducedMotion = false } = {}) {
  return !isE2E && !prefersReducedMotion;
}

export function resolveBootDurationMs({
  minMs = 10_000,
  maxMs = 15_000,
  randomValue = Math.random(),
} = {}) {
  const normalizedMin = Math.max(0, Number(minMs) || 0);
  const normalizedMax = Math.max(normalizedMin, Number(maxMs) || normalizedMin);
  const span = normalizedMax - normalizedMin;
  if (span === 0) return normalizedMin;
  const ratio = clamp(Number(randomValue) || 0, 0, 1);
  return Math.round(normalizedMin + span * ratio);
}

export function deriveBootModuleStatus(progress, index, total) {
  const safeProgress = clamp(Number(progress) || 0, 0, 100);
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeIndex = clamp(Number(index) || 0, 0, safeTotal - 1);
  const threshold = Math.round(((safeIndex + 1) / safeTotal) * 86);

  if (safeProgress >= threshold) return 'ok';
  if (safeProgress >= Math.max(0, threshold - 18)) return 'loading';
  return 'pending';
}

export function generateHexTelemetry(length = 32) {
  const safeLength = Math.max(2, Math.floor(Number(length) || 0));
  let output = '';

  for (let idx = 0; idx < safeLength; idx += 1) {
    output += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
    if (idx % 2 === 1 && idx < safeLength - 1) {
      output += ' ';
    }
  }

  return output;
}
