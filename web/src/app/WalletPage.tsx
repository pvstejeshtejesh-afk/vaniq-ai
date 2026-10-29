import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { WalletTxn } from '../lib/types';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const PRESETS = [500, 1000, 2500, 5000];

export function WalletPage() {
  const { push } = useToast();
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);
  const [custom, setCustom] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ wallet: { balancePaise: number }; transactions: WalletTxn[] }>(
        '/wallet',
      );
      setBalance(data.wallet.balancePaise);
      setTxns(data.transactions);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function topUp(amountRupees: number) {
    if (!amountRupees || amountRupees < 1) {
      push('error', 'Enter an amount of at least ₹1');
      return;
    }
    setToppingUp(true);
    try {
      const amountPaise = Math.round(amountRupees * 100);
      const order = await api.post<{ orderId: string; isMock: boolean }>(
        '/payments/create-order',
        { amountPaise },
      );
      // In mock mode we confirm immediately. With live Razorpay you would open
      // the Razorpay checkout here and confirm with the returned signature.
      await api.post('/payments/confirm', {
        orderId: order.orderId,
        paymentId: `pay_${Date.now()}`,
        signature: 'mock_signature',
      });
      push('success', `Wallet topped up by ${rupees(amountPaise)}`);
      await load();
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Top-up failed');
    } finally {
      setToppingUp(false);
    }
  }

  const txnStyle = (type: string) =>
    type === 'usage'
      ? 'bg-rose-50 text-rose-700'
      : type === 'topup'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <div>
      <PageHeader title="Wallet & Billing" subtitle="Pay only for talk-time that connects." />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="card bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                <p className="text-sm font-medium text-brand-100">Wallet balance</p>
                <p className="mt-2 text-4xl font-bold">{rupees(balance)}</p>
                <p className="mt-1 text-xs text-brand-200">Standard ₹3.50/min · Premium ₹5.50/min</p>
              </div>

              <div className="card mt-4">
                <h3 className="mb-3 font-semibold text-brand-navy">Top up</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => topUp(p)}
                      disabled={toppingUp}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-brand-navy hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
                    >
                      ₹{p}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="Custom ₹"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                  />
                  <button
                    className="btn-primary"
                    disabled={toppingUp}
                    onClick={() => topUp(Number(custom))}
                  >
                    {toppingUp ? '…' : 'Add'}
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Payments run in mock mode until Razorpay test keys are configured. No real money
                  is charged.
                </p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="card">
                <h3 className="mb-3 font-semibold text-brand-navy">Transaction history</h3>
                {txns.length === 0 ? (
                  <p className="text-sm text-slate-500">No transactions yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {txns.map((t) => (
                      <li key={t.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-brand-navy">{t.description}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(t.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`badge ${txnStyle(t.type)}`}>{t.type}</span>
                          <p
                            className={`mt-1 text-sm font-semibold ${
                              t.amountPaise < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {t.amountPaise < 0 ? '' : '+'}
                            {rupees(t.amountPaise)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
