import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

const INDUSTRIES = [
  { key: 'real_estate', label: 'Real Estate & Builders' },
  { key: 'clinic', label: 'Clinic / Hospital' },
  { key: 'coaching', label: 'Coaching Institute' },
  { key: 'car_dealership', label: 'Car Dealership' },
  { key: 'financial_services', label: 'Loans & Financial Services' },
  { key: 'restaurant', label: 'Restaurant & Events' },
  { key: 'other', label: 'Other' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh, setBusiness } = useAuth();
  const { push } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    industry: 'real_estate',
    phone: '',
    timezone: 'Asia/Kolkata',
    website: '',
    address: '',
    callingHours: { start: '09:00', end: '20:00' },
    callingDays: [1, 2, 3, 4, 5, 6],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post<{ business: never }>('/business', form);
      setBusiness(res.business as never);
      await refresh();
      push('success', 'Business created');
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create business');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 to-white px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-6 block text-center text-2xl font-extrabold">
          Vaniq<span className="text-brand-600">.Ai</span>
        </Link>

        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-brand-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        <div className="card">
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold text-brand-navy">Tell us about your business</h1>
              <p className="mt-1 text-sm text-slate-500">
                This helps your AI employee represent you accurately.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Business name</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. Sunrise Realty"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <select
                    className="input"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  >
                    {INDUSTRIES.map((i) => (
                      <option key={i.key} value={i.key}>{i.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Business phone (Indian mobile)</label>
                  <input
                    className="input"
                    required
                    placeholder="98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Website (optional)</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://…"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>
                <button className="btn-primary w-full" onClick={() => setStep(2)} type="button">
                  Continue →
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit}>
              <h1 className="text-2xl font-bold text-brand-navy">Calling preferences</h1>
              <p className="mt-1 text-sm text-slate-500">
                Leads are only called within these hours, and only with consent.
              </p>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Calling hours start</label>
                    <input
                      type="time"
                      className="input"
                      value={form.callingHours.start}
                      onChange={(e) =>
                        setForm({ ...form, callingHours: { ...form.callingHours, start: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Calling hours end</label>
                    <input
                      type="time"
                      className="input"
                      value={form.callingHours.end}
                      onChange={(e) =>
                        setForm({ ...form, callingHours: { ...form.callingHours, end: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select
                    className="input"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  >
                    <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
                  </select>
                </div>
                {error && (
                  <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                )}
                <div className="flex gap-3">
                  <button type="button" className="btn-secondary flex-1" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button className="btn-primary flex-1" disabled={saving}>
                    {saving ? 'Creating…' : 'Finish setup'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
