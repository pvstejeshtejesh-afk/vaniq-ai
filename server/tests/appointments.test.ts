import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createBusiness, registerUser, testApp } from './helpers.js';

async function setup() {
  const { app, store } = testApp();
  const { cookie } = await registerUser(app);
  await createBusiness(app, cookie);
  const lead = await request(app).post('/api/leads').set('Cookie', cookie)
    .send({ name: 'L', phone: '9876543210', consent: 'granted' });
  return { app, cookie, leadId: lead.body.lead.id };
}

const inFuture = (mins: number) => new Date(Date.now() + mins * 60000).toISOString();

describe('appointments', () => {
  it('books an appointment', async () => {
    const { app, cookie, leadId } = await setup();
    const res = await request(app).post('/api/appointments').set('Cookie', cookie)
      .send({ leadId, startsAt: inFuture(60), endsAt: inFuture(90), title: 'Site visit' });
    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe('scheduled');
  });

  it('prevents booking an overlapping slot', async () => {
    const { app, cookie, leadId } = await setup();
    await request(app).post('/api/appointments').set('Cookie', cookie)
      .send({ leadId, startsAt: inFuture(60), endsAt: inFuture(120) });
    const overlap = await request(app).post('/api/appointments').set('Cookie', cookie)
      .send({ leadId, startsAt: inFuture(90), endsAt: inFuture(150) });
    expect(overlap.status).toBe(409);
  });

  it('allows a non-overlapping slot after cancellation', async () => {
    const { app, cookie, leadId } = await setup();
    const first = await request(app).post('/api/appointments').set('Cookie', cookie)
      .send({ leadId, startsAt: inFuture(60), endsAt: inFuture(120) });
    await request(app).patch(`/api/appointments/${first.body.appointment.id}/cancel`).set('Cookie', cookie);
    const second = await request(app).post('/api/appointments').set('Cookie', cookie)
      .send({ leadId, startsAt: inFuture(60), endsAt: inFuture(120) });
    expect(second.status).toBe(201);
  });

  it('rejects an end time before start time', async () => {
    const { app, cookie, leadId } = await setup();
    const res = await request(app).post('/api/appointments').set('Cookie', cookie)
      .send({ leadId, startsAt: inFuture(90), endsAt: inFuture(60) });
    expect(res.status).toBe(400);
  });
});
