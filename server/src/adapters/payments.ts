import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config.js';

/**
 * Payment adapter. Creates orders and verifies webhook/payment signatures.
 * When Razorpay credentials are absent, a clearly-marked MOCK is used so the
 * whole flow works end-to-end without real money. Amounts are integer paise.
 */
export interface PaymentAdapter {
  readonly name: string;
  readonly isMock: boolean;
  createOrder(input: { amountPaise: number; receipt: string }): Promise<{ orderId: string }>;
  verifyPaymentSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
}

export class MockPaymentAdapter implements PaymentAdapter {
  readonly name = 'razorpay-mock';
  readonly isMock = true;
  async createOrder(input: { amountPaise: number; receipt: string }) {
    return { orderId: `order_mock_${input.receipt}` };
  }
  verifyPaymentSignature() {
    return true; // mock always verifies
  }
}

export class RazorpayAdapter implements PaymentAdapter {
  readonly name = 'razorpay';
  readonly isMock = false;
  async createOrder(input: { amountPaise: number; receipt: string }) {
    // Live integration would POST to Razorpay Orders API here.
    // Kept behind the interface; requires RAZORPAY_KEY_ID/SECRET + network.
    const key = env().RAZORPAY_KEY_ID ?? '';
    return { orderId: `order_${key.slice(0, 6)}_${input.receipt}` };
  }
  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }) {
    const secret = env().RAZORPAY_KEY_SECRET ?? '';
    const expected = createHmac('sha256', secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
    } catch {
      return false;
    }
  }
}

export function getPaymentAdapter(): PaymentAdapter {
  const hasKeys = !!(env().RAZORPAY_KEY_ID && env().RAZORPAY_KEY_SECRET);
  return hasKeys ? new RazorpayAdapter() : new MockPaymentAdapter();
}

/** Verify a Razorpay webhook signature (header: x-razorpay-signature). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  // Read at call time so runtime configuration (and tests) are respected.
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
