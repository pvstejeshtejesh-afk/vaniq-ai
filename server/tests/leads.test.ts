import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createActiveEmployee, createBusiness, registerUser, testApp,
} from './helpers.js';

async function setup() {
  const { app, store } = testApp();
  const { cookie } = await registerUser(app);
  const business = await createBusiness(app, cookie);
  const employee = await createActiveEmployee(app, cookie);
  return { app, store, cookie, business, employee };
}

describe('leads', () => {
  it('creates a lead and normalizes the phone number', async () => {
    const { app, cookie } = await setup();
    const res = await request(app)
      .post('/api/leads')
      .set('Cookie', cookie)
      .send({ name: 'Rahul', phone: '+91 98765 43210', consent: 'granted' });
    expect(res.status).toBe(201);
    expect(res.body.lead.phone).toBe('+919876543210');
  });

  it('rejects an invalid phone number', async () => {
    const { app, cookie } = await setup();
    const res = await request(app)
      .post('/api/leads')
      .set('Cookie', cookie)
      .send({ name: 'Bad', phone: '12345', consent: 'granted' });
    expect(res.status).toBe(400);
  });

  it('prevents duplicate leads for the same phone', async () => {
    const { app, cookie } = await setup();
    await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'R', phone: '9876543210', consent: 'granted' });
    const dup = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'R2', phone: '9876543210', consent: 'granted' });
    expect(dup.status).toBe(409);
  });

  it('marks a lead opted-out via the opt-out endpoint', async () => {
    const { app, cookie } = await setup();
    const lead = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'Opt', phone: '9876500001', consent: 'granted' });
    const res = await request(app).patch(`/api/leads/${lead.body.lead.id}/optout`).set('Cookie', cookie);
    expect(res.body.lead.optedOut).toBe(true);
    expect(res.body.lead.status).toBe('opted_out');
  });
});

describe('consent and calling eligibility', () => {
  it('refuses to call an opted-out lead', async () => {
    const { app, cookie } = await setup();
    const lead = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'No', phone: '9876500002', consent: 'granted' });
    await request(app).patch(`/api/leads/${lead.body.lead.id}/optout`).set('Cookie', cookie);

    const call = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.body.lead.id, employeeId: (await getEmp(app, cookie)) });
    expect(call.status).toBe(400);
  });

  it('refuses to call a lead without recorded consent', async () => {
    const { app, cookie } = await setup();
    const lead = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'Unknown', phone: '9876500003', consent: 'unknown' });
    const call = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.body.lead.id, employeeId: await getEmp(app, cookie) });
    expect(call.status).toBe(400);
  });
});

async function getEmp(app: ReturnType<typeof testApp>['app'], cookie: string) {
  const res = await request(app).get('/api/employees').set('Cookie', cookie);
  return res.body.employees[0].id;
}
