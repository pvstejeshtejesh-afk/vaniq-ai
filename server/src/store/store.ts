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

/**
 * Repository interface. Implemented by:
 *  - MemoryStore (default, zero-dependency, used for dev/demo/tests)
 *  - MongoStore (opt-in via STORAGE=mongo)
 */
export interface Store {
  // Users
  createUser(u: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;

  // Businesses
  createBusiness(b: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business>;
  getBusinessById(id: string): Promise<Business | null>;
  updateBusiness(id: string, patch: Partial<Business>): Promise<Business | null>;

  // AI Employees
  createEmployee(e: Omit<AIEmployee, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIEmployee>;
  getEmployeeById(id: string): Promise<AIEmployee | null>;
  listEmployeesByBusiness(businessId: string): Promise<AIEmployee[]>;
  updateEmployee(id: string, patch: Partial<AIEmployee>): Promise<AIEmployee | null>;
  deleteEmployee(id: string): Promise<boolean>;

  // Leads
  createLead(l: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead>;
  getLeadById(id: string): Promise<Lead | null>;
  findLeadByPhone(businessId: string, phone: string): Promise<Lead | null>;
  listLeadsByBusiness(businessId: string): Promise<Lead[]>;
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null>;

  // Calls
  createCall(c: Omit<Call, 'id' | 'createdAt' | 'updatedAt'>): Promise<Call>;
  getCallById(id: string): Promise<Call | null>;
  listCallsByBusiness(businessId: string): Promise<Call[]>;
  updateCall(id: string, patch: Partial<Call>): Promise<Call | null>;

  // Appointments
  createAppointment(a: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment>;
  getAppointmentById(id: string): Promise<Appointment | null>;
  listAppointmentsByBusiness(businessId: string): Promise<Appointment[]>;
  updateAppointment(id: string, patch: Partial<Appointment>): Promise<Appointment | null>;

  // Wallet
  getWallet(businessId: string): Promise<Wallet | null>;
  ensureWallet(businessId: string): Promise<Wallet>;
  updateWallet(businessId: string, patch: Partial<Wallet>): Promise<Wallet | null>;
  createWalletTransaction(
    t: Omit<WalletTransaction, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<WalletTransaction>;
  listWalletTransactions(businessId: string): Promise<WalletTransaction[]>;

  // Payments
  createPayment(p: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;
  getPaymentByOrderId(orderId: string): Promise<Payment | null>;
  updatePayment(id: string, patch: Partial<Payment>): Promise<Payment | null>;

  // Webhook events (idempotency)
  getWebhookEvent(provider: string, eventId: string): Promise<WebhookEvent | null>;
  createWebhookEvent(e: Omit<WebhookEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookEvent>;
  markWebhookProcessed(id: string): Promise<void>;

  // Audit
  createAudit(a: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditLog>;

  // Password reset
  createPasswordReset(t: Omit<PasswordResetToken, 'id' | 'createdAt' | 'updatedAt'>): Promise<PasswordResetToken>;
  findPasswordResetByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markPasswordResetUsed(id: string): Promise<void>;

  // Integrations
  createIntegration(i: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>): Promise<Integration>;
  listIntegrationsByBusiness(businessId: string): Promise<Integration[]>;
  updateIntegration(id: string, patch: Partial<Integration>): Promise<Integration | null>;
  deleteIntegration(id: string): Promise<boolean>;
}
