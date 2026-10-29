import { newId, nowIso } from '../lib/ids.js';
import type {
  AIEmployee,
  Appointment,
  AuditLog,
  Business,
  Call,
  Integration,
  Lead,
  PasswordResetToken,
  Payment,
  User,
  Wallet,
  WalletTransaction,
  WebhookEvent,
} from '../types.js';
import type { Store } from './store.js';

function withDefaults<T extends { id: string; createdAt: string; updatedAt: string }>(
  partial: Omit<T, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string },
): T {
  const ts = nowIso();
  return { ...partial, createdAt: partial.createdAt ?? ts, updatedAt: partial.updatedAt ?? ts } as T;
}

/**
 * In-memory Store. State lives on the instance so each Store factory call
 * (e.g. per test) is fully isolated. Suitable for dev/demo/tests.
 */
export class MemoryStore implements Store {
  users = new Map<string, User>();
  businesses = new Map<string, Business>();
  employees = new Map<string, AIEmployee>();
  leads = new Map<string, Lead>();
  calls = new Map<string, Call>();
  appointments = new Map<string, Appointment>();
  wallets = new Map<string, Wallet>();
  walletTxns: WalletTransaction[] = [];
  payments = new Map<string, Payment>();
  webhookEvents: WebhookEvent[] = [];
  auditLogs: AuditLog[] = [];
  passwordResets: PasswordResetToken[] = [];
  integrations = new Map<string, Integration>();

  // Users
  async createUser(u: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const user = withDefaults<User>({ ...u, id: newId('usr') });
    this.users.set(user.id, user);
    return user;
  }
  async getUserById(id: string) {
    return this.users.get(id) ?? null;
  }
  async getUserByEmail(email: string) {
    for (const u of this.users.values()) if (u.email === email) return u;
    return null;
  }
  async updateUser(id: string, patch: Partial<User>) {
    const u = this.users.get(id);
    if (!u) return null;
    const next = { ...u, ...patch, id: u.id, updatedAt: nowIso() };
    this.users.set(id, next);
    return next;
  }

  // Businesses
  async createBusiness(b: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) {
    const biz = withDefaults<Business>({ ...b, id: newId('biz') });
    this.businesses.set(biz.id, biz);
    return biz;
  }
  async getBusinessById(id: string) {
    return this.businesses.get(id) ?? null;
  }
  async updateBusiness(id: string, patch: Partial<Business>) {
    const b = this.businesses.get(id);
    if (!b) return null;
    const next = { ...b, ...patch, id: b.id, updatedAt: nowIso() };
    this.businesses.set(id, next);
    return next;
  }

  // Employees
  async createEmployee(e: Omit<AIEmployee, 'id' | 'createdAt' | 'updatedAt'>) {
    const emp = withDefaults<AIEmployee>({ ...e, id: newId('emp') });
    this.employees.set(emp.id, emp);
    return emp;
  }
  async getEmployeeById(id: string) {
    return this.employees.get(id) ?? null;
  }
  async listEmployeesByBusiness(businessId: string) {
    return [...this.employees.values()].filter((e) => e.businessId === businessId);
  }
  async updateEmployee(id: string, patch: Partial<AIEmployee>) {
    const e = this.employees.get(id);
    if (!e) return null;
    const next = { ...e, ...patch, id: e.id, updatedAt: nowIso() };
    this.employees.set(id, next);
    return next;
  }
  async deleteEmployee(id: string) {
    return this.employees.delete(id);
  }

  // Leads
  async createLead(l: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) {
    const lead = withDefaults<Lead>({ ...l, id: newId('lead') });
    this.leads.set(lead.id, lead);
    return lead;
  }
  async getLeadById(id: string) {
    return this.leads.get(id) ?? null;
  }
  async findLeadByPhone(businessId: string, phone: string) {
    for (const l of this.leads.values())
      if (l.businessId === businessId && l.phone === phone) return l;
    return null;
  }
  async listLeadsByBusiness(businessId: string) {
    return [...this.leads.values()].filter((l) => l.businessId === businessId);
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    const l = this.leads.get(id);
    if (!l) return null;
    const next = { ...l, ...patch, id: l.id, updatedAt: nowIso() };
    this.leads.set(id, next);
    return next;
  }

  // Calls
  async createCall(c: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>) {
    const call = withDefaults<Call>({ ...c, id: newId('call') });
    this.calls.set(call.id, call);
    return call;
  }
  async getCallById(id: string) {
    return this.calls.get(id) ?? null;
  }
  async listCallsByBusiness(businessId: string) {
    return [...this.calls.values()].filter((c) => c.businessId === businessId);
  }
  async updateCall(id: string, patch: Partial<Call>) {
    const c = this.calls.get(id);
    if (!c) return null;
    const next = { ...c, ...patch, id: c.id, updatedAt: nowIso() };
    this.calls.set(id, next);
    return next;
  }

  // Appointments
  async createAppointment(a: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) {
    const appt = withDefaults<Appointment>({ ...a, id: newId('apt') });
    this.appointments.set(appt.id, appt);
    return appt;
  }
  async getAppointmentById(id: string) {
    return this.appointments.get(id) ?? null;
  }
  async listAppointmentsByBusiness(businessId: string) {
    return [...this.appointments.values()].filter((a) => a.businessId === businessId);
  }
  async updateAppointment(id: string, patch: Partial<Appointment>) {
    const a = this.appointments.get(id);
    if (!a) return null;
    const next = { ...a, ...patch, id: a.id, updatedAt: nowIso() };
    this.appointments.set(id, next);
    return next;
  }

  // Wallet
  async getWallet(businessId: string) {
    return this.wallets.get(businessId) ?? null;
  }
  async ensureWallet(businessId: string) {
    let w = this.wallets.get(businessId);
    if (!w) {
      w = withDefaults<Wallet>({ businessId, balancePaise: 0, id: newId('wal') });
      this.wallets.set(businessId, w);
    }
    return w;
  }
  async updateWallet(businessId: string, patch: Partial<Wallet>) {
    const w = this.wallets.get(businessId);
    if (!w) return null;
    const next = { ...w, ...patch, businessId, updatedAt: nowIso() };
    this.wallets.set(businessId, next);
    return next;
  }
  async createWalletTransaction(t: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const txn = withDefaults<WalletTransaction>({ ...t, id: newId('wtx') });
    this.walletTxns.push(txn);
    return txn;
  }
  async listWalletTransactions(businessId: string) {
    return this.walletTxns.filter((t) => t.businessId === businessId);
  }

  // Payments
  async createPayment(p: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    const pay = withDefaults<Payment>({ ...p, id: newId('pay') });
    this.payments.set(pay.id, pay);
    return pay;
  }
  async getPaymentByOrderId(orderId: string) {
    for (const p of this.payments.values()) if (p.razorpayOrderId === orderId) return p;
    return null;
  }
  async updatePayment(id: string, patch: Partial<Payment>) {
    const p = this.payments.get(id);
    if (!p) return null;
    const next = { ...p, ...patch, id: p.id, updatedAt: nowIso() };
    this.payments.set(id, next);
    return next;
  }

  // Webhook events
  async getWebhookEvent(provider: string, eventId: string) {
    return this.webhookEvents.find((e) => e.provider === provider && e.eventId === eventId) ?? null;
  }
  async createWebhookEvent(e: Omit<WebhookEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    const evt = withDefaults<WebhookEvent>({ ...e, id: newId('whk') });
    this.webhookEvents.push(evt);
    return evt;
  }
  async markWebhookProcessed(id: string) {
    const e = this.webhookEvents.find((x) => x.id === id);
    if (e) e.processed = true;
  }

  // Audit
  async createAudit(a: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>) {
    const log = withDefaults<AuditLog>({ ...a, id: newId('aud') });
    this.auditLogs.push(log);
    return log;
  }

  // Password reset
  async createPasswordReset(t: Omit<PasswordResetToken, 'id' | 'createdAt' | 'updatedAt'>) {
    const tok = withDefaults<PasswordResetToken>({ ...t, id: newId('prt') });
    this.passwordResets.push(tok);
    return tok;
  }
  async findPasswordResetByTokenHash(tokenHash: string) {
    return this.passwordResets.find((t) => t.tokenHash === tokenHash) ?? null;
  }
  async markPasswordResetUsed(id: string) {
    const t = this.passwordResets.find((x) => x.id === id);
    if (t) t.used = true;
  }

  // Integrations
  async createIntegration(i: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>) {
    const integ = withDefaults<Integration>({ ...i, id: newId('int') });
    this.integrations.set(integ.id, integ);
    return integ;
  }
  async listIntegrationsByBusiness(businessId: string) {
    return [...this.integrations.values()].filter((i) => i.businessId === businessId);
  }
  async updateIntegration(id: string, patch: Partial<Integration>) {
    const i = this.integrations.get(id);
    if (!i) return null;
    const next = { ...i, ...patch, id: i.id, updatedAt: nowIso() };
    this.integrations.set(id, next);
    return next;
  }
  async deleteIntegration(id: string) {
    return this.integrations.delete(id);
  }
}
