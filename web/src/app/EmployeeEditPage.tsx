import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { AIEmployee, QualificationField } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

const LANGS = [
  { key: 'en', label: 'English' },
  { key: 'te', label: 'Telugu' },
  { key: 'tenglish', label: 'Tenglish' },
];

const OUTCOME_OPTIONS = ['qualified', 'unqualified', 'callback', 'not_interested', 'voicemail'];

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();
  const [emp, setEmp] = useState<AIEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<{ employee: AIEmployee }>(`/employees/${id}`);
        setEmp(data.employee);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner />;
  if (!emp) {
    return (
      <div>
        <PageHeader title="Employee not found" />
        <Link to="/app/employees" className="btn-secondary">← Back to AI Employees</Link>
      </div>
    );
  }

  const set = <K extends keyof AIEmployee>(k: K, v: AIEmployee[K]) =>
    setEmp({ ...emp, [k]: v });

  function toggleLang(key: string) {
    const has = emp!.languages.includes(key);
    set('languages', has ? emp!.languages.filter((l) => l !== key) : [...emp!.languages, key]);
  }

  function toggleOutcome(o: string) {
    const has = emp!.callOutcomes.includes(o);
    set('callOutcomes', has ? emp!.callOutcomes.filter((x) => x !== o) : [...emp!.callOutcomes, o]);
  }

  function updateField(i: number, patch: Partial<QualificationField>) {
    const fields = emp!.qualificationFields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    set('qualificationFields', fields);
  }

  function addField() {
    set('qualificationFields', [
      ...emp!.qualificationFields,
      { key: `field_${emp!.qualificationFields.length + 1}`, label: '', type: 'text' },
    ]);
  }

  function removeField(i: number) {
    set('qualificationFields', emp!.qualificationFields.filter((_, idx) => idx !== i));
  }

  function updateFaq(i: number, patch: Partial<{ question: string; answer: string }>) {
    set('faqs', emp!.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/employees/${id}`, {
        name: emp!.name,
        purpose: emp!.purpose,
        personality: emp!.personality,
        systemPrompt: emp!.systemPrompt,
        languages: emp!.languages,
        voiceProvider: emp!.voiceProvider,
        voiceId: emp!.voiceId,
        qualificationFields: emp!.qualificationFields,
        faqs: emp!.faqs,
        maxCallDurationSec: emp!.maxCallDurationSec,
        escalationRules: emp!.escalationRules,
        callOutcomes: emp!.callOutcomes,
        pricingTier: emp!.pricingTier,
        workingHours: emp!.workingHours,
      });
      push('success', 'Employee updated');
      navigate('/app/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Edit ${emp.name}`}
        subtitle="Update how this AI employee sounds, asks and behaves."
        action={
          <div className="flex gap-2">
            <Link to="/app/employees" className="btn-secondary">Cancel</Link>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      />

      {error && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-navy">Identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input" value={emp.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Voice tier</label>
              <select
                className="input"
                value={emp.pricingTier}
                onChange={(e) => set('pricingTier', e.target.value as 'standard' | 'premium')}
              >
                <option value="standard">Standard — ₹3.50/min</option>
                <option value="premium">Premium — ₹5.50/min</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Business purpose</label>
            <input className="input" value={emp.purpose} onChange={(e) => set('purpose', e.target.value)} />
          </div>
          <div>
            <label className="label">Personality</label>
            <input
              className="input"
              value={emp.personality}
              onChange={(e) => set('personality', e.target.value)}
            />
          </div>
          <div>
            <label className="label">System instructions</label>
            <textarea
              className="input"
              rows={4}
              placeholder="Industry-specific instructions the agent must follow…"
              value={emp.systemPrompt}
              onChange={(e) => set('systemPrompt', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => {
                const active = emp.languages.includes(l.key);
                return (
                  <button
                    type="button"
                    key={l.key}
                    onClick={() => toggleLang(l.key)}
                    className={`badge border px-3 py-1.5 ${
                      active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand-navy">Qualification questions</h2>
            <button type="button" className="text-sm font-medium text-brand-600" onClick={addField}>
              + Add question
            </button>
          </div>
          {emp.qualificationFields.length === 0 && (
            <p className="text-sm text-slate-500">No questions yet.</p>
          )}
          {emp.qualificationFields.map((f, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label">Question label</label>
                <input
                  className="input"
                  placeholder="e.g. Budget range"
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                />
              </div>
              <div className="w-40">
                <label className="label">Type</label>
                <select
                  className="input"
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value as QualificationField['type'] })}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="single_select">Select</option>
                </select>
              </div>
              <button
                type="button"
                className="mb-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                onClick={() => removeField(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand-navy">Business FAQs</h2>
            <button
              type="button"
              className="text-sm font-medium text-brand-600"
              onClick={() => set('faqs', [...emp.faqs, { question: '', answer: '' }])}
            >
              + Add FAQ
            </button>
          </div>
          {emp.faqs.length === 0 && <p className="text-sm text-slate-500">No FAQs yet.</p>}
          {emp.faqs.map((f, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <input
                className="input"
                placeholder="Question"
                value={f.question}
                onChange={(e) => updateFaq(i, { question: e.target.value })}
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Answer (approved business information only)"
                value={f.answer}
                onChange={(e) => updateFaq(i, { answer: e.target.value })}
              />
              <button
                type="button"
                className="text-xs text-rose-600"
                onClick={() => set('faqs', emp.faqs.filter((_, idx) => idx !== i))}
              >
                Remove FAQ
              </button>
            </div>
          ))}
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-navy">Call rules</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Max call duration (seconds)</label>
              <input
                type="number"
                min={30}
                max={1800}
                className="input"
                value={emp.maxCallDurationSec}
                onChange={(e) => set('maxCallDurationSec', Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className="label">Call outcomes</label>
            <div className="flex flex-wrap gap-2">
              {OUTCOME_OPTIONS.map((o) => {
                const active = emp.callOutcomes.includes(o);
                return (
                  <button
                    type="button"
                    key={o}
                    onClick={() => toggleOutcome(o)}
                    className={`badge border px-3 py-1.5 ${
                      active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {o.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Escalation rules (one per line)</label>
            <textarea
              className="input"
              rows={3}
              value={emp.escalationRules.join('\n')}
              onChange={(e) =>
                set('escalationRules', e.target.value.split('\n').filter((s) => s.trim() !== ''))
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/app/employees" className="btn-secondary flex-1 text-center">Cancel</Link>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
