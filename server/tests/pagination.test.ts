import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createActiveEmployee, registerUser, testApp } from './helpers.js';

async function setup() {
  const { app, store } = testApp();
  const { cookie } = await registerUser(app);
  await request(app).post('/api/business').set('Cookie', cookie).send({
    name: 'PageCo', industry: 'other', phone: '9876543210',
    callingHours: { start: '00:00', end: '23:59' },
    callingDays: [0, 1, 2, 3, 4, 5, 6],
  });
  return { app, store, cookie };
}

describe('list pagination & filtering', () => {
  it('paginates leads with total/pages metadata', async () => {
    const { app, cookie } = await setup();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/leads').set('Cookie', cookie)
        .send({ name: `Lead ${i}`, phone: `987654320${i}`, consent: 'granted' });
    }
    const page1 = await request(app).get('/api/leads?page=1&limit=2').set('Cookie', cookie);
    expect(page1.body.leads).toHaveLength(2);
    expect(page1.body.total).toBe(5);
    expect(page1.body.pages).toBe(3);

    const page3 = await request(app).get('/api/leads?page=3&limit=2').set('Cookie', cookie);
    expect(page3.body.leads).toHaveLength(1);
  });

  it('filters leads by search query', async () => {
    const { app, cookie } = await setup();
    await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'Rahul Reddy', phone: '9876543210', consent: 'granted' });
    await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'Sridevi', phone: '9876543211', consent: 'granted' });
    const res = await request(app).get('/api/leads?q=rahul').set('Cookie', cookie);
    expect(res.body.leads).toHaveLength(1);
    expect(res.body.leads[0].name).toBe('Rahul Reddy');
  });

  it('paginates calls', async () => {
    const { app, cookie } = await setup();
    const emp = await createActiveEmployee(app, cookie);
    for (let i = 0; i < 3; i++) {
      const lead = await request(app).post('/api/leads').set('Cookie', cookie)
        .send({ name: `C${i}`, phone: `98765432${20 + i}`, consent: 'granted' });
      await request(app).post('/api/calls').set('Cookie', cookie)
        .send({ leadId: lead.body.lead.id, employeeId: emp.id });
    }
    const res = await request(app).get('/api/calls?limit=2').set('Cookie', cookie);
    expect(res.body.calls).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.pages).toBe(2);
  });
});

describe('job queue', () => {
  it('processes calls through the queue and records a job id', async () => {
    const { app, cookie } = await setup();
    const emp = await createActiveEmployee(app, cookie);
    const lead = await request(app).post('/api/leads').set('Cookie', cookie)
      .send({ name: 'Q', phone: '9876543299', consent: 'granted' });
    const res = await request(app).post('/api/calls').set('Cookie', cookie)
      .send({ leadId: lead.body.lead.id, employeeId: emp.id });
    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.call.status).toBe('completed');
  });
});
