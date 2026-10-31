import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { getPaymentAdapter, verifyWebhookSignature } from './adapters/payments.js';
import { env } from './config.js';
import { badRequest, conflict, forbidden, notFound, unauthorized } from './lib/errors.js';
import { hashPassword, verifyPassword } from './lib/password.js';
import { signToken } from './lib/jwt.js';
import { newId, nowIso } from './lib/ids.js';
import { normalizeIndianPhone } from './lib/phone.js';
import { paginate, parsePageQuery } from './lib/pagination.js';
import { generateResetToken, hashToken } from './lib/tokens.js';
import { requireAuth, requireBusiness, type AuthedRequest } from './middleware/auth.js';
import { asyncHandler, errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { validateBody } from './middleware/validate.js';
import { bookAppointment, cancelAppointment } from './services/appointment.js';
import { computeAnalytics } from './services/analytics.js';
import { CallProcessingService, isCallEligible } from './services/call.js';
import { JobQueue } from './services/queue.js';
import { creditWallet } from './services/wallet.js';
import type { Store } from './store/store.js';
import type { Integration, Language } from './types.js';

export const cookieName = 'vaniq_token';

// ---------- validation schemas ----------
const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const businessSchema = z.object({
  name: z.string().min(1).max(120),
  industry: z.enum([
    'real_estate',
    'clinic',
    'coaching',
    'car_dealership',
    'financial_services',
    'restaurant',
    'other',
  ]),
  phone: z.string().min(6).max(20),
  timezone: z.string().default('Asia/Kolkata'),
  website: z.string().url().optional(),
  address: z.string().max(300).optional(),
  callingHours: z
    .object({ start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) })
    .default({ start: '09:00', end: '20:00' }),
  callingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5, 6]),
});

const qualificationFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'single_select', 'multi_select', 'number']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const employeeSchema = z.object({
  name: z.string().min(1).max(80),
  purpose: z.string().min(1).max(200),
  personality: z.string().max(400).default('Warm, polite, professional'),
  systemPrompt: z.string().max(2000).default(''),
  languages: z.array(z.enum(['te', 'en', 'tenglish'])).default(['en']),
  voiceProvider: z.string().default('mock'),
  voiceId: z.string().default('default'),
  qualificationFields: z.array(qualificationFieldSchema).default([]),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  workingHours: z
    .object({ start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) })
    .nullable()
    .default(null),
  maxCallDurationSec: z.number().int().min(30).max(1800).default(180),
  escalationRules: z.array(z.string()).default([]),
  callOutcomes: z.array(z.string()).default(['qualified', 'unqualified', 'callback']),
  pricingTier: z.enum(['standard', 'premium']).default('standard'),
});

const leadSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(6).max(20),
  source: z.string().max(60).default('manual'),
  consent: z.enum(['granted', 'denied', 'unknown']).default('unknown'),
  attributes: z.record(z.string()).default({}),
});

export function createApp(store: Store) {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env().CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  // Raw body kept for webhook signature verification.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  const auth = requireAuth(store);
  const authed = requireAuth(store);

  // Job queue: processes calls with retry + idempotency (see services/queue.ts).
  const queue = new JobQueue();
  queue.register('process-call', async (payload) => {
    const { callId, employeeId, leadId } = payload as {
      callId: string;
      employeeId: string;
      leadId: string;
    };
    const [call, employee, lead] = await Promise.all([
      store.getCallById(callId),
      store.getEmployeeById(employeeId),
      store.getLeadById(leadId),
    ]);
    if (call && employee && lead) {
      await new CallProcessingService(store).processCall(call, employee, lead);
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'vaniq-api', storage: env().STORAGE });
  });

  // ================= AUTH =================
  app.post(
    '/api/auth/register',
    authLimiter,
    validateBody(registerSchema),
    asyncHandler(async (req, res) => {
      const { name, email, password } = req.body as z.infer<typeof registerSchema>;
      const existing = await store.getUserByEmail(email);
      if (existing) throw conflict('An account with that email already exists');
      const passwordHash = await hashPassword(password);
      const user = await store.createUser({ name, email, passwordHash, businessId: null });
      const token = signToken({ sub: user.id, businessId: null });
      res.cookie(cookieName, token, {
        httpOnly: true,
        sameSite: env().COOKIE_SAMESITE,
        secure: env().COOKIE_SECURE,
        maxAge: env().JWT_EXPIRES_MIN * 60 * 1000,
      });
      await store.createAudit({
        businessId: null,
        userId: user.id,
        action: 'auth.register',
        meta: { email },
      });
      res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
    }),
  );

  app.post(
    '/api/auth/login',
    authLimiter,
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.body as z.infer<typeof loginSchema>;
      const user = await store.getUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash)))
        throw unauthorized('Invalid email or password');
      const token = signToken({ sub: user.id, businessId: user.businessId });
      res.cookie(cookieName, token, {
        httpOnly: true,
        sameSite: env().COOKIE_SAMESITE,
        secure: env().COOKIE_SECURE,
        maxAge: env().JWT_EXPIRES_MIN * 60 * 1000,
      });
      await store.createAudit({
        businessId: user.businessId,
        userId: user.id,
        action: 'auth.login',
        meta: {},
      });
      res.json({
        user: { id: user.id, name: user.name, email: user.email, businessId: user.businessId },
      });
    }),
  );

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(cookieName);
    res.json({ ok: true });
  });

  app.get(
    '/api/auth/me',
    auth,
    asyncHandler(async (req: AuthedRequest, res) => {
      const user = await store.getUserById(req.userId!);
      if (!user) throw unauthorized();
      const business = user.businessId ? await store.getBusinessById(user.businessId) : null;
      res.json({
        user: { id: user.id, name: user.name, email: user.email, businessId: user.businessId },
        business,
      });
    }),
  );

  // ---------- Password reset ----------
  // Request a reset. Always returns 200 to avoid leaking which emails exist.
  app.post(
    '/api/auth/forgot-password',
    authLimiter,
    validateBody(z.object({ email: z.string().email() })),
    asyncHandler(async (req, res) => {
      const { email } = req.body as { email: string };
      const user = await store.getUserByEmail(email);
      if (user) {
        const token = generateResetToken();
        await store.createPasswordReset({
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
          used: false,
        });
        await store.createAudit({
          businessId: user.businessId,
          userId: user.id,
          action: 'auth.password_reset_requested',
          meta: {},
        });
        // No email provider is wired. In development we return the token directly
        // so the flow is testable; in production this must go via email.
        if (env().NODE_ENV !== 'production') {
          return res.json({ ok: true, devResetToken: token });
        }
      }
      res.json({ ok: true });
    }),
  );

  app.post(
    '/api/auth/reset-password',
    authLimiter,
    validateBody(z.object({ token: z.string().min(10), password: z.string().min(8).max(200) })),
    asyncHandler(async (req, res) => {
      const { token, password } = req.body as { token: string; password: string };
      const record = await store.findPasswordResetByTokenHash(hashToken(token));
      if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now())
        throw badRequest('Reset link is invalid or has expired');
      const passwordHash = await hashPassword(password);
      await store.updateUser(record.userId, { passwordHash });
      await store.markPasswordResetUsed(record.id);
      const user = await store.getUserById(record.userId);
      await store.createAudit({
        businessId: user?.businessId ?? null,
        userId: record.userId,
        action: 'auth.password_reset_completed',
        meta: {},
      });
      res.json({ ok: true });
    }),
  );

  // ---------- Profile & security ----------
  app.patch(
    '/api/profile',
    auth,
    validateBody(z.object({ name: z.string().min(1).max(100).optional() })),
    asyncHandler(async (req: AuthedRequest, res) => {
      const { name } = req.body as { name?: string };
      const updated = await store.updateUser(req.userId!, name ? { name } : {});
      await store.createAudit({
        businessId: req.businessId ?? null,
        userId: req.userId!,
        action: 'profile.update',
        meta: {},
      });
      res.json({
        user: { id: updated!.id, name: updated!.name, email: updated!.email, businessId: updated!.businessId },
      });
    }),
  );

  app.post(
    '/api/profile/change-password',
    auth,
    authLimiter,
    validateBody(
      z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(200) }),
    ),
    asyncHandler(async (req: AuthedRequest, res) => {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const user = await store.getUserById(req.userId!);
      if (!user || !(await verifyPassword(currentPassword, user.passwordHash)))
        throw badRequest('Current password is incorrect');
      const passwordHash = await hashPassword(newPassword);
      await store.updateUser(user.id, { passwordHash });
      await store.createAudit({
        businessId: user.businessId,
        userId: user.id,
        action: 'profile.password_changed',
        meta: {},
      });
      res.json({ ok: true });
    }),
  );

  // ================= BUSINESS =================
  app.post(
    '/api/business',
    auth,
    validateBody(businessSchema),
    asyncHandler(async (req: AuthedRequest, res) => {
      const user = await store.getUserById(req.userId!);
      if (user?.businessId) throw conflict('Business already created for this account');
      const body = req.body as z.infer<typeof businessSchema>;
      const phone = normalizeIndianPhone(body.phone);
      if (!phone) throw badRequest('Enter a valid Indian mobile number');
      const business = await store.createBusiness({
        ownerId: req.userId!,
        name: body.name,
        industry: body.industry,
        timezone: body.timezone,
        website: body.website,
        address: body.address,
        callingHours: body.callingHours,
        callingDays: body.callingDays,
        phone: phone.e164,
        onboardingComplete: true,
        minimumBalancePaise: env().DEFAULT_MIN_BALANCE_PAISE,
        lowBalanceAlertPaise: env().DEFAULT_MIN_BALANCE_PAISE,
      });
      await store.updateUser(req.userId!, { businessId: business.id });
      await store.ensureWallet(business.id);
      await store.createAudit({
        businessId: business.id,
        userId: req.userId!,
        action: 'business.create',
        meta: { name: business.name },
      });
      res.status(201).json({ business });
    }),
  );

  app.get(
    '/api/business',
    auth,
    asyncHandler(async (req: AuthedRequest, res) => {
      const business = req.businessId ? await store.getBusinessById(req.businessId) : null;
      res.json({ business: business ?? null });
    }),
  );

  app.patch(
    '/api/business',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const patch = req.body as Record<string, unknown>;
      const updated = await store.updateBusiness(req.businessId!, patch);
      res.json({ business: updated });
    }),
  );

  // ================= EMPLOYEES =================
  app.get(
    '/api/employees',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const employees = await store.listEmployeesByBusiness(req.businessId!);
      res.json({ employees });
    }),
  );

  app.post(
    '/api/employees',
    auth,
    requireBusiness,
    validateBody(employeeSchema),
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = req.body as z.infer<typeof employeeSchema>;
      const employee = await store.createEmployee({
        businessId: req.businessId!,
        name: body.name,
        purpose: body.purpose,
        personality: body.personality,
        systemPrompt: body.systemPrompt,
        languages: body.languages as Language[],
        voiceProvider: body.voiceProvider,
        voiceId: body.voiceId,
        qualificationFields: body.qualificationFields,
        faqs: body.faqs,
        workingHours: body.workingHours,
        maxCallDurationSec: body.maxCallDurationSec,
        escalationRules: body.escalationRules,
        callOutcomes: body.callOutcomes,
        pricingTier: body.pricingTier,
        status: 'draft',
      });
      await store.createAudit({
        businessId: req.businessId!,
        userId: req.userId!,
        action: 'employee.create',
        meta: { employeeId: employee.id },
      });
      res.status(201).json({ employee });
    }),
  );

  app.get(
    '/api/employees/:id',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const employee = await store.getEmployeeById(req.params.id);
      if (!employee || employee.businessId !== req.businessId) throw notFound('Employee not found');
      res.json({ employee });
    }),
  );

  app.patch(
    '/api/employees/:id',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const employee = await store.getEmployeeById(req.params.id);
      if (!employee || employee.businessId !== req.businessId) throw notFound('Employee not found');
      const { status, ...patch } = req.body as Record<string, unknown>;
      let updated = await store.updateEmployee(employee.id, patch);
      if (status && ['active', 'paused', 'draft'].includes(status as string)) {
        updated = await store.updateEmployee(employee.id, { status: status as never });
      }
      res.json({ employee: updated });
    }),
  );

  app.delete(
    '/api/employees/:id',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const employee = await store.getEmployeeById(req.params.id);
      if (!employee || employee.businessId !== req.businessId) throw notFound('Employee not found');
      await store.deleteEmployee(employee.id);
      res.json({ ok: true });
    }),
  );

  // ================= LEADS =================
  app.get(
    '/api/leads',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const { page, limit, q } = parsePageQuery(req.query as Record<string, unknown>);
      let leads = await store.listLeadsByBusiness(req.businessId!);
      if (q) {
        leads = leads.filter((l) =>
          `${l.name} ${l.phone} ${l.status}`.toLowerCase().includes(q),
        );
      }
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      if (status && status !== 'all') {
        leads = leads.filter((l) => (status === 'opted_out' ? l.optedOut : l.status === status));
      }
      leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const result = paginate(leads, page, limit);
      res.json({ leads: result.items, total: result.total, page: result.page, pages: result.pages });
    }),
  );

  app.post(
    '/api/leads',
    auth,
    requireBusiness,
    validateBody(leadSchema),
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = req.body as z.infer<typeof leadSchema>;
      const phone = normalizeIndianPhone(body.phone);
      if (!phone) throw badRequest('Enter a valid Indian mobile number');

      const existing = await store.findLeadByPhone(req.businessId!, phone.e164);
      if (existing) throw conflict('A lead with this phone number already exists');

      const lead = await store.createLead({
        businessId: req.businessId!,
        name: body.name,
        phone: phone.e164,
        source: body.source,
        consent: body.consent,
        optedOut: body.consent === 'denied',
        status: body.consent === 'denied' ? 'opted_out' : 'new',
        lastCallId: null,
        callCount: 0,
        nextEligibleAt: null,
        attributes: body.attributes,
      });
      res.status(201).json({ lead });
    }),
  );

  app.patch(
    '/api/leads/:id/optout',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const lead = await store.getLeadById(req.params.id);
      if (!lead || lead.businessId !== req.businessId) throw notFound('Lead not found');
      const updated = await store.updateLead(lead.id, {
        optedOut: true,
        consent: 'denied',
        status: 'opted_out',
      });
      await store.createAudit({
        businessId: req.businessId!,
        userId: req.userId!,
        action: 'lead.optout',
        meta: { leadId: lead.id },
      });
      res.json({ lead: updated });
    }),
  );

  // ================= CALLS =================
  app.get(
    '/api/calls',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const { page, limit, q } = parsePageQuery(req.query as Record<string, unknown>);
      let calls = await store.listCallsByBusiness(req.businessId!);
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      if (status && status !== 'all') calls = calls.filter((c) => c.status === status);
      if (q) {
        calls = calls.filter((c) =>
          `${c.outcome ?? ''} ${c.summary?.requirement ?? ''} ${c.status}`.toLowerCase().includes(q),
        );
      }
      calls.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const result = paginate(calls, page, limit);
      res.json({ calls: result.items, total: result.total, page: result.page, pages: result.pages });
    }),
  );

  // CSV export — must be registered before /api/calls/:id.
  app.get(
    '/api/calls/export',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const calls = (await store.listCallsByBusiness(req.businessId!)).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const leads = await store.listLeadsByBusiness(req.businessId!);
      const leadName = (id: string) => leads.find((l) => l.id === id)?.name ?? '';
      const leadPhone = (id: string) => leads.find((l) => l.id === id)?.phone ?? '';
      const employees = await store.listEmployeesByBusiness(req.businessId!);
      const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? '';

      const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = [
        'date', 'lead_name', 'lead_phone', 'ai_employee', 'status', 'duration_sec',
        'billable_minutes', 'outcome', 'intent_score', 'language', 'next_action',
      ];
      const rows = calls.map((c) =>
        [
          c.createdAt, leadName(c.leadId), leadPhone(c.leadId), empName(c.employeeId),
          c.status, c.durationSec, c.billableMinutes, c.outcome ?? '', c.intentScore ?? '',
          c.language ?? '', c.nextAction ?? '',
        ].map(escape).join(','),
      );
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="vaniq-calls.csv"');
      res.send(csv);
    }),
  );

  app.get(
    '/api/calls/:id',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const call = await store.getCallById(req.params.id);
      if (!call || call.businessId !== req.businessId) throw notFound('Call not found');
      res.json({ call });
    }),
  );

  app.post(
    '/api/calls',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const { leadId, employeeId, idempotencyKey } = req.body as {
        leadId: string;
        employeeId: string;
        idempotencyKey?: string;
      };
      const lead = await store.getLeadById(leadId);
      if (!lead || lead.businessId !== req.businessId) throw notFound('Lead not found');
      const employee = await store.getEmployeeById(employeeId);
      if (!employee || employee.businessId !== req.businessId)
        throw notFound('Employee not found');

      const service = new CallProcessingService(store);

      // Idempotency: if this key was already used, return the prior call
      // regardless of the lead's current state (prevents double-calling).
      if (idempotencyKey) {
        const existing = (
          await store.listCallsByBusiness(req.businessId!)
        ).find((c) => c.idempotencyKey === idempotencyKey);
        if (existing) return res.status(200).json({ call: existing, idempotent: true });
      }

      if (employee.status !== 'active')
        throw badRequest('AI employee must be active before placing calls');

      const business = await store.getBusinessById(req.businessId!);
      const eligibility = isCallEligible({ lead, business: business! });
      if (!eligibility.eligible) throw badRequest(`Cannot call lead: ${eligibility.reason}`);

      const queued = await service.queueCall({
        businessId: req.businessId!,
        leadId,
        employeeId,
        idempotencyKey,
      });
      // Route through the job queue (retry + idempotency). enqueueAndWait keeps
      // the response synchronous for this in-process queue; a multi-node deploy
      // would return the queued call immediately and let workers pick it up.
      const result = await queue.enqueueAndWait({
        id: queued.id,
        queueName: 'process-call',
        payload: { callId: queued.id, employeeId, leadId },
        idempotencyKey: queued.idempotencyKey,
      });
      const processed = (await store.getCallById(queued.id)) ?? queued;
      if (!result.ok && processed.status === 'queued') {
        await store.updateCall(processed.id, { status: 'failed', nextAction: result.error ?? 'Processing failed' });
      }
      res.status(201).json({ call: await store.getCallById(queued.id), jobId: result.jobId });
    }),
  );

  // ================= APPOINTMENTS =================
  app.get(
    '/api/appointments',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const appointments = await store.listAppointmentsByBusiness(req.businessId!);
      res.json({ appointments });
    }),
  );

  app.post(
    '/api/appointments',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = req.body as {
        leadId: string;
        startsAt: string;
        endsAt: string;
        title?: string;
        callId?: string;
        employeeId?: string;
        note?: string;
      };
      const lead = await store.getLeadById(body.leadId);
      if (!lead || lead.businessId !== req.businessId) throw notFound('Lead not found');
      const business = await store.getBusinessById(req.businessId!);
      const appointment = await bookAppointment(store, {
        businessId: req.businessId!,
        leadId: body.leadId,
        callId: body.callId ?? null,
        employeeId: body.employeeId ?? null,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        timezone: business?.timezone ?? 'Asia/Kolkata',
        title: body.title ?? 'Follow-up',
        note: body.note ?? null,
      });
      res.status(201).json({ appointment });
    }),
  );

  app.patch(
    '/api/appointments/:id/cancel',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const appointment = await cancelAppointment(store, req.businessId!, req.params.id);
      res.json({ appointment });
    }),
  );

  // ================= ANALYTICS =================
  app.get(
    '/api/analytics',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const stats = await computeAnalytics(store, req.businessId!, { from, to });
      res.json({ analytics: stats });
    }),
  );

  // ================= WALLET =================
  app.get(
    '/api/wallet',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const wallet = await store.ensureWallet(req.businessId!);
      const transactions = (await store.listWalletTransactions(req.businessId!))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 100);
      res.json({ wallet, transactions });
    }),
  );

  // ================= PAYMENTS =================
  app.post(
    '/api/payments/create-order',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const { amountPaise } = req.body as { amountPaise: number };
      if (!Number.isInteger(amountPaise) || amountPaise < 100)
        throw badRequest('amountPaise must be an integer >= 100 (₹1)');
      const adapter = getPaymentAdapter();
      const order = await adapter.createOrder({
        amountPaise,
        receipt: newId('rcpt'),
      });
      const payment = await store.createPayment({
        businessId: req.businessId!,
        razorpayOrderId: order.orderId,
        amountPaise,
        status: 'created',
        idempotencyKey: newId(),
      });
      res.status(201).json({
        payment,
        orderId: order.orderId,
        isMock: adapter.isMock,
        keyId: env().RAZORPAY_KEY_ID ?? null,
      });
    }),
  );

  app.post(
    '/api/payments/confirm',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const { orderId, paymentId, signature } = req.body as {
        orderId: string;
        paymentId: string;
        signature: string;
      };
      const payment = await store.getPaymentByOrderId(orderId);
      if (!payment || payment.businessId !== req.businessId) throw notFound('Order not found');
      if (payment.status === 'paid') {
        const w = await store.ensureWallet(req.businessId!);
        return res.json({ payment, alreadyPaid: true, balancePaise: w.balancePaise });
      }

      const adapter = getPaymentAdapter();
      const valid = adapter.verifyPaymentSignature({ orderId, paymentId, signature });
      if (!valid) throw forbidden('Payment signature verification failed');

      await store.updatePayment(payment.id, { status: 'paid' });
      const result = await creditWallet(store, {
        businessId: req.businessId!,
        amountPaise: payment.amountPaise,
        paymentId: payment.id,
        description: `Wallet top-up (₹${(payment.amountPaise / 100).toFixed(2)})`,
      });
      await store.createAudit({
        businessId: req.businessId!,
        userId: req.userId!,
        action: 'payment.confirmed',
        meta: { orderId, amountPaise: payment.amountPaise },
      });
      res.json({ payment: await store.getPaymentByOrderId(orderId), balancePaise: result.balancePaise });
    }),
  );

  // ================= INTEGRATIONS =================
  const integrationSchema = z.object({
    provider: z.enum(['meta_ads', 'website_form', 'webhook', 'whatsapp', 'google_sheets', 'crm']),
    label: z.string().min(1).max(80).default('Integration'),
    config: z.record(z.string()).default({}),
  });

  app.get(
    '/api/integrations',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const integrations = await store.listIntegrationsByBusiness(req.businessId!);
      res.json({ integrations });
    }),
  );

  app.post(
    '/api/integrations',
    auth,
    requireBusiness,
    validateBody(integrationSchema),
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = req.body as z.infer<typeof integrationSchema>;
      const integration = await store.createIntegration({
        businessId: req.businessId!,
        provider: body.provider,
        label: body.label,
        config: body.config,
        status: 'connected',
      });
      await store.createAudit({
        businessId: req.businessId!,
        userId: req.userId!,
        action: 'integration.create',
        meta: { provider: body.provider },
      });
      res.status(201).json({ integration });
    }),
  );

  app.patch(
    '/api/integrations/:id',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const existing = (await store.listIntegrationsByBusiness(req.businessId!)).find(
        (i) => i.id === req.params.id,
      );
      if (!existing) throw notFound('Integration not found');
      const patch = { ...(req.body as Record<string, unknown>) };
      const status = patch.status;
      delete patch.status;
      const nextStatus =
        status && ['connected', 'disconnected'].includes(String(status))
          ? { status: String(status) as 'connected' | 'disconnected' }
          : {};
      const updated = await store.updateIntegration(existing.id, {
        ...patch,
        ...nextStatus,
      } as Partial<Integration>);
      res.json({ integration: updated });
    }),
  );

  app.delete(
    '/api/integrations/:id',
    auth,
    requireBusiness,
    asyncHandler(async (req: AuthedRequest, res) => {
      const existing = (await store.listIntegrationsByBusiness(req.businessId!)).find(
        (i) => i.id === req.params.id,
      );
      if (!existing) throw notFound('Integration not found');
      await store.deleteIntegration(existing.id);
      await store.createAudit({
        businessId: req.businessId!,
        userId: req.userId!,
        action: 'integration.delete',
        meta: { provider: existing.provider },
      });
      res.json({ ok: true });
    }),
  );

  // ================= WEBHOOKS =================
  app.post(
    '/api/webhooks/razorpay',
    asyncHandler(async (req, res) => {
      const signature = String(req.headers['x-razorpay-signature'] ?? '');
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '';
      const eventId = String(req.headers['x-razorpay-event-id'] ?? newId('evt'));

      const valid = verifyWebhookSignature(rawBody, signature);
      const existing = await store.getWebhookEvent('razorpay', eventId);
      if (existing && existing.processed) return res.json({ ok: true, duplicate: true });

      const evt = existing ?? (await store.createWebhookEvent({
        provider: 'razorpay',
        eventId,
        processed: false,
        signatureValid: valid,
      }));

      if (!valid) return res.status(400).json({ error: { code: 'invalid_signature', message: 'Invalid webhook signature' } });

      // Idempotent credit based on embedded order/payment ids if present.
      const body = req.body as {
        payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
      };
      const orderId = body.payload?.payment?.entity?.order_id;
      if (orderId) {
        const payment = await store.getPaymentByOrderId(orderId);
        if (payment && payment.status !== 'paid') {
          await store.updatePayment(payment.id, { status: 'paid' });
          await creditWallet(store, {
            businessId: payment.businessId,
            amountPaise: payment.amountPaise,
            paymentId: payment.id,
            description: `Wallet top-up via webhook (₹${(payment.amountPaise / 100).toFixed(2)})`,
          });
        }
      }
      await store.markWebhookProcessed(evt.id);
      res.json({ ok: true });
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
