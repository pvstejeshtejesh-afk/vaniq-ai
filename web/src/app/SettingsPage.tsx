import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Business } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

const DAYS = [
  { i: 0, l: 'Sun' },
  { i: 1, l: 'Mon' },
  { i: 2, l: 'Tue' },
  { i: 3, l: 'Wed' },
  { i: 4, l: 'Thu' },
  { i: 5, l: 'Fri' },
  { i: 6, l: 'Sat' },
];

export function SettingsPage() {
  const { business, setBusiness } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) setForm({ ...business });
  }, [business]);

  if (!form) return <Spinner />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch<{ business: Business }>('/business', {
        name: form!.name,
        website: form!.website || undefined,
        address: form!.address || undefined,
        callingHours: form!.callingHours,
        callingDays: form!.callingDays,
        timezone: form!.timezone,
      });
      setBusiness(res.business);
      push('success', 'Settings saved');
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(i: number) {
    setForm({
      ...form!,
      callingDays: form!.callingDays.includes(i)
        ? form!.callingDays.filter((d) => d !== i)
        : [...form!.callingDays, i].sort(),
    });
  }

  return (
    <div>
      <PageHeader title="Business Settings" subtitle="Profile, contact details and calling policy." />

      <form onSubmit={save} className="max-w-2xl space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-navy">Profile</h2>
          <div>
            <label className="label">Business name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} disabled />
            <p className="mt-1 text-xs text-slate-400">Phone cannot be changed here.</p>
          </div>
          <div>
            <label className="label">Website</label>
            <input
              className="input"
              type="url"
              placeholder="https://…"
              value={form.website ?? ''}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              className="input"
              rows={2}
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-navy">Calling policy</h2>
          <p className="text-sm text-slate-500">
            Leads are only called within these hours and days, and only with recorded consent.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start</label>
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
              <label className="label">End</label>
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
            <label className="label">Permitted days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = form.callingDays.includes(d.i);
                return (
                  <button
                    type="button"
                    key={d.i}
                    onClick={() => toggleDay(d.i)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                      active
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
