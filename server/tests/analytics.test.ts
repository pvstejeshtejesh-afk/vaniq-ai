import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createActiveEmployee, registerUser, testApp } from './helpers.js';

async function setup() {
  const { app, store } = testApp();
  const { cookie } = await registerUser(app);
  await request(app).post('/api/business').set('Cookie', cookie).send({
    name: 'AnalyticsCo', industry: 'coaching', phone: '9876543210',
    callingHours: { start: '00:00', end: '23:59' },
    callingDays: [0, 1, 2, 3, 4, 5, 6],
  });
  const employee = await createActiveEmployee(app, cookie);
  return { app, cookie, employee };
}

describe('analytics', () => {
  it('returns zeros for a business with no activity', async () => {
    const { app, cookie } = await setup();
    const res = await request(app).get('/api/analytics').set('Cookie', cookie);
    expect(res.body.analytics.totalLeads).toBe(0);
    expect(res.body.analytics.callsAttempted).toBe(0);
    expect(res.body.analytics.callSuccessRate).toBe(0);
    expect(Array.isArray(res.body.analytics.trend)).toBe(true);
  });

  it('computes real metrics from actual records', async () => {
    const { app, cookie, employee } = await setup();
    // 2 leads, 1 call.
    const l1 = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'A', phone: '9876543210', consent: 'granted' });
    await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'B', phone: '9876543211', consent: 'granted' });
    await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: l1.body.lead.id, employeeId: employee.id });

    const res = await request(app).get('/api/analytics').set('Cookie', cookie);
    const a = res.body.analytics;
    expect(a.totalLeads).toBe(2);
    expect(a.callsAttempted).toBe(1);
    expect(a.callsConnected).toBe(1);
    expect(a.completedConversations).toBe(1);
    expect(a.leadConversionRate).toBeGreaterThanOrEqual(0);
    expect(a.callSuccessRate).toBe(1);
  });
});
