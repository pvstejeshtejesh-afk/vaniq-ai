import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createActiveEmployee, registerUser, testApp } from './helpers.js';

async function setup() {
  const { app, store } = testApp();
  const { cookie } = await registerUser(app);
  await request(app).post('/api/business').set('Cookie', cookie).send({
    name: 'PayCo', industry: 'clinic', phone: '9876543210',
    callingHours: { start: '00:00', end: '23:59' },
    callingDays: [0, 1, 2, 3, 4, 5, 6],
  });
  const employee = await createActiveEmployee(app, cookie);
  return { app, store, cookie, employee };
}

describe('wallet & payments', () => {
  it('starts with a zero balance and empty ledger', async () => {
    const { app, cookie } = await setup();
    const res = await request(app).get('/api/wallet').set('Cookie', cookie);
    expect(res.body.wallet.balancePaise).toBe(0);
    expect(res.body.transactions).toHaveLength(0);
  });

  it('creates a mock payment order and credits wallet on confirm', async () => {
    const { app, cookie } = await setup();
    const order = await request(app).post('/api/payments/create-order').set('Cookie', cookie)
      .send({ amountPaise: 100000 }); // ₹1000
    expect(order.status).toBe(201);
    expect(order.body.isMock).toBe(true);

    const confirm = await request(app).post('/api/payments/confirm').set('Cookie', cookie)
      .send({ orderId: order.body.orderId, paymentId: 'pay_mock_1', signature: 'sig' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.balancePaise).toBe(100000);

    // Idempotent: confirming again does not double-credit.
    const again = await request(app).post('/api/payments/confirm').set('Cookie', cookie)
      .send({ orderId: order.body.orderId, paymentId: 'pay_mock_1', signature: 'sig' });
    expect(again.body.balancePaise).toBe(100000);
  });

  it('charges usage to the wallet when a call completes', async () => {
    const { app, cookie, employee } = await setup();
    // Top up first.
    const order = await request(app).post('/api/payments/create-order').set('Cookie', cookie)
      .send({ amountPaise: 500000 });
    await request(app).post('/api/payments/confirm').set('Cookie', cookie)
      .send({ orderId: order.body.orderId, paymentId: 'p1', signature: 's' });

    const lead = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'C', phone: '9876543210', consent: 'granted' });
    await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.body.lead.id, employeeId: employee.id });

    const wallet = await request(app).get('/api/wallet').set('Cookie', cookie);
    const usage = wallet.body.transactions.filter((t: { type: string }) => t.type === 'usage');
    expect(usage.length).toBe(1);
    expect(wallet.body.wallet.balancePaise).toBeLessThan(500000);
  });
});

describe('webhooks', () => {
  it('rejects a webhook with an invalid signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
    const { app } = await setup();
    const body = JSON.stringify({ payload: {} });
    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', 'deadbeef')
      .set('x-razorpay-event-id', 'evt_1')
      .set('Content-Type', 'application/json')
      .send(body);
    expect(res.status).toBe(400);
  });

  it('accepts a webhook with a valid signature and is idempotent', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
    const { app } = await setup();
    const body = JSON.stringify({ payload: {} });
    const sig = createHmac('sha256', 'whsec_test').update(body).digest('hex');
    const send = () =>
      request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', 'evt_valid_1')
        .set('Content-Type', 'application/json')
        .send(body);
    const first = await send();
    expect(first.status).toBe(200);
    const second = await send();
    expect(second.body.duplicate).toBe(true);
  });
});
