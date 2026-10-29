import { randomUUID } from 'node:crypto';

export function newId(prefix = ''): string {
  return prefix ? `${prefix}_${randomUUID()}` : randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Billable minutes: round a duration in seconds up to the next whole minute, min 0. */
export function billableMinutes(durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.max(1, Math.ceil(durationSec / 60));
}
