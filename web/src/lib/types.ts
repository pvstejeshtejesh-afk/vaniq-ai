// Frontend-facing types mirroring the API responses.

export interface User {
  id: string;
  name: string;
  email: string;
  businessId: string | null;
}

export interface Business {
  id: string;
  name: string;
  industry: string;
  phone: string;
  timezone: string;
  website?: string;
  address?: string;
  onboardingComplete: boolean;
  callingHours: { start: string; end: string };
  callingDays: number[];
}

export interface QualificationField {
  key: string;
  label: string;
  type: 'text' | 'single_select' | 'multi_select' | 'number';
  options?: string[];
  required?: boolean;
}

export interface AIEmployee {
  id: string;
  name: string;
  purpose: string;
  personality: string;
  systemPrompt: string;
  languages: string[];
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

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  consent: 'granted' | 'denied' | 'unknown';
  optedOut: boolean;
  status: string;
  callCount: number;
  createdAt: string;
}

export interface CallSummary {
  requirement: string;
  answers: Record<string, string>;
  intentScore: number;
  intentBasis: string;
  qualificationResult: string;
  recommendedNextAction: string;
}

export interface Call {
  id: string;
  leadId: string;
  employeeId: string;
  status: string;
  durationSec: number;
  billableMinutes: number;
  outcome: string | null;
  intentScore: number | null;
  summary: CallSummary | null;
  transcript: { role: string; text: string; at: string }[] | null;
  createdAt: string;
  language: string | null;
}

export interface Appointment {
  id: string;
  leadId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  note: string | null;
}

export interface Analytics {
  totalLeads: number;
  callsAttempted: number;
  callsConnected: number;
  completedConversations: number;
  qualifiedLeads: number;
  appointmentsBooked: number;
  avgCallDurationSec: number;
  callSuccessRate: number;
  leadConversionRate: number;
  usagePaise: number;
  walletBalancePaise: number;
  trend: { date: string; count: number }[];
}

export interface WalletTxn {
  id: string;
  type: string;
  amountPaise: number;
  balanceAfterPaise: number;
  description: string;
  createdAt: string;
}
