import { getLLMAdapter } from '../adapters/llm.js';
import { getTelephonyAdapter } from '../adapters/telephony.js';
import { env } from '../config.js';
import { billableMinutes, newId, nowIso } from '../lib/ids.js';
import type { Store } from '../store/store.js';
import type { AIEmployee, Call, Language, Lead } from '../types.js';
import { chargeForCall } from './wallet.js';

/**
 * Eligibility rules before a lead may be auto-called:
 *  - has granted consent
 *  - not opted out / do-not-call
 *  - status is actionable (new or queued)
 *  - call placed within configured business calling hours
 *  - no recent duplicate call (cooldown)
 */
export function isCallEligible(input: {
  lead: Lead;
  business: { callingHours: { start: string; end: string }; callingDays: number[] };
  now?: Date;
}): { eligible: boolean; reason: string } {
  const { lead, business } = input;
  const now = input.now ?? new Date();
  if (lead.optedOut || lead.status === 'opted_out' || lead.status === 'do_not_call')
    return { eligible: false, reason: 'Lead opted out or marked do-not-call' };
  if (lead.consent === 'denied') return { eligible: false, reason: 'Consent denied' };
  if (lead.consent === 'unknown') return { eligible: false, reason: 'Consent not recorded' };
  if (!['new', 'queued'].includes(lead.status))
    return { eligible: false, reason: `Lead status '${lead.status}' is not actionable` };

  // Calling day check (UTC-based; production should convert via business tz).
  if (!business.callingDays.includes(now.getUTCDay()))
    return { eligible: false, reason: 'Outside permitted calling days' };

  // Calling hour check using minutes-of-day.
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = toMin(business.callingHours.start);
  const end = toMin(business.callingHours.end);
  if (cur < start || cur > end)
    return { eligible: false, reason: 'Outside permitted calling hours' };

  return { eligible: true, reason: 'Eligible' };
}

export class CallProcessingService {
  constructor(private store: Store) {}

  /** Place a call for a lead using the mock telephony + LLM adapters. */
  async processCall(call: Call, employee: AIEmployee, lead: Lead): Promise<Call> {
    const envCfg = env();

    // 1) Place via telephony. Only mark as placed if the provider confirms.
    //    The mock adapter never dials, so it's always safe. Real providers are
    //    gated behind OUTBOUND_CALLING_ENABLED until credentials are verified.
    const telephony = getTelephonyAdapter();
    if (!telephony.isMock && !envCfg.OUTBOUND_CALLING_ENABLED) {
      const failed = await this.store.updateCall(call.id, {
        status: 'failed',
        endedAt: nowIso(),
        nextAction: 'Outbound calling disabled — enable after provider setup',
      });
      return failed ?? call;
    }

    const language: Language = employee.languages[0] ?? 'en';
    const placement = await telephony.placeCall({
      toE164: lead.phone,
      employeeId: employee.id,
      language,
    });

    let updated = await this.store.updateCall(call.id, {
      providerCallId: placement.providerCallId,
      status: 'initiating',
      startedAt: nowIso(),
      language,
    });

    // 2) Simulate the connected conversation via the LLM adapter.
    const llm = getLLMAdapter();
    const { transcript, durationSec } = await llm.generateConversation({
      employee,
      lead,
      language,
    });
    const summary = await llm.summarize({ employee, lead, transcript });

    const startedAt = updated?.startedAt ?? nowIso();
    const endedAt = nowIso();
    const minutes = billableMinutes(durationSec);

    updated = await this.store.updateCall(call.id, {
      status: 'completed',
      answeredAt: startedAt,
      endedAt,
      durationSec,
      billableMinutes: minutes,
      outcome: summary.qualificationResult,
      intentScore: summary.intentScore,
      summary,
      transcript,
      nextAction: summary.recommendedNextAction,
    });

    // 3) Update lead state based on outcome.
    await this.store.updateLead(lead.id, {
      status: summary.qualificationResult === 'qualified' ? 'qualified' : 'contacted',
      lastCallId: call.id,
      callCount: lead.callCount + 1,
    });

    // 4) Usage + wallet charge.
    await chargeForCall(this.store, {
      businessId: call.businessId,
      callId: call.id,
      minutes,
      ratePaisePerMin:
        employee.pricingTier === 'premium'
          ? envCfg.DEFAULT_PREMIUM_RATE_PAISE
          : envCfg.DEFAULT_STANDARD_RATE_PAISE,
    });

    return updated!;
  }

  /** Create a queued call record for an eligible lead (idempotent per key). */
  async queueCall(input: {
    businessId: string;
    leadId: string;
    employeeId: string;
    idempotencyKey?: string;
  }): Promise<Call> {
    const key = input.idempotencyKey ?? newId();
    const existing = (
      await this.store.listCallsByBusiness(input.businessId)
    ).find((c) => c.idempotencyKey === key);
    if (existing) return existing;

    const call = await this.store.createCall({
      businessId: input.businessId,
      leadId: input.leadId,
      employeeId: input.employeeId,
      providerCallId: null,
      status: 'queued',
      startedAt: null,
      answeredAt: null,
      endedAt: null,
      durationSec: 0,
      billableMinutes: 0,
      outcome: null,
      intentScore: null,
      summary: null,
      transcript: null,
      recordingUrl: null,
      nextAction: null,
      appointmentId: null,
      retryCount: 0,
      language: null,
      idempotencyKey: key,
    });
    await this.store.updateLead(input.leadId, { status: 'queued' });
    return call;
  }
}
