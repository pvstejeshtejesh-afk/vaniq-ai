import { Link } from 'react-router-dom';
import { useState } from 'react';

const INDUSTRIES = [
  { title: 'Real Estate & Builders', desc: 'Qualifies Facebook & portal leads, captures budget and location, books weekend site visits.', code: "O' Shanthi", time: '1:21' },
  { title: 'Coaching & Admissions', desc: 'Screens student enquiries in Telugu & English, explains course fees and batch timings.', code: 'P09', time: '1:16' },
  { title: 'Hospitals & Clinics', desc: 'Handles OPD enquiries 24/7, books doctor appointments and sends reminders.', code: 'P07', time: '1:02' },
  { title: 'Car Showrooms', desc: 'Answers purchase enquiries, schedules test drives and shares on-road pricing.', code: 'P02', time: '1:17' },
  { title: 'Loans & Insurance', desc: 'Screens applicants for eligibility, sends EMI reminders, follows up on KYC.', code: 'P02', time: '0:55' },
  { title: 'Restaurants & Events', desc: 'Manages reservations, answers party & buffet questions during rush hours.', code: 'P09', time: '0:49' },
];

const FAQS = [
  { q: 'Does it really speak Telugu and Tenglish?', a: 'Yes. Vaniq employees converse fluently in Telugu, English and Tenglish — switching mid-sentence the way real people do.' },
  { q: 'How fast does it call a new lead?', a: 'Eligible leads are called within about 30 seconds of arriving, subject to consent, calling hours and queue load.' },
  { q: 'What does it cost?', a: 'Plans start at ₹1,999/month per AI employee with pure per-minute usage from ₹3.50/min. You only pay for talk-time that connects.' },
  { q: 'Is calling compliant?', a: 'Vaniq enforces consent, opt-out, and permitted calling hours on every lead, and respects do-not-call requests automatically.' },
];

export function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-xl font-extrabold">
            Vaniq<span className="text-brand-600">.Ai</span>
          </span>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-brand-700">Features</a>
            <a href="#industries" className="hover:text-brand-700">Industries</a>
            <a href="#how" className="hover:text-brand-700">How it works</a>
            <a href="#pricing" className="hover:text-brand-700">Pricing</a>
            <a href="#faq" className="hover:text-brand-700">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary px-4 py-2 text-sm">
              Get Started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/60 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 shadow-card">
              ✦ Built for Indian SMBs
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              Hire India's fastest{' '}
              <span className="text-gradient">AI employee</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Every lead gets a fast response from an AI employee that never misses a follow-up —
              speaking <strong>Telugu, English & Tenglish</strong> and qualifying customers in
              under 30 seconds.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary px-6 py-3.5 text-base">
                Get Started Free →
              </Link>
              <a href="#pricing" className="btn-secondary px-6 py-3.5 text-base">
                View Pricing
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> No card required</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-500" /> Consent & opt-out built in</span>
            </div>
          </div>

          {/* Hero chat mock */}
          <div className="relative">
            <div className="card mx-auto max-w-md">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">M</div>
                <div>
                  <p className="font-semibold text-brand-navy">Meera · AI</p>
                  <p className="text-xs text-emerald-600">● Live</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl rounded-tl-sm bg-brand-50 px-3 py-2 text-brand-900">
                  "Namaskaram! Nenu Meera. Gachibowli 3BHK gurinchi matladadaniki call chesanu."
                </div>
                <div className="ml-auto rounded-xl rounded-tr-sm bg-brand-600 px-3 py-2 text-white">
                  "Yes, what budget are you thinking?"
                </div>
                <div className="rounded-xl rounded-tl-sm bg-brand-50 px-3 py-2 text-brand-900">
                  "Around ₹80L – ₹1Cr, and I'd like a site visit this weekend."
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span>4 fields captured · auto-logged</span>
                <span className="font-semibold text-brand-600">Intent 85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature strip */}
        <div className="border-t border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:grid-cols-4">
            {['Speaks Telugu, English & Tenglish', 'Calls every lead in under 30s', 'Consent & opt-out enforced', 'Misses nothing, follows up always'].map((f) => (
              <div key={f} className="flex items-center gap-2"><span className="text-brand-600">✓</span>{f}</div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
            One employee, <span className="text-gradient">two ways to work</span>.
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Chase leads the instant they arrive, or hand a whole list over — same employee, same Telugu.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: '1', t: 'A lead arrives', d: 'From Meta, Instagram, your website forms, CRM or a webhook.' },
            { n: '2', t: 'She calls — under 30 seconds', d: 'While they are still holding their phone, in their language.' },
            { n: '3', t: 'Booked & logged, instantly', d: 'Summary and captured details pushed to your dashboard.' },
          ].map((s) => (
            <div key={s.n} className="card relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{s.n}</div>
              <h3 className="mt-4 font-semibold text-brand-navy">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gradient-to-b from-white to-brand-50/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
              Everything a great employee does — <span className="text-gradient">on the phone</span>.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: 'Natural multilingual voice', d: 'Fluent Telugu, English and Tenglish with graceful interruption handling.' },
              { t: 'Lead qualification', d: 'Configurable questions per industry, with structured answers captured.' },
              { t: 'Appointment booking', d: 'Checks real availability and conflicts before confirming a slot.' },
              { t: 'Instant summaries', d: 'Requirement, answers, intent score and recommended next action.' },
              { t: 'Consent & opt-out', d: 'Enforced on every call. Do-not-call requests are always respected.' },
              { t: 'Transparent billing', d: 'Pure per-minute, pay only for talk-time that actually connects.' },
            ].map((f) => (
              <div key={f.t} className="card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">✦</div>
                <h3 className="mt-4 font-semibold text-brand-navy">{f.t}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="bg-brand-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-300">✦ Proven across industries</span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Who is your AI Employee <span className="text-brand-300">best for</span>?
            </h2>
            <p className="mt-3 text-brand-200">
              From local businesses in Andhra & Telangana to enterprises across India.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((i) => (
              <div key={i.title} className="rounded-2xl bg-white p-6 text-brand-navy shadow-soft">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{i.title}</h3>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {i.code}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{i.desc}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white">▶</span>
                  <span className="h-1 flex-1 rounded bg-slate-100" />
                  {i.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-brand-navy sm:text-4xl">
            Pure per-minute billing. <span className="text-gradient">Zero base fees.</span>
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            You only pay for talk-time that actually connects, with no monthly lock-ins.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {[
            { tier: 'Value', price: '₹3.5', per: '/min', desc: 'Budget-friendly. Mostly used for bulk calling campaigns.', feats: ['Native multilingual', 'Value voices', 'Low latency', 'Budget bulk calling'], highlight: false },
            { tier: 'Standard', price: '₹5', per: '/min', desc: 'The all-rounder. High realism for everyday interactions.', feats: ['Native multilingual', 'Standard voices', 'Low latency', 'Most popular'], highlight: true },
            { tier: 'Premium', price: '₹7', per: '/min', desc: 'Curated native speakers. Most real-like voices.', feats: ['Native multilingual', 'Premium voices', 'Ultra-low latency', 'Custom integrations'], highlight: false },
          ].map((p) => (
            <div
              key={p.tier}
              className={`relative rounded-3xl p-8 ${
                p.highlight ? 'bg-brand-600 text-white shadow-soft' : 'card'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900">
                  ✦ Most Popular
                </span>
              )}
              <span className={`badge ${p.highlight ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700'}`}>
                {p.tier}
              </span>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className={`mb-1 text-sm ${p.highlight ? 'text-brand-100' : 'text-slate-500'}`}>{p.per}</span>
              </div>
              <p className={`mt-2 text-sm ${p.highlight ? 'text-brand-100' : 'text-slate-600'}`}>{p.desc}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className={p.highlight ? 'text-white' : 'text-brand-600'}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-8 block rounded-xl px-5 py-3 text-center font-semibold ${
                  p.highlight ? 'bg-white text-brand-700 hover:bg-brand-50' : 'btn-primary'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Plus a subscription of ₹1,999/month per AI employee. All prices in INR.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-brand-50/40 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold text-brand-navy">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => (
              <div key={f.q} className="card overflow-hidden p-0">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-brand-navy"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {f.q}
                  <span className={`transition ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaq === i && <p className="px-6 pb-5 text-sm text-slate-600">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 px-8 py-14 text-center text-white shadow-soft">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Ready to never miss a lead again?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Set up your first AI employee in minutes. No credit card required.
          </p>
          <Link to="/register" className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 font-semibold text-brand-700 hover:bg-brand-50">
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row">
          <span className="text-lg font-extrabold">
            Vaniq<span className="text-brand-600">.Ai</span>
          </span>
          <p className="text-sm text-slate-500">
            AI voice employees for Indian businesses. Andhra Pradesh · Telangana · India.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link to="/login" className="hover:text-brand-700">Sign in</Link>
            <Link to="/register" className="hover:text-brand-700">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
