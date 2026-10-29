import { env } from '../config.js';
import { newId } from '../lib/ids.js';

/**
 * Telephony adapter interface. A call is only reported as placed when the
 * provider confirms. The mock adapter simulates a successful placement and
 * returns a provider call id, which the call service stores for reconciliation.
 */
export interface TelephonyAdapter {
  readonly name: string;
  /** True when the adapter never places a real call (safe to run without credentials). */
  readonly isMock: boolean;
  placeCall(input: {
    toE164: string;
    fromE164?: string;
    employeeId: string;
    language: string;
  }): Promise<{ providerCallId: string; status: 'initiating' }>;
}

export class MockTelephonyAdapter implements TelephonyAdapter {
  readonly name = 'mock';
  readonly isMock = true;
  async placeCall() {
    // Deterministic mock id. Never actually dials.
    return { providerCallId: `mockcall_${newId()}`, status: 'initiating' as const };
  }
}

export function getTelephonyAdapter(): TelephonyAdapter {
  const provider = env().TELEPHONY_PROVIDER;
  // Only mock is implemented. Live adapters require credentials + verification.
  if (provider === 'mock') return new MockTelephonyAdapter();
  return new MockTelephonyAdapter();
}
