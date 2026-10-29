import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const { refresh } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/login', form);
      await refresh();
      push('success', 'Welcome back!');
      navigate(location.state?.from?.pathname ?? '/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Vaniq.Ai dashboard.">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            className="input"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-600">
          Get started
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50/60 to-white px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-2xl font-extrabold">
          Vaniq<span className="text-brand-600">.Ai</span>
        </Link>
        <div className="card">
          <h1 className="text-2xl font-bold text-brand-navy">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
