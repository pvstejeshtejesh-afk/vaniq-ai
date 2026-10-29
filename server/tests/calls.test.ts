import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createActiveEmployee, registerUser, testApp } from './helpers.js';

/** Business with fully permissive calling window so tests are time-independent. */
async function setup() {
  const { app, store } = testApp();
  const { cookie } = await registerUser(app);
  await request(app).post('/api/business').set('Cookie', cookie).send({
    name: 'CallCo', industry: 'real_estate', phone: '9876543210',
    callingHours: { start: '00:00', end: '23:59' },
    callingDays: [0, 1, 2, 3, 4, 5, 6],
  });
  const employee = await createActiveEmployee(app, cookie);
  return { app, store, cookie, employee };
}

async function makeLead(app: ReturnType<typeof testApp>['app'], cookie: string, phone = '9876543210') {
  const res = await request(app).post('/api/leads').set('Cookie', cookie)
    .send({ name: 'Rahul', phone, consent: 'granted' });
  return res.body.lead;
}

describe('calls', () => {
  it('places a call and completes it with a summary (mock telephony)', async () => {
    const { app, cookie, employee } = await setup();
    const lead = await makeLead(app, cookie);
    const res = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.id, employeeId: employee.id });
    expect(res.status).toBe(201);
    const call = res.body.call;
    expect(call.status).toBe('completed');
    expect(call.providerCallId).toBeTruthy();
    expect(call.summary).toBeTruthy();
    expect(call.transcript.length).toBeGreaterThan(0);
    expect(call.intentScore).toBeGreaterThanOrEqual(0);
  });

  it('is idempotent for the same idempotency key (no double call)', async () => {
    const { app, cookie, employee } = await setup();
    const lead = await makeLead(app, cookie, '9876543211');
    const key = 'same-key-123';
    const first = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.id, employeeId: employee.id, idempotencyKey: key });
    const second = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.id, employeeId: employee.id, idempotencyKey: key });
    expect(second.body.call.id).toBe(first.body.call.id);
  });

  it('refuses to call with an inactive employee', async () => {
    const { app, cookie } = await setup();
    const draft = await request(app).post('/api/employees').set('Cookie', cookie)
      .send({ name: 'Draft', purpose: 'testing' });
    const lead = await makeLead(app, cookie, '9876543212');
    const res = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.id, employeeId: draft.body.employee.id });
    expect(res.status).toBe(400);
  });

  it('blocks a lead marked do-not-call after being called once', async () => {
    const { app, cookie, employee } = await setup();
    const lead = await makeLead(app, cookie, '9876543213');
    await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.id, employeeId: employee.id });
    // Lead status is now qualified/contacted — not actionable again.
    const second = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.id, employeeId: employee.id });
    expect(second.status).toBe(400);
  });
});
