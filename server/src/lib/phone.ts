// Indian phone normalization: produce a 10-digit national number + E.164 form.
// Returns null when the input is not a plausible Indian mobile number.

export interface NormalizedPhone {
  national: string; // 10 digits, e.g. 9876543210
  e164: string; // +91XXXXXXXXXX
}

export function normalizeIndianPhone(raw: string): NormalizedPhone | null {
  if (!raw || typeof raw !== 'string') return null;
  let digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  // Indian mobile numbers start 6-9.
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return { national: digits, e164: `+91${digits}` };
}
