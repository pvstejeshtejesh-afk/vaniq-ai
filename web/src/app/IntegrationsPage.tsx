import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

interface Integration {
  id: string;
  provider: string;
  label: string;
  status: 'connected' | 'disconnected';
}

const PROVIDERS: { key: string; name: string; desc: string; icon: string }[] = [
  { key: 'meta_ads', name: 'Meta Lead Ads', desc: 'Import leads from Facebook & Instagram ad forms.', icon: '∞' },
  { key: 'website_form', name: 'Website Form', desc: 'Capture leads from your website contact forms.', icon: '🌐' },
  { key: 'webhook', name: 'Inbound Webhook', desc: 'POST new leads to a secure endpoint from any tool.', icon: '⚡' },
  { key: 'whatsapp', name: 'WhatsApp', desc: 'Send call summaries and notifications on WhatsApp.', icon: '💬' },
  { key: 'google_sheets', name: 'Google Sheets', desc: 'Sync leads and call outcomes to a spreadsheet.', icon: '📊' },
  { key: 'crm', name: 'CRM', desc: 'Push qualified leads into your CRM.', icon: '👥' },
];

export function IntegrationsPage() {
  const { push } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ integrations: Integration[] }>('/integrations');
      setIntegrations(data.integrations);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const find = (provider: string) => integrations.find((i) => i.provider === provider);

  async function toggle(provider: string) {
    const existing = find(provider);
    setBusy(provider);
    try {
      if (existing) {
        await api.patch(`/integrations/${existing.id}`, {
          status: existing.status === 'connected' ? 'disconnected' : 'connected',
        });
        push('success', existing.status === 'connected' ? 'Integration disconnected' : 'Integration reconnected');
      } else {
        const meta = PROVIDERS.find((p) => p.key === provider)!;
        await api.post('/integrations', { provider, label: meta.name });
        push('success', `${meta.name} connected`);
      }
      await load();
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await api.del(`/integrations/${id}`);
      push('success', 'Integration removed');
      await load();
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect where your leads come from, and where summaries should go."
      />

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((p) => {
            const existing = find(p.key);
            const connected = existing?.status === 'connected';
            return (
              <div key={p.key} className="card flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xl text-brand-600">
                    {p.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-brand-navy">{p.name}</h3>
                      {connected && <span className="badge bg-emerald-50 text-emerald-700">connected</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                      connected
                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                    disabled={busy === p.key}
                    onClick={() => toggle(p.key)}
                  >
                    {busy === p.key ? '…' : connected ? 'Disconnect' : 'Connect'}
                  </button>
                  {existing && (
                    <button
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                      disabled={busy === existing.id}
                      onClick={() => remove(existing.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-800">
        <p className="font-semibold">Using webhooks?</p>
        <p className="mt-1">
          POST new leads as JSON (<code className="rounded bg-white px-1">{'{ name, phone, consent }'}</code>)
          to a secure lead endpoint once you deploy. Meta, Sheets and CRM connectors are UI-ready and
          activate when you connect provider credentials in production.
        </p>
      </div>
    </div>
  );
}
