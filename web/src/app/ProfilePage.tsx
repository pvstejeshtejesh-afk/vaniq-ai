import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await api.patch('/profile', { name });
      await refresh();
      push('success', 'Profile updated');
    } catch (err) {
      push('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pw.newPassword !== pw.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await api.post('/profile/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      push('success', 'Password changed');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Change failed');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div>
      <PageHeader title="Profile & Security" subtitle="Manage your account and password." />

      <div className="grid max-w-3xl gap-6">
        <form onSubmit={saveName} className="card space-y-4">
          <h2 className="font-semibold text-brand-navy">Profile</h2>
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={user?.email ?? ''} disabled />
            <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
          </div>
          <button className="btn-primary" disabled={savingName}>
            {savingName ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <form onSubmit={changePassword} className="card space-y-4">
          <h2 className="font-semibold text-brand-navy">Change password</h2>
          {pwError && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{pwError}</div>
          )}
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              className="input"
              required
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            />
          </div>
          <button className="btn-primary" disabled={savingPw}>
            {savingPw ? 'Updating…' : 'Change password'}
          </button>
        </form>

        <div className="card">
          <h2 className="font-semibold text-brand-navy">Active session</h2>
          <p className="mt-2 text-sm text-slate-500">
            You're signed in as <span className="font-medium text-brand-navy">{user?.email}</span>.
            Signing out on this device ends the session immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
