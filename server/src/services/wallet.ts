import { newId, nowIso } from '../lib/ids.js';
import type { Store } from '../store/store.js';

/**
 * Wallet operations. All monetary values are integer paise.
 * Charges are idempotent per callId so retries never double-bill.
 */
export async function chargeForCall(
  store: Store,
  input: { businessId: string; callId: string; minutes: number; ratePaisePerMin: number },
): Promise<{ costPaise: number }> {
  const costPaise = Math.round(input.minutes * input.ratePaisePerMin);
  if (costPaise <= 0) return { costPaise: 0 };

  // Idempotency: skip if this call was already billed.
  const existingTxn = (await store.listWalletTransactions(input.businessId)).find(
    (t) => t.callId === input.callId && t.type === 'usage',
  );
  if (existingTxn) return { costPaise: -existingTxn.amountPaise };

  const wallet = await store.ensureWallet(input.businessId);
  const balanceAfter = wallet.balancePaise - costPaise;
  await store.updateWallet(input.businessId, { balancePaise: balanceAfter });
  await store.createWalletTransaction({
    businessId: input.businessId,
    type: 'usage',
    amountPaise: -costPaise,
    balanceAfterPaise: balanceAfter,
    description: `Call usage: ${input.minutes} min @ ₹${(input.ratePaisePerMin / 100).toFixed(2)}/min`,
    callId: input.callId,
    paymentId: null,
    idempotencyKey: newId(),
  });
  return { costPaise };
}

/** Credit the wallet after a verified payment. Idempotent per paymentId. */
export async function creditWallet(
  store: Store,
  input: { businessId: string; amountPaise: number; paymentId: string; description: string },
): Promise<{ balancePaise: number; credited: boolean }> {
  const existing = (await store.listWalletTransactions(input.businessId)).find(
    (t) => t.paymentId === input.paymentId && t.type === 'topup',
  );
  if (existing) return { balancePaise: existing.balanceAfterPaise, credited: false };

  const wallet = await store.ensureWallet(input.businessId);
  const balanceAfter = wallet.balancePaise + input.amountPaise;
  await store.updateWallet(input.businessId, { balancePaise: balanceAfter });
  await store.createWalletTransaction({
    businessId: input.businessId,
    type: 'topup',
    amountPaise: input.amountPaise,
    balanceAfterPaise: balanceAfter,
    description: input.description,
    callId: null,
    paymentId: input.paymentId,
    idempotencyKey: newId(),
  });
  return { balancePaise: balanceAfter, credited: true };
}
