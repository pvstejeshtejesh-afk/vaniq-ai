import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { AIEmployee } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

const LANGS = [
  { key: 'en', label: 'English' },
  { key: 'te', label: 'Telugu' },
  { key: 'tenglish', label: 'Tenglish' },
];

const PRESETS: Record<string, { purpose: string; fields: { key: string; label: string }[] }> = {
  real_estate: {
    purpose: 'qualifying property leads and booking site visits',
    fields: [
      { key: 'property_type', label: 'Property type' },
      { key: 'preferred_location', label: 'Preferred location' },
      { key: 'budget_range', label: 'Budget range' },
      { key: 'buying_timeline', label: 'Buying timeline' },
    ],
  },
  clinic: {
    purpose: 'handling appointment bookings and patient enquiries',
    fields: [
      { key: 'service_needed', label: 'Service needed' },
      { key: 'preferred_time', label: 'Preferred time' },
    ],
  },
  coaching: {
    purpose: 'screening student enquiries and booking counselling sessions',
    fields: [
      { key: 'course_interest', label: 'Course interest' },
      { key: 'timeline', label: 'Joining timeline' },
    ],
  },
};

export function EmployeesPage() {
  const { push } = useToast();
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    purpose: '',
    languages: ['en'],
    pricingTier: 'standard' as 'standard' | 'premium',
    preset: 'real_estate',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ employees: AIEmployee[] }>('/employees');
      setEmployees(data.employees);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const preset = PRESETS[form.preset];
      await api.post('/employees', {
        name: form.name,
        purpose: form.purpose || preset.purpose,
        languages: form.languages,
        pricingTier: form.pricingTier,
        personality: 'Warm, polite, professional',
        qualificationFields: preset.fields.map((f) => ({
          key: f.key,
          label: f.label,
          type: 'text',
        })),
      });
      push('success', 'AI employee created');
      setShowForm(false);
      setForm({ name: '', purpose: '', languages: ['en'], pricingTier: 'standard', preset: 'real_estate' });
      await load();
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: 'active' | 'paused' | 'draft') {
    await api.patch(`/employees/${id}`, { status });
    push('success', `Employee ${status}`);
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this AI employee? This cannot be undone.')) return;
    await api.del(`/employees/${id}`);
    push('success', 'Employee deleted');
    await load();
  }

  return (
    <div>
      <PageHeader
        title="AI Employees"
        subtitle="Configure and control the voice agents that call your leads."
        action={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ New AI Employee'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={create} className="card mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Employee name</label>
              <input
                className="input"
                required
                placeholder="e.g. Meera"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Industry preset</label>
              <select
                className="input"
                value={form.preset}
                onChange={(e) => setForm({ ...form, preset: e.target.value })}
              >
                <option value="real_estate">Real Estate</option>
                <option value="clinic">Clinic / Hospital</option>
                <option value="coaching">Coaching Institute</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Purpose</label>
            <input
              className="input"
              placeholder={PRESETS[form.preset].purpose}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => {
                const active = form.languages.includes(l.key);
                return (
                  <button
                    type="button"
                    key={l.key}
                    onClick={() =>
                      setForm({
                        ...form,
                        languages: active
                          ? form.languages.filter((x) => x !== l.key)
                          : [...form.languages, l.key],
                      })
                    }
                    className={`badge border px-3 py-1.5 ${
                      active
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Voice tier</label>
            <select
              className="input max-w-xs"
              value={form.pricingTier}
              onChange={(e) =>
                setForm({ ...form, pricingTier: e.target.value as 'standard' | 'premium' })
              }
            >
              <option value="standard">Standard — ₹3.50/min</option>
              <option value="premium">Premium — ₹5.50/min</option>
            </select>
          </div>
          <button className="btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create AI Employee'}
          </button>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No AI employees yet"
          description="Create your first AI employee to start calling leads."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Create AI Employee
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {employees.map((e) => (
            <div key={e.id} className="card flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-brand-navy">{e.name}</h3>
                  <p className="text-sm text-slate-500">{e.purpose}</p>
                </div>
                <span
                  className={`badge ${
                    e.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : e.status === 'paused'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {e.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.languages.map((l) => (
                  <span key={l} className="badge bg-brand-50 text-brand-700">
                    {l}
                  </span>
                ))}
                <span className="badge bg-slate-100 text-slate-600">{e.pricingTier}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {e.qualificationFields.length} qualification questions
              </p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <Link
                  to={`/app/employees/${e.id}`}
                  className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-center text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  Edit
                </Link>
                {e.status !== 'active' ? (
                  <button
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    onClick={() => setStatus(e.id, 'active')}
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => setStatus(e.id, 'paused')}
                  >
                    Pause
                  </button>
                )}
                <button
                  className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  onClick={() => remove(e.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
