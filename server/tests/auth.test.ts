import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createBusiness, registerUser, testApp } from './helpers.js';

describe('auth', () => {
  it('registers a user and returns a session cookie', async () => {
    const { app } = testApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'asha@x.dev', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('asha@x.dev');
    expect(res.headers['set-cookie'][0]).toContain('vaniq_token');
  });

  it('rejects duplicate registration', async () => {
    const { app } = testApp();
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@x.dev', password: 'password123' });
    const dup = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@x.dev', password: 'password123' });
    expect(dup.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const { app } = testApp();
    await registerUser(app, { email: 'login@x.dev', password: 'password123' });
    const good = await request(app).post('/api/auth/login').send({ email: 'login@x.dev', password: 'password123' });
    expect(good.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: 'login@x.dev', password: 'wrongpass' });
    expect(bad.status).toBe(401);
  });

  it('gates private routes without a session', async () => {
    const { app } = testApp();
    const res = await request(app).get('/api/business');
    expect(res.status).toBe(401);
  });

  it('exposes the current user via /me', async () => {
    const { app } = testApp();
    const { cookie } = await registerUser(app);
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeTruthy();
  });
});

describe('tenant isolation', () => {
  it('prevents one business from reading another business data', async () => {
    const { app } = testApp();

    const a = await registerUser(app, { email: 'a@x.dev' });
    await createBusiness(app, a.cookie, { name: 'Alpha Realty' });

    const b = await registerUser(app, { email: 'b@x.dev' });
    await createBusiness(app, b.cookie, { name: 'Beta Realty' });

    // B creates an employee.
    const empRes = await request(app)
      .post('/api/employees')
      .set('Cookie', b.cookie)
      .send({ name: 'B-Rep', purpose: 'sales' });
    const empId = empRes.body.employee.id;

    // A cannot read B's employee.
    const read = await request(app).get(`/api/employees/${empId}`).set('Cookie', a.cookie);
    expect(read.status).toBe(404);

    // A's list is empty.
    const list = await request(app).get('/api/employees').set('Cookie', a.cookie);
    expect(list.body.employees).toHaveLength(0);
  });

  it('scopes a created business to its owner only', async () => {
    const { app } = testApp();
    const a = await registerUser(app, { email: 'owner@x.dev' });
    await createBusiness(app, a.cookie);
    const b = await registerUser(app, { email: 'other@x.dev' });
    const otherBiz = await request(app).get('/api/business').set('Cookie', b.cookie);
    // B has no business yet.
    expect(otherBiz.body.business).toBeNull();
  });
});
