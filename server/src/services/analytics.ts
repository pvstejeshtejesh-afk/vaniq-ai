import type { Store } from '../store/store.js';

export interface AnalyticsRange {
  from?: string; // ISO date
  to?: string; // ISO date
}

function within(iso: string, range: AnalyticsRange): boolean {
  const t = new Date(iso).getTime();
  if (range.from && t < new Date(range.from).getTime()) return false;
  if (range.to && t > new Date(range.to).getTime()) return false;
  return true;
}

/**
 * Compute dashboard analytics from real records (no hardcoded numbers).
 * Definitions are consistent and documented in docs/API.md.
 */
export async function computeAnalytics(store: Store, businessId: string, range: AnalyticsRange) {
  const leads = (await store.listLeadsByBusiness(businessId)).filter((l) =>
    within(l.createdAt, range),
  );
  const calls = (await store.listCallsByBusiness(businessId)).filter((c) =>
    within(c.createdAt, range),
  );
  const appointments = (await store.listAppointmentsByBusiness(businessId)).filter((a) =>
    within(a.createdAt, range),
  );

  const callsAttempted = calls.length;
  const callsConnected = calls.filter((c) =>
    ['completed', 'in_progress'].includes(c.status),
  ).length;
  const completedConversations = calls.filter((c) => c.status === 'completed').length;
  const qualifiedLeads = leads.filter((l) => l.status === 'qualified').length;
  const appointmentsBooked = appointments.filter((a) => a.status !== 'cancelled').length;

  const totalDuration = calls.reduce((s, c) => s + c.durationSec, 0);
  const avgCallDurationSec = completedConversations
    ? Math.round(totalDuration / completedConversations)
    : 0;

  const callSuccessRate = callsAttempted ? callsConnected / callsAttempted : 0;
  const leadConversionRate = leads.length ? qualifiedLeads / leads.length : 0;

  // Daily trend buckets for completed calls in range.
  const trend = buildDailyTrend(calls.filter((c) => c.status === 'completed'), range);

  const wallet = await store.getWallet(businessId);
  const usagePaise = (await store.listWalletTransactions(businessId))
    .filter((t) => t.type === 'usage' && within(t.createdAt, range))
    .reduce((s, t) => s + Math.abs(t.amountPaise), 0);

  return {
    totalLeads: leads.length,
    callsAttempted,
    callsConnected,
    completedConversations,
    qualifiedLeads,
    appointmentsBooked,
    avgCallDurationSec,
    callSuccessRate: round2(callSuccessRate),
    leadConversionRate: round2(leadConversionRate),
    usagePaise,
    walletBalancePaise: wallet?.balancePaise ?? 0,
    trend,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildDailyTrend(
  calls: { createdAt: string }[],
  range: AnalyticsRange,
): { date: string; count: number }[] {
  const end = range.to ? new Date(range.to) : new Date();
  const start = range.from
    ? new Date(range.from)
    : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  const days: { date: string; count: number }[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const date = cursor.toISOString().slice(0, 10);
    const count = calls.filter((c) => c.createdAt.slice(0, 10) === date).length;
    days.push({ date, count });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
