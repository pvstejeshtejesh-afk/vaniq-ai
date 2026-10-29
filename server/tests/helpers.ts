import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory.js';

/** Build an isolated app + memory store for a single test. */
export function testApp() {
  const store = new MemoryStore();
  const app = createApp(store);
  return { app, store };
}

/** Register a user and return the auth cookie string. */
export async function registerUser(
  app: ReturnType<typeof testApp>['app'],
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  const email = overrides.email ?? `user${Math.random().toString(36).slice(2)}@test.dev`;
  const res = await request(app).post('/api/auth/register').send({
    name: overrides.name ?? 'Test User',
    email,
    password: overrides.password ?? 'password123',
  });
  const cookie = res.headers['set-cookie']?.[0];
  if (!cookie) throw new Error('No cookie returned on register');
  return { cookie, email, userId: res.body.user.id as string };
}

/** Create a business for the authenticated user. */
export async function createBusiness(
  app: ReturnType<typeof testApp>['app'],
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post('/api/business')
    .set('Cookie', cookie)
    .send({
      name: 'Acme Realty',
      industry: 'real_estate',
      phone: '9876543210',
      timezone: 'Asia/Kolkata',
      ...overrides,
    });
  return res.body.business;
}

/** Create an AI employee and activate it. */
export async function createActiveEmployee(
  app: ReturnType<typeof testApp>['app'],
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  const created = await request(app)
    .post('/api/employees')
    .set('Cookie', cookie)
    .send({
      name: 'Meera',
      purpose: 'qualifying property leads',
      languages: ['en'],
      qualificationFields: [
        { key: 'property_type', label: 'Property type', type: 'text' },
        { key: 'budget_range', label: 'Budget range', type: 'text' },
      ],
      ...overrides,
    });
  const id = created.body.employee.id as string;
  await request(app).patch(`/api/employees/${id}`).set('Cookie', cookie).send({ status: 'active' });
  return (await request(app).get(`/api/employees/${id}`).set('Cookie', cookie)).body.employee;
}
