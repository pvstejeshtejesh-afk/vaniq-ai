// Core domain types shared across the backend.

export type ID = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export type Industry =
  | 'real_estate'
  | 'clinic'
  | 'coaching'
  | 'car_dealership'
  | 'financial_services'
  | 'restaurant'
  | 'other';

export type Language = 'te' | 'en' | 'tenglish';

export interface User extends Timestamps {
  id: ID;
  email: string;
  name: string;
  passwordHash: string;
  businessId: ID | null;
}

export interface Business extends Timestamps {
  id: ID;
  ownerId: ID;
  name: string;
  industry: Industry;
  phone: string;
  timezone: string;
  website?: string;
  address?: string;
  onboardingComplete: boolean;
  callingHours: { start: string; end: string }; // "HH:mm" in business tz
  callingDays: number[]; // 0=Sun .. 6=Sat
  minimumBalancePaise: number;
  lowBalanceAlertPaise: number;
}

export interface QualificationField {
  key: string;
  label: string;
  type: 'text' | 'single_select' | 'multi_select' | 'number';
  options?: string[];
  required?: boolean;
}

export interface AIEmployee extends Timestamps {
  id: ID;
  businessId: ID;
  name: string;
  purpose: string;
  personality: string;
  systemPrompt: string;
  languages: Language[];
  voiceProvider: string;
  voiceId: string;
  qualificationFields: QualificationField[];
  faqs: { question: string; answer: string }[];
  workingHours: { start: string; end: string } | null;
  maxCallDurationSec: number;
  escalationRules: string[];
  callOutcomes: string[];
  pricingTier: 'standard' | 'premium';
  status: 'draft' | 'active' | 'paused';
}

export type LeadStatus = 'new' | 'queued' | 'contacted' | 'qualified' | 'unqualified' | 'opted_out' | 'do_not_call';
export type LeadConsent = 'granted' | 'denied' | 'unknown';

export interface Lead extends Timestamps {
  id: ID;
  businessId: ID;
  name: string;
  phone: string; // normalized E.164-ish Indian number
  source: string;
  consent: LeadConsent;
  optedOut: boolean;
  status: LeadStatus;
  lastCallId: ID | null;
  callCount: number;
  nextEligibleAt: string | null;
  attributes: Record<string, string>;
}

export type CallStatus =
  | 'queued'
  | 'initiating'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'no_answer'
  | 'busy'
  | 'failed'
  | 'cancelled';

export interface TranscriptTurn {
  role: 'agent' | 'customer';
  text: string;
  at: string; // ISO
  lang?: Language;
}

export interface CallSummary {
  requirement: string;
  answers: Record<string, string>;
  intentScore: number; // 0-100
  intentBasis: string;
  qualificationResult: 'qualified' | 'unqualified' | 'needs_human';
  recommendedNextAction: string;
}

export interface Call extends Timestamps {
  id: ID;
  businessId: ID;
  leadId: ID;
  employeeId: ID;
  providerCallId: string | null;
  status: CallStatus;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number;
  billableMinutes: number;
  outcome: string | null;
  intentScore: number | null;
  summary: CallSummary | null;
  transcript: TranscriptTurn[] | null;
  recordingUrl: string | null;
  nextAction: string | null;
  appointmentId: ID | null;
  retryCount: number;
  language: Language | null;
  idempotencyKey: string;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment extends Timestamps {
  id: ID;
  businessId: ID;
  leadId: ID;
  callId: ID | null;
  employeeId: ID | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  timezone: string;
  status: AppointmentStatus;
  note: string | null;
  title: string;
}

export type TxnType = 'topup' | 'usage' | 'refund' | 'subscription';

export interface WalletTransaction extends Timestamps {
  id: ID;
  businessId: ID;
  type: TxnType;
  amountPaise: number; // positive credit, negative debit
  balanceAfterPaise: number;
  description: string;
  callId?: ID | null;
  paymentId?: ID | null;
  idempotencyKey: string;
}

export interface Wallet extends Timestamps {
  id: ID;
  businessId: ID;
  balancePaise: number;
}

export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';

export interface Payment extends Timestamps {
  id: ID;
  businessId: ID;
  razorpayOrderId: string;
  amountPaise: number;
  status: PaymentStatus;
  idempotencyKey: string;
}

export interface UsageRecord extends Timestamps {
  id: ID;
  businessId: ID;
  callId: ID;
  minutes: number;
  ratePaisePerMin: number;
  costPaise: number;
}

export interface WebhookEvent extends Timestamps {
  id: ID;
  provider: string;
  eventId: string;
  processed: boolean;
  signatureValid: boolean;
}

export interface AuditLog extends Timestamps {
  id: ID;
  businessId: ID | null;
  userId: ID | null;
  action: string;
  meta: Record<string, unknown>;
}

export interface PasswordResetToken extends Timestamps {
  id: ID;
  userId: ID;
  tokenHash: string;
  expiresAt: string;
  used: boolean;
}

export type IntegrationProvider =
  | 'meta_ads'
  | 'website_form'
  | 'webhook'
  | 'whatsapp'
  | 'google_sheets'
  | 'crm';

export interface Integration extends Timestamps {
  id: ID;
  businessId: ID;
  provider: IntegrationProvider;
  status: 'connected' | 'disconnected';
  config: Record<string, string>;
  label: string;
}
