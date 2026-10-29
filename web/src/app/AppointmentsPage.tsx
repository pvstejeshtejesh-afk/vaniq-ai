import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Appointment, Lead } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

export function AppointmentsPage() {
  const { push } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leadId: '', date: '', time: '', minutes: '30' });

  async function load() {
    setLoading(true);
    try {
      const [a, l] = await Promise.all([
        api.get<{ appointments: Appointment[] }>('/appointments'),
        api.get<{ leads: Lead[] }>('/leads'),
      ]);
      setAppointments(
        a.appointments.sort((x, y) => x.startsAt.localeCompare(y.startsAt)),
      );
      setLeads(l.leads);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.leadId) return;
    const startsAt = new Date(`${form.date}T${form.time}:00`).toISOString();
    const endsAt = new Date(
      new Date(startsAt).getTime() + Number(form.minutes) * 60000,
    ).toISOString();
    setSaving(true);
    try {
      await api.post('/appointments', { leadId: form.leadId, startsAt, endsAt, title: 'Follow-up' });
      push('success', 'Appointment booked');
      setShowForm(false);
      setForm({ leadId: '', date: '', time: '', minutes: '30' });
      await load();
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    await api.patch(`/appointments/${id}/cancel`);
    push('success', 'Appointment cancelled');
    await load();
  }

  const leadName = (id: string) => leads.find((l) => l.id === id)?.name ?? 'Lead';

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Slots are conflict-checked before they are confirmed."
        action={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close' : '+ Book Appointment'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={create} className="card mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Lead</label>
            <select
              className="input"
              required
              value={form.leadId}
              onChange={(e) => setForm({ ...form, leadId: e.target.value })}
            >
              <option value="">Select a lead…</option>
              {leads
                .filter((l) => !l.optedOut)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.phone}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <select
              className="input"
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Time</label>
            <input
              type="time"
              className="input"
              required
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary" disabled={saving}>
              {saving ? 'Booking…' : 'Book Appointment'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Book a follow-up or site visit from here, or let your AI employee schedule one during a call."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Book Appointment
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold text-brand-navy">{leadName(a.leadId)}</p>
                <p className="text-sm text-slate-500">
                  {new Date(a.startsAt).toLocaleString('en-IN')} –{' '}
                  {new Date(a.endsAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`badge ${
                    a.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-700'
                      : a.status === 'scheduled'
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {a.status}
                </span>
                {a.status !== 'cancelled' && (
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    onClick={() => cancel(a.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
