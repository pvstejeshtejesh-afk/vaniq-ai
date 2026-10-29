import { createApp } from '../app.js';
import { hashPassword } from '../lib/password.js';
import { newId } from '../lib/ids.js';
import { createStore } from '../store/index.js';

/**
 * Seeds a demo business with an active AI employee, a few leads, and a
 * completed call. Intended for a clearly-identified dev/demo environment only.
 *
 * Run: npm run seed   (uses whatever STORAGE is configured; defaults to memory,
 * so start the server with the same store or set STORAGE=mongo to persist.)
 */
async function seed() {
  const store = await createStore();

  const user = await store.createUser({
    name: 'Demo Owner',
    email: 'demo@vaniq.dev',
    passwordHash: await hashPassword('password123'),
    businessId: null,
  });

  const business = await store.createBusiness({
    ownerId: user.id,
    name: 'Sunrise Realty (Demo)',
    industry: 'real_estate',
    phone: '+919876543210',
    timezone: 'Asia/Kolkata',
    onboardingComplete: true,
    callingHours: { start: '00:00', end: '23:59' },
    callingDays: [0, 1, 2, 3, 4, 5, 6],
    minimumBalancePaise: 50000,
    lowBalanceAlertPaise: 50000,
  });
  await store.updateUser(user.id, { businessId: business.id });
  await store.ensureWallet(business.id);

  const employee = await store.createEmployee({
    businessId: business.id,
    name: 'Meera',
    purpose: 'qualifying property leads and booking site visits',
    personality: 'Warm, polite, professional',
    systemPrompt: 'You are Meera, a real-estate assistant for Sunrise Realty.',
    languages: ['te', 'en', 'tenglish'],
    voiceProvider: 'mock',
    voiceId: 'default',
    qualificationFields: [
      { key: 'property_type', label: 'Property type', type: 'text' },
      { key: 'preferred_location', label: 'Preferred location', type: 'text' },
      { key: 'budget_range', label: 'Budget range', type: 'text' },
      { key: 'buying_timeline', label: 'Buying timeline', type: 'text' },
    ],
    faqs: [],
    workingHours: null,
    maxCallDurationSec: 180,
    escalationRules: ['Escalate if the customer asks for a human'],
    callOutcomes: ['qualified', 'unqualified', 'callback'],
    pricingTier: 'standard',
    status: 'active',
  });

  const leads = [];
  for (const [name, phone] of [
    ['Rahul Reddy', '9876543210'],
    ['Sridevi', '9876543211'],
    ['Imran', '9876543212'],
  ] as const) {
    leads.push(
      await store.createLead({
        businessId: business.id,
        name,
        phone: `+91${phone}`,
        source: 'meta_ads',
        consent: 'granted',
        optedOut: false,
        status: 'new',
        lastCallId: null,
        callCount: 0,
        nextEligibleAt: null,
        attributes: {},
      }),
    );
  }

  console.log('Seeded demo data:');
  console.log('  Login: demo@vaniq.dev / password123');
  console.log(`  Business: ${business.name} (${business.id})`);
  console.log(`  AI employee: ${employee.name} (${employee.id})`);
  console.log(`  Leads: ${leads.map((l) => l.id).join(', ')}`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
