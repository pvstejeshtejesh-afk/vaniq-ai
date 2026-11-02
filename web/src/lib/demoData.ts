import type { AIEmployee, Analytics, Appointment, Business, Call, Lead, User, WalletTxn } from './types';

export const DEMO_USER: User = {
  id: 'usr_demo_01',
  name: 'Tejesh Pulamala',
  email: 'demo@vaniq.ai',
  businessId: 'biz_demo_01',
};

export const DEMO_BUSINESS: Business = {
  id: 'biz_demo_01',
  name: 'Sri Sai Properties & Builders',
  industry: 'Real Estate & Builders',
  phone: '+91 98765 00000',
  timezone: 'Asia/Kolkata',
  website: 'https://srisaiproperties.com',
  address: 'Hitec City, Hyderabad, Telangana 500081',
  onboardingComplete: true,
  callingHours: { start: '09:00', end: '19:00' },
  callingDays: [1, 2, 3, 4, 5, 6],
};

export const DEMO_EMPLOYEES: AIEmployee[] = [
  {
    id: 'emp_01',
    name: 'Meera',
    purpose: 'Lead Qualification & Site Visit Booking',
    personality: 'Warm, professional, native Telugu & English speaker with respectful tone.',
    systemPrompt:
      'You are Meera, an AI telecalling assistant for Sri Sai Properties in Hyderabad. Greet leads warmly in Telugu and switch to English seamlessly if they reply in English. Qualify their budget, BHK preference, location, and book weekend site visits.',
    languages: ['te', 'en', 'te-IN'],
    voiceProvider: 'mock',
    voiceId: 'meera-telugu-standard',
    qualificationFields: [
      { key: 'property_type', label: 'Property Type', type: 'single_select', options: ['2BHK', '3BHK', 'Villa', 'Plot'], required: true },
      { key: 'budget', label: 'Budget Range', type: 'single_select', options: ['< ₹60L', '₹60L - ₹1Cr', '₹1Cr - ₹2Cr', '> ₹2Cr'], required: true },
      { key: 'location', label: 'Preferred Location', type: 'text', required: true },
      { key: 'visit_day', label: 'Preferred Visit Day', type: 'single_select', options: ['Saturday Morning', 'Sunday Morning', 'Sunday Afternoon'], required: false },
    ],
    faqs: [
      { question: 'Where is the venture located?', answer: 'Our premium gated community is in Gachibowli, just 10 mins from Financial District.' },
      { question: 'Is bank loan approved?', answer: 'Yes, pre-approved by SBI, HDFC, and ICICI with 80% financing available.' },
    ],
    workingHours: { start: '09:00', end: '19:00' },
    maxCallDurationSec: 300,
    escalationRules: ['Customer asks to speak with owner/manager', 'High-value customer > ₹2Cr'],
    callOutcomes: ['Site Visit Booked', 'Follow Up Required', 'Not Interested', 'Call Dropped'],
    pricingTier: 'standard',
    status: 'active',
  },
  {
    id: 'emp_02',
    name: 'Swara',
    purpose: 'Instant Lead Response (Under 30s)',
    personality: 'Fast-paced, energetic, highly polite and concise.',
    systemPrompt:
      'You are Swara. When a new digital ad lead lands, call immediately, confirm interest in the Gachibowli venture, and capture their requirement.',
    languages: ['te', 'en'],
    voiceProvider: 'mock',
    voiceId: 'swara-express',
    qualificationFields: [
      { key: 'interest_level', label: 'Interest Level', type: 'single_select', options: ['Immediate purchase (30 days)', 'Next 3-6 months', 'Just exploring'] },
    ],
    faqs: [],
    workingHours: { start: '09:00', end: '20:00' },
    maxCallDurationSec: 180,
    escalationRules: ['Immediate purchase ready'],
    callOutcomes: ['Qualified Hot Lead', 'Nurture Lead', 'Wrong Number'],
    pricingTier: 'standard',
    status: 'active',
  },
];

export const DEMO_LEADS: Lead[] = [
  {
    id: 'lead_01',
    name: 'Rahul Verma',
    phone: '+91 98765 43210',
    source: 'Meta Ad (Gachibowli 3BHK)',
    consent: 'granted',
    optedOut: false,
    status: 'Qualified · Visit Booked',
    callCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'lead_02',
    name: 'Kavitha Reddy',
    phone: '+91 99887 76655',
    source: 'Website Landing Page',
    consent: 'granted',
    optedOut: false,
    status: 'Appointment Scheduled',
    callCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'lead_03',
    name: 'Suresh Naidu',
    phone: '+91 91234 56789',
    source: '99acres Portal',
    consent: 'granted',
    optedOut: false,
    status: 'Follow-up Needed',
    callCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'lead_04',
    name: 'Ananya Sharma',
    phone: '+91 98451 22334',
    source: 'Instagram Lead Form',
    consent: 'granted',
    optedOut: false,
    status: 'New Lead',
    callCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
];

export const DEMO_CALLS: Call[] = [
  {
    id: 'call_01',
    leadId: 'lead_01',
    employeeId: 'emp_01',
    status: 'completed',
    durationSec: 142,
    billableMinutes: 3,
    outcome: 'Site Visit Booked',
    intentScore: 88,
    language: 'Telugu + English',
    summary: {
      requirement: 'Looking for a 3BHK west-facing unit in Gachibowli, budget ₹90L - ₹1.1Cr.',
      answers: {
        property_type: '3BHK',
        budget: '₹60L - ₹1Cr',
        location: 'Gachibowli',
        visit_day: 'Sunday Morning',
      },
      intentScore: 88,
      intentBasis: 'Specific timeline, clear budget, eagerly confirmed site visit for Sunday 11 AM.',
      qualificationResult: 'Passed (Hot Buyer)',
      recommendedNextAction: 'Send location pin and executive contact on WhatsApp.',
    },
    transcript: [
      { role: 'assistant', text: 'Namaskaram Rahul garu! Nenu Meera, Sri Sai Properties nundi matladuthunnanu. Meeru maa Gachibowli project kosam enquiry submit chesaru kada?', at: '0:02' },
      { role: 'lead', text: 'Yes, Meera. I was looking for a 3BHK there.', at: '0:08' },
      { role: 'assistant', text: 'Chala santhosham sir! Gachibowli lo maa 3BHK units 1850 sft unnay. Meeru budget entha varaku chusthunnaru sir?', at: '0:15' },
      { role: 'lead', text: 'My budget is around 90 lakhs to 1 crore.', at: '0:22' },
      { role: 'assistant', text: 'Perfect sir! Adi correct ga maa pricing range lo match avuthundi. Ee weekend meeku site visit schedule cheyamantara? Saturday or Sunday?', at: '0:31' },
      { role: 'lead', text: 'Sunday morning around 11 AM works for me.', at: '0:38' },
      { role: 'assistant', text: 'Done Rahul garu! Sunday 11:00 AM ki site visit confirm chesamu. WhatsApp lo location link and sales manager contact share chesthamu. Dhanyavadamulu!', at: '0:46' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: 'call_02',
    leadId: 'lead_02',
    employeeId: 'emp_01',
    status: 'completed',
    durationSec: 110,
    billableMinutes: 2,
    outcome: 'Appointment Scheduled',
    intentScore: 78,
    language: 'Telugu',
    summary: {
      requirement: 'Looking for commercial space in Jubilee Hills or Madhapur for clinic setup.',
      answers: {
        property_type: 'Commercial',
        budget: '₹1Cr - ₹2Cr',
        location: 'Jubilee Hills / Madhapur',
      },
      intentScore: 78,
      intentBasis: 'Doctor expanding clinic, looking for road-facing commercial space.',
      qualificationResult: 'Passed',
      recommendedNextAction: 'Assign commercial portfolio lead.',
    },
    transcript: [
      { role: 'assistant', text: 'Namaskaram Kavitha garu! Sri Sai Commercial Spaces nundi Meera matladuthunnanu.', at: '0:02' },
      { role: 'lead', text: 'Haan Meera, naku clinic setup kosam commercial space kavali.', at: '0:07' },
      { role: 'assistant', text: 'Tappakunda madam. Jubilee Hills & Madhapur lo main road facing spaces available unnay. Direct meeting arrange cheyamantara?', at: '0:16' },
      { role: 'lead', text: 'Yes please, Monday evening arrange cheyandi.', at: '0:23' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 175).toISOString(),
  },
];

export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt_01',
    leadId: 'lead_01',
    title: 'Site Visit: Rahul Verma (Gachibowli 3BHK)',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 37).toISOString(),
    status: 'confirmed',
    note: 'Lead requested road-facing unit tour. Assigned to Senior Property Advisor.',
  },
  {
    id: 'apt_02',
    leadId: 'lead_02',
    title: 'Consultation: Dr. Kavitha Reddy (Clinic Space)',
    startsAt: new Date(Date.now() + 1000 * 60 * 60 * 60).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 61).toISOString(),
    status: 'confirmed',
    note: 'Commercial showroom presentation prepared.',
  },
];

export const DEMO_ANALYTICS: Analytics = {
  totalLeads: 248,
  callsAttempted: 236,
  callsConnected: 218,
  completedConversations: 194,
  qualifiedLeads: 162,
  appointmentsBooked: 58,
  avgCallDurationSec: 135,
  callSuccessRate: 92.4,
  leadConversionRate: 29.8,
  usagePaise: 178500,
  walletBalancePaise: 245000,
  trend: [
    { date: 'Oct 27', count: 28 },
    { date: 'Oct 28', count: 35 },
    { date: 'Oct 29', count: 42 },
    { date: 'Oct 30', count: 39 },
    { date: 'Oct 31', count: 48 },
    { date: 'Nov 01', count: 52 },
    { date: 'Nov 02', count: 44 },
  ],
};

export const DEMO_WALLET_TXNS: WalletTxn[] = [
  {
    id: 'tx_01',
    type: 'credit',
    amountPaise: 300000,
    balanceAfterPaise: 246500,
    description: 'Wallet top-up (UPI / Razorpay mock)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'tx_02',
    type: 'debit',
    amountPaise: 1500,
    balanceAfterPaise: 245000,
    description: 'Call to Rahul Verma (3 mins talk-time)',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
];
