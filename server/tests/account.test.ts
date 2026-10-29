import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createBusiness, registerUser, testApp } from './helpers.js';

describe('password reset', () => {
  it('issues a reset token and lets the user set a new password', async () => {
    const { app } = testApp();
    const { email } = await registerUser(app, { email: 'reset@x.dev', password: 'oldpass123' });

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);
    const token = forgot.body.devResetToken;
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newpass123' });
    expect(reset.status).toBe(200);

    // Old password fails, new one works.
    const oldLogin = await request(app).post('/api/auth/login').send({ email, password: 'oldpass123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email, password: 'newpass123' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects an invalid or reused reset token', async () => {
    const { app } = testApp();
    const { email } = await registerUser(app, { email: 'reuse@x.dev' });
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email });
    const token = forgot.body.devResetToken;

    await request(app).post('/api/auth/reset-password').send({ token, password: 'brandnew123' });
    // Reuse should fail.
    const reused = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'another123' });
    expect(reused.status).toBe(400);

    // Garbage token fails.
    const bad = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'deadbeefdeadbeefdeadbeef', password: 'another123' });
    expect(bad.status).toBe(400);
  });

  it('does not leak whether an email exists', async () => {
    const { app } = testApp();
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@x.dev' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.devResetToken).toBeUndefined();
  });
});

describe('profile & security', () => {
  it('updates the display name', async () => {
    const { app } = testApp();
    const { cookie } = await registerUser(app, { name: 'Old Name' });
    const res = await request(app).patch('/api/profile').set('Cookie', cookie).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Name');
  });

  it('changes password after verifying the current one', async () => {
    const { app } = testApp();
    const { email, cookie } = await registerUser(app, { email: 'chg@x.dev', password: 'current123' });
    const wrong = await request(app)
      .post('/api/profile/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'notit', newPassword: 'newpass123' });
    expect(wrong.status).toBe(400);

    const ok = await request(app)
      .post('/api/profile/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'current123', newPassword: 'newpass123' });
    expect(ok.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email, password: 'newpass123' });
    expect(login.status).toBe(200);
  });
});

describe('integrations', () => {
  it('creates, lists, updates and deletes an integration (scoped to business)', async () => {
    const { app } = testApp();
    const { cookie } = await registerUser(app);
    await createBusiness(app, cookie);

    const created = await request(app)
      .post('/api/integrations')
      .set('Cookie', cookie)
      .send({ provider: 'meta_ads', label: 'Meta lead ads' });
    expect(created.status).toBe(201);
    const id = created.body.integration.id;

    const list = await request(app).get('/api/integrations').set('Cookie', cookie);
    expect(list.body.integrations).toHaveLength(1);

    const patched = await request(app)
      .patch(`/api/integrations/${id}`)
      .set('Cookie', cookie)
      .send({ status: 'disconnected' });
    expect(patched.body.integration.status).toBe('disconnected');

    const del = await request(app).delete(`/api/integrations/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(200);
    const after = await request(app).get('/api/integrations').set('Cookie', cookie);
    expect(after.body.integrations).toHaveLength(0);
  });

  it('cannot touch another business integration', async () => {
    const { app } = testApp();
    const a = await registerUser(app, { email: 'ia@x.dev' });
    await createBusiness(app, a.cookie);
    const created = await request(app)
      .post('/api/integrations')
      .set('Cookie', a.cookie)
      .send({ provider: 'webhook' });

    const b = await registerUser(app, { email: 'ib@x.dev' });
    await createBusiness(app, b.cookie);
    const del = await request(app)
      .delete(`/api/integrations/${created.body.integration.id}`)
      .set('Cookie', b.cookie);
    expect(del.status).toBe(404);
  });
});

describe('csv export', () => {
  it('exports calls as CSV with a header row', async () => {
    const { app } = testApp();
    const { cookie } = await registerUser(app);
    await createBusiness(app, cookie);
    const res = await request(app).get('/api/calls/export').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.split('\n')[0]).toContain('lead_name');
  });
});
