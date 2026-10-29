import mongoose from 'mongoose';
import { newId, nowIso } from '../lib/ids.js';
import type {
  AIEmployee, Appointment, AuditLog, Business, Call, Integration, Lead, PasswordResetToken,
  Payment, User, Wallet, WalletTransaction, WebhookEvent,
} from '../types.js';
import type { Store } from './store.js';

const { Schema, model } = mongoose;

// Permissive schemas — fields mirror the domain types. Using Mixed maps keeps
// the adapter flexible while indexes enforce the important lookups.

const base = { createdAt: String, updatedAt: String };

const UserSchema = new Schema(
  { _id: String, email: String, name: String, passwordHash: String, businessId: String, ...base },
  { collection: 'users' },
);
UserSchema.index({ email: 1 }, { unique: true });

const BusinessSchema = new Schema(
  { _id: String, ownerId: String, name: String, industry: String, phone: String, ...base },
  { collection: 'businesses', strict: false },
);
const EmployeeSchema = new Schema(
  { _id: String, businessId: String, ...base },
  { collection: 'employees', strict: false },
);
EmployeeSchema.index({ businessId: 1 });
const LeadSchema = new Schema(
  { _id: String, businessId: String, phone: String, ...base },
  { collection: 'leads', strict: false },
);
LeadSchema.index({ businessId: 1, phone: 1 }, { unique: true });
const CallSchema = new Schema(
  { _id: String, businessId: String, ...base },
  { collection: 'calls', strict: false },
);
CallSchema.index({ businessId: 1 });
const ApptSchema = new Schema(
  { _id: String, businessId: String, ...base },
  { collection: 'appointments', strict: false },
);
ApptSchema.index({ businessId: 1 });
const WalletSchema = new Schema(
  { _id: String, businessId: String, balancePaise: Number, ...base },
  { collection: 'wallets' },
);
WalletSchema.index({ businessId: 1 }, { unique: true });
const WalletTxnSchema = new Schema(
  { _id: String, businessId: String, ...base },
  { collection: 'wallet_transactions', strict: false },
);
WalletTxnSchema.index({ businessId: 1 });
const PaymentSchema = new Schema(
  { _id: String, businessId: String, razorpayOrderId: String, ...base },
  { collection: 'payments' },
);
PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
const WebhookSchema = new Schema(
  { _id: String, provider: String, eventId: String, ...base },
  { collection: 'webhook_events' },
);
WebhookSchema.index({ provider: 1, eventId: 1 }, { unique: true });
const AuditSchema = new Schema(
  { _id: String, businessId: String, ...base },
  { collection: 'audit_logs', strict: false },
);
const PasswordResetSchema = new Schema(
  { _id: String, userId: String, tokenHash: String, expiresAt: String, used: Boolean, ...base },
  { collection: 'password_resets' },
);
PasswordResetSchema.index({ tokenHash: 1 }, { unique: true });
const IntegrationSchema = new Schema(
  { _id: String, businessId: String, ...base },
  { collection: 'integrations', strict: false },
);
IntegrationSchema.index({ businessId: 1 });

const UserModel = model('VaniqUser', UserSchema);
const BusinessModel = model('VaniqBusiness', BusinessSchema);
const EmployeeModel = model('VaniqEmployee', EmployeeSchema);
const LeadModel = model('VaniqLead', LeadSchema);
const CallModel = model('VaniqCall', CallSchema);
const ApptModel = model('VaniqAppointment', ApptSchema);
const WalletModel = model('VaniqWallet', WalletSchema);
const WalletTxnModel = model('VaniqWalletTxn', WalletTxnSchema);
const PaymentModel = model('VaniqPayment', PaymentSchema);
const WebhookModel = model('VaniqWebhook', WebhookSchema);
const AuditModel = model('VaniqAudit', AuditSchema);
const PasswordResetModel = model('VaniqPasswordReset', PasswordResetSchema);
const IntegrationModel = model('VaniqIntegration', IntegrationSchema);

function doc<T>(d: unknown): T {
  const o = (d as mongoose.Document).toObject() as Record<string, unknown>;
  const { _id, __v, ...rest } = o;
  return { ...(rest as object), id: String(_id) } as T;
}

export class MongoStore implements Store {
  private constructor() {}

  static async connect(uri: string): Promise<MongoStore> {
    await mongoose.connect(uri);
    await Promise.all([
      UserModel.init(), BusinessModel.init(), EmployeeModel.init(), LeadModel.init(),
      CallModel.init(), ApptModel.init(), WalletModel.init(), WalletTxnModel.init(),
      PaymentModel.init(), WebhookModel.init(), AuditModel.init(),
      PasswordResetModel.init(), IntegrationModel.init(),
    ]);
    return new MongoStore();
  }

  private ts() {
    return { createdAt: nowIso(), updatedAt: nowIso() };
  }

  // Users
  async createUser(u: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('usr');
    await UserModel.create({ _id: id, ...u, ...this.ts() });
    return doc<User>(await UserModel.findById(id));
  }
  async getUserById(id: string) {
    const d = await UserModel.findById(id);
    return d ? doc<User>(d) : null;
  }
  async getUserByEmail(email: string) {
    const d = await UserModel.findOne({ email });
    return d ? doc<User>(d) : null;
  }
  async updateUser(id: string, patch: Partial<User>) {
    const d = await UserModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<User>(d) : null;
  }

  // Businesses
  async createBusiness(b: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('biz');
    await BusinessModel.create({ _id: id, ...b, ...this.ts() });
    return doc<Business>(await BusinessModel.findById(id));
  }
  async getBusinessById(id: string) {
    const d = await BusinessModel.findById(id);
    return d ? doc<Business>(d) : null;
  }
  async updateBusiness(id: string, patch: Partial<Business>) {
    const d = await BusinessModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<Business>(d) : null;
  }

  // Employees
  async createEmployee(e: Omit<AIEmployee, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('emp');
    await EmployeeModel.create({ _id: id, ...e, ...this.ts() });
    return doc<AIEmployee>(await EmployeeModel.findById(id));
  }
  async getEmployeeById(id: string) {
    const d = await EmployeeModel.findById(id);
    return d ? doc<AIEmployee>(d) : null;
  }
  async listEmployeesByBusiness(businessId: string) {
    return (await EmployeeModel.find({ businessId })).map((d) => doc<AIEmployee>(d));
  }
  async updateEmployee(id: string, patch: Partial<AIEmployee>) {
    const d = await EmployeeModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<AIEmployee>(d) : null;
  }
  async deleteEmployee(id: string) {
    const r = await EmployeeModel.deleteOne({ _id: id });
    return r.deletedCount === 1;
  }

  // Leads
  async createLead(l: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('lead');
    await LeadModel.create({ _id: id, ...l, ...this.ts() });
    return doc<Lead>(await LeadModel.findById(id));
  }
  async getLeadById(id: string) {
    const d = await LeadModel.findById(id);
    return d ? doc<Lead>(d) : null;
  }
  async findLeadByPhone(businessId: string, phone: string) {
    const d = await LeadModel.findOne({ businessId, phone });
    return d ? doc<Lead>(d) : null;
  }
  async listLeadsByBusiness(businessId: string) {
    return (await LeadModel.find({ businessId })).map((d) => doc<Lead>(d));
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    const d = await LeadModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<Lead>(d) : null;
  }

  // Calls
  async createCall(c: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('call');
    await CallModel.create({ _id: id, ...c, ...this.ts() });
    return doc<Call>(await CallModel.findById(id));
  }
  async getCallById(id: string) {
    const d = await CallModel.findById(id);
    return d ? doc<Call>(d) : null;
  }
  async listCallsByBusiness(businessId: string) {
    return (await CallModel.find({ businessId })).map((d) => doc<Call>(d));
  }
  async updateCall(id: string, patch: Partial<Call>) {
    const d = await CallModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<Call>(d) : null;
  }

  // Appointments
  async createAppointment(a: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('apt');
    await ApptModel.create({ _id: id, ...a, ...this.ts() });
    return doc<Appointment>(await ApptModel.findById(id));
  }
  async getAppointmentById(id: string) {
    const d = await ApptModel.findById(id);
    return d ? doc<Appointment>(d) : null;
  }
  async listAppointmentsByBusiness(businessId: string) {
    return (await ApptModel.find({ businessId })).map((d) => doc<Appointment>(d));
  }
  async updateAppointment(id: string, patch: Partial<Appointment>) {
    const d = await ApptModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<Appointment>(d) : null;
  }

  // Wallet
  async getWallet(businessId: string) {
    const d = await WalletModel.findOne({ businessId });
    return d ? doc<Wallet>(d) : null;
  }
  async ensureWallet(businessId: string) {
    const existing = await this.getWallet(businessId);
    if (existing) return existing;
    const id = newId('wal');
    await WalletModel.create({ _id: id, businessId, balancePaise: 0, ...this.ts() });
    return (await this.getWallet(businessId))!;
  }
  async updateWallet(businessId: string, patch: Partial<Wallet>) {
    const d = await WalletModel.findOneAndUpdate(
      { businessId }, { $set: { ...patch, updatedAt: nowIso() } }, { new: true },
    );
    return d ? doc<Wallet>(d) : null;
  }
  async createWalletTransaction(t: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('wtx');
    await WalletTxnModel.create({ _id: id, ...t, ...this.ts() });
    return doc<WalletTransaction>(await WalletTxnModel.findById(id));
  }
  async listWalletTransactions(businessId: string) {
    return (await WalletTxnModel.find({ businessId })).map((d) => doc<WalletTransaction>(d));
  }

  // Payments
  async createPayment(p: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('pay');
    await PaymentModel.create({ _id: id, ...p, ...this.ts() });
    return doc<Payment>(await PaymentModel.findById(id));
  }
  async getPaymentByOrderId(orderId: string) {
    const d = await PaymentModel.findOne({ razorpayOrderId: orderId });
    return d ? doc<Payment>(d) : null;
  }
  async updatePayment(id: string, patch: Partial<Payment>) {
    const d = await PaymentModel.findByIdAndUpdate(id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true });
    return d ? doc<Payment>(d) : null;
  }

  // Webhook events
  async getWebhookEvent(provider: string, eventId: string) {
    const d = await WebhookModel.findOne({ provider, eventId });
    return d ? doc<WebhookEvent>(d) : null;
  }
  async createWebhookEvent(e: Omit<WebhookEvent, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('whk');
    await WebhookModel.create({ _id: id, ...e, ...this.ts() });
    return doc<WebhookEvent>(await WebhookModel.findById(id));
  }
  async markWebhookProcessed(id: string) {
    await WebhookModel.findByIdAndUpdate(id, { $set: { processed: true } });
  }

  // Audit
  async createAudit(a: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('aud');
    await AuditModel.create({ _id: id, ...a, ...this.ts() });
    return doc<AuditLog>(await AuditModel.findById(id));
  }

  // Password reset
  async createPasswordReset(t: Omit<PasswordResetToken, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('prt');
    await PasswordResetModel.create({ _id: id, ...t, ...this.ts() });
    return doc<PasswordResetToken>(await PasswordResetModel.findById(id));
  }
  async findPasswordResetByTokenHash(tokenHash: string) {
    const d = await PasswordResetModel.findOne({ tokenHash });
    return d ? doc<PasswordResetToken>(d) : null;
  }
  async markPasswordResetUsed(id: string) {
    await PasswordResetModel.findByIdAndUpdate(id, { $set: { used: true } });
  }

  // Integrations
  async createIntegration(i: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = newId('int');
    await IntegrationModel.create({ _id: id, ...i, ...this.ts() });
    return doc<Integration>(await IntegrationModel.findById(id));
  }
  async listIntegrationsByBusiness(businessId: string) {
    return (await IntegrationModel.find({ businessId })).map((d) => doc<Integration>(d));
  }
  async updateIntegration(id: string, patch: Partial<Integration>) {
    const d = await IntegrationModel.findByIdAndUpdate(
      id, { $set: { ...patch, updatedAt: nowIso() } }, { new: true },
    );
    return d ? doc<Integration>(d) : null;
  }
  async deleteIntegration(id: string) {
    const r = await IntegrationModel.deleteOne({ _id: id });
    return r.deletedCount === 1;
  }
}
