// Fetch wrapper for the Vaniq API. Always sends cookies (session auth).
// Supports an interactive client-side Demo Mode when running on GitHub Pages
// or when testing without an active backend server.
import {
  DEMO_ANALYTICS,
  DEMO_APPOINTMENTS,
  DEMO_BUSINESS,
  DEMO_CALLS,
  DEMO_EMPLOYEES,
  DEMO_LEADS,
  DEMO_USER,
  DEMO_WALLET_TXNS,
} from './demoData';
import type { AIEmployee, Appointment, Business, Lead, User, WalletTxn } from './types';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';
export const API_BASE = BASE;

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEMO_STORAGE_KEY = 'vaniq_demo_mode';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === '1';
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(DEMO_STORAGE_KEY, '1');
  } else {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }
}

// In-memory mutable state for demo mode during interactive sessions
let demoUser: User | null = { ...DEMO_USER };
let demoBusiness: Business | null = { ...DEMO_BUSINESS };
let demoEmployees: AIEmployee[] = [...DEMO_EMPLOYEES];
let demoLeads: Lead[] = [...DEMO_LEADS];
let demoCalls = [...DEMO_CALLS];
let demoAppointments: Appointment[] = [...DEMO_APPOINTMENTS];
let demoWalletBalancePaise = 245000;
let demoTransactions: WalletTxn[] = [...DEMO_WALLET_TXNS];

function handleDemoRequest<T>(path: string, options: RequestInit = {}): T {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'http://localhost');
  const pathname = url.pathname;
  const body = options.body ? (JSON.parse(options.body as string) as Record<string, unknown>) : {};

  // Auth
  if (pathname === '/auth/me') {
    return { user: demoUser, business: demoBusiness } as unknown as T;
  }
  if (pathname === '/auth/login') {
    demoUser = { ...DEMO_USER };
    demoBusiness = { ...DEMO_BUSINESS };
    setDemoMode(true);
    return { user: demoUser, business: demoBusiness } as unknown as T;
  }
  if (pathname === '/auth/register') {
    demoUser = { id: 'usr_' + Date.now(), name: (body.name as string) || 'Demo User', email: (body.email as string) || 'demo@vaniq.ai', businessId: null };
    demoBusiness = null;
    setDemoMode(true);
    return { user: demoUser, business: null } as unknown as T;
  }
  if (pathname === '/auth/logout') {
    demoUser = null;
    demoBusiness = null;
    setDemoMode(false);
    return { ok: true } as unknown as T;
  }
  if (pathname === '/auth/forgot-password') {
    return { ok: true, devResetToken: 'demo-token-123' } as unknown as T;
  }
  if (pathname === '/auth/reset-password') {
    return { ok: true } as unknown as T;
  }

  // Business
  if (pathname === '/business') {
    if (method === 'POST') {
      demoBusiness = {
        ...DEMO_BUSINESS,
        name: (body.name as string) || 'My Business',
        industry: (body.industry as string) || 'Real Estate & Builders',
        phone: (body.phone as string) || '+91 99999 88888',
        onboardingComplete: true,
      };
      if (demoUser) demoUser.businessId = demoBusiness.id;
      return { business: demoBusiness } as unknown as T;
    }
    if (method === 'PATCH') {
      demoBusiness = { ...demoBusiness!, ...body } as Business;
      return { business: demoBusiness } as unknown as T;
    }
    return { business: demoBusiness } as unknown as T;
  }

  // Profile
  if (pathname === '/profile') {
    if (demoUser && body.name) {
      demoUser.name = body.name as string;
    }
    return { user: demoUser } as unknown as T;
  }
  if (pathname === '/profile/change-password') {
    return { ok: true } as unknown as T;
  }

  // Employees
  if (pathname === '/employees') {
    if (method === 'POST') {
      const newEmp: AIEmployee = {
        id: 'emp_' + Date.now(),
        name: (body.name as string) || 'New Assistant',
        purpose: (body.purpose as string) || 'Telecalling',
        personality: 'Polite and responsive',
        systemPrompt: 'You are a helpful telecaller.',
        languages: (body.languages as string[]) || ['te', 'en'],
        voiceProvider: 'mock',
        voiceId: 'meera-telugu-standard',
        qualificationFields: [],
        faqs: [],
        workingHours: { start: '09:00', end: '19:00' },
        maxCallDurationSec: 300,
        escalationRules: [],
        callOutcomes: ['Interested', 'Not Interested'],
        pricingTier: 'standard',
        status: 'draft',
      };
      demoEmployees.push(newEmp);
      return { employee: newEmp } as unknown as T;
    }
    return { employees: demoEmployees } as unknown as T;
  }

  if (pathname.startsWith('/employees/')) {
    const id = pathname.replace('/employees/', '');
    const emp = demoEmployees.find((e) => e.id === id) || demoEmployees[0];
    if (method === 'PATCH') {
      Object.assign(emp, body);
      return { employee: emp } as unknown as T;
    }
    if (method === 'DELETE') {
      demoEmployees = demoEmployees.filter((e) => e.id !== id);
      return { ok: true } as unknown as T;
    }
    return { employee: emp } as unknown as T;
  }

  // Leads
  if (pathname === '/leads') {
    if (method === 'POST') {
      const newLead: Lead = {
        id: 'lead_' + Date.now(),
        name: (body.name as string) || 'New Lead',
        phone: (body.phone as string) || '+91 90000 00000',
        source: (body.source as string) || 'Manual',
        consent: (body.consent as 'granted' | 'denied' | 'unknown') || 'granted',
        optedOut: false,
        status: 'New Lead',
        callCount: 0,
        createdAt: new Date().toISOString(),
      };
      demoLeads.unshift(newLead);
      return { lead: newLead } as unknown as T;
    }
    return { leads: demoLeads, total: demoLeads.length, pages: 1 } as unknown as T;
  }

  if (pathname.startsWith('/leads/') && pathname.endsWith('/optout')) {
    const id = pathname.split('/')[2];
    const lead = demoLeads.find((l) => l.id === id);
    if (lead) lead.optedOut = true;
    return { ok: true } as unknown as T;
  }

  // Calls
  if (pathname === '/calls') {
    if (method === 'POST') {
      const leadId = (body.leadId as string) || demoLeads[0].id;
      const empId = (body.employeeId as string) || demoEmployees[0].id;
      const simulatedCall = {
        id: 'call_' + Date.now(),
        leadId,
        employeeId: empId,
        status: 'completed',
        durationSec: 120,
        billableMinutes: 2,
        outcome: 'Lead Qualified',
        intentScore: 85,
        language: 'Telugu + English',
        summary: {
          requirement: 'Enquired about upcoming property venture. Confirmed high intent.',
          answers: { property_type: '3BHK', budget: '₹80L - ₹1Cr' },
          intentScore: 85,
          intentBasis: 'Interactive customer, verified readiness for site visit.',
          qualificationResult: 'Qualified',
          recommendedNextAction: 'Share brochure via WhatsApp.',
        },
        transcript: [
          { role: 'assistant', text: 'Namaskaram! Nenu Meera, Sri Sai Properties nundi.', at: '0:02' },
          { role: 'lead', text: 'Hello Meera, I want details about your new project.', at: '0:06' },
        ],
        createdAt: new Date().toISOString(),
      };
      demoCalls.unshift(simulatedCall);
      demoWalletBalancePaise -= 1000;
      demoTransactions.unshift({
        id: 'tx_' + Date.now(),
        type: 'debit',
        amountPaise: 1000,
        balanceAfterPaise: demoWalletBalancePaise,
        description: 'Simulated AI Call (2 mins)',
        createdAt: new Date().toISOString(),
      });
      return { call: simulatedCall } as unknown as T;
    }
    return { calls: demoCalls, total: demoCalls.length, pages: 1 } as unknown as T;
  }

  // Appointments
  if (pathname === '/appointments') {
    if (method === 'POST') {
      const newApt: Appointment = {
        id: 'apt_' + Date.now(),
        leadId: (body.leadId as string) || demoLeads[0].id,
        title: (body.title as string) || 'Appointment',
        startsAt: (body.startsAt as string) || new Date(Date.now() + 86400000).toISOString(),
        endsAt: (body.endsAt as string) || new Date(Date.now() + 90000000).toISOString(),
        status: 'confirmed',
        note: (body.note as string) || 'Scheduled in demo mode',
      };
      demoAppointments.unshift(newApt);
      return { appointment: newApt } as unknown as T;
    }
    return { appointments: demoAppointments } as unknown as T;
  }

  if (pathname.startsWith('/appointments/') && pathname.endsWith('/cancel')) {
    const id = pathname.split('/')[2];
    const apt = demoAppointments.find((a) => a.id === id);
    if (apt) apt.status = 'cancelled';
    return { ok: true } as unknown as T;
  }

  // Integrations
  if (pathname === '/integrations') {
    return {
      integrations: [
        { id: 'int_01', provider: 'webhook', label: 'Meta Ads Webhook', active: true, config: { url: 'https://example.com/webhook' }, createdAt: new Date().toISOString() },
        { id: 'int_02', provider: 'sheets', label: 'Google Sheets Sync', active: true, config: {}, createdAt: new Date().toISOString() },
      ],
    } as unknown as T;
  }

  // Analytics
  if (pathname.startsWith('/analytics')) {
    return { analytics: { ...DEMO_ANALYTICS, walletBalancePaise: demoWalletBalancePaise } } as unknown as T;
  }

  // Wallet
  if (pathname === '/wallet') {
    return { wallet: { balancePaise: demoWalletBalancePaise }, transactions: demoTransactions } as unknown as T;
  }

  if (pathname === '/payments/order') {
    return { orderId: 'order_mock_' + Date.now(), isMock: true } as unknown as T;
  }

  if (pathname === '/payments/confirm') {
    demoWalletBalancePaise += 100000;
    demoTransactions.unshift({
      id: 'tx_' + Date.now(),
      type: 'credit',
      amountPaise: 100000,
      balanceAfterPaise: demoWalletBalancePaise,
      description: 'Wallet top-up (Demo Mode)',
      createdAt: new Date().toISOString(),
    });
    return { ok: true, balancePaise: demoWalletBalancePaise } as unknown as T;
  }

  return {} as T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode()) {
    // Artificial slight delay for realistic feel
    await new Promise((r) => setTimeout(r, 60));
    return handleDemoRequest<T>(path, options);
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = data?.error ?? {};
      throw new ApiClientError(res.status, err.code ?? 'error', err.message ?? 'Request failed', err.details);
    }
    return data as T;
  } catch (err) {
    // If backend is not running or on static hosts like GitHub Pages, automatically fallback for auth/me
    if (path === '/auth/me' && !isDemoMode()) {
      return { user: null, business: null } as unknown as T;
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
