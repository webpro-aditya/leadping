import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, integrationsApi, settingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { IcpProfile } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

const EMPTY_ICP: IcpProfile = {
  product_description: '',
  target_industries: '',
  target_company_sizes: '',
  target_regions: '',
  target_personas: '',
  ideal_pain_points: '',
  disqualifiers: '',
};

export const SettingsPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Custom ICP state
  const [icpSupported, setIcpSupported] = useState(false);
  const [icp, setIcp] = useState<IcpProfile>(EMPTY_ICP);
  const [savingIcp, setSavingIcp] = useState(false);
  const [icpFeedback, setIcpFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // CRM Webhook state
  const [webhookSupported, setWebhookSupported] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [secretPreview, setSecretPreview] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security / Account state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [resendingVerify, setResendingVerify] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [icpRes, webhookRes] = await Promise.all([
          settingsApi.getIcp(),
          integrationsApi.getWebhook(),
        ]);
        setIcpSupported(icpRes.data.data.supported);
        setIcp({ ...EMPTY_ICP, ...(icpRes.data.data.icp_profile || {}) });

        setWebhookSupported(webhookRes.data.data.supported);
        setWebhookUrl(webhookRes.data.data.webhook_url || '');
        setWebhookEnabled(Boolean(webhookRes.data.data.webhook_enabled));
        setSecretPreview(webhookRes.data.data.secret_preview || null);
      } catch {
        /* silently ignore on unmount */
      }
    };
    load();
  }, []);

  const handleSaveIcp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIcp(true);
    setIcpFeedback(null);
    try {
      const { data } = await settingsApi.updateIcp(icp);
      setIcp({ ...EMPTY_ICP, ...(data.data.icp_profile || {}) });
      setIcpFeedback({
        type: 'success',
        text: 'Custom ICP saved! Future company analyses will score leads against your exact criteria.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save custom ICP criteria.';
      setIcpFeedback({ type: 'error', text: msg });
    } finally {
      setSavingIcp(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent, rotateSecret = false) => {
    e.preventDefault();
    setSavingWebhook(true);
    setWebhookFeedback(null);
    setNewSecret(null);
    try {
      const { data } = await integrationsApi.updateWebhook({
        webhook_url: webhookUrl,
        webhook_enabled: webhookEnabled,
        rotate_secret: rotateSecret,
      });
      setWebhookUrl(data.data.webhook_url || '');
      setWebhookEnabled(Boolean(data.data.webhook_enabled));
      setSecretPreview(data.data.secret_preview || null);
      if (data.data.new_secret) {
        setNewSecret(data.data.new_secret);
      }
      setWebhookFeedback({
        type: 'success',
        text: rotateSecret ? 'Webhook secret rotated successfully.' : 'CRM webhook configuration saved.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save webhook settings.';
      setWebhookFeedback({ type: 'error', text: msg });
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookFeedback(null);
    try {
      const { data } = await integrationsApi.testWebhook();
      setWebhookFeedback({
        type: 'success',
        text: data.message || 'Test webhook delivered successfully.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Webhook test delivery failed.';
      setWebhookFeedback({ type: 'error', text: msg });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ type: 'success', text: 'Password updated and other sessions revoked.' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update password.';
      setPasswordFeedback({ type: 'error', text: msg });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount(deletePassword);
      logout();
      navigate('/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete account.';
      setDeleteError(msg);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerify(true);
    setVerifyMsg(null);
    try {
      const { data } = await authApi.resendVerification();
      setVerifyMsg(data.message || 'Verification email sent.');
      await refreshUser();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not send verification email.';
      setVerifyMsg(msg);
    } finally {
      setResendingVerify(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings &amp; Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your Custom ICP scoring criteria, CRM webhook sync, and account security.
        </p>
      </div>

      {/* Email Verification Status */}
      <Card
        title="Account Overview"
        subtitle="Profile and email verification status"
        action={
          user?.email_verified_at ? (
            <Badge variant="success">VERIFIED</Badge>
          ) : (
            <Badge variant="warning">UNVERIFIED</Badge>
          )
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">{user?.email}</p>
            {verifyMsg && <p className="text-xs text-indigo-600 mt-2">{verifyMsg}</p>}
          </div>
          {!user?.email_verified_at && (
            <Button variant="outline" size="sm" onClick={handleResendVerification} isLoading={resendingVerify}>
              Resend Verification Email
            </Button>
          )}
        </div>
      </Card>

      {/* Custom ICP Criteria */}
      <Card
        title="Custom ICP Criteria Tuning"
        subtitle="Tailor AI ICP scores, pain fit, and pitch angles to your exact offer"
        action={
          <Badge variant={icpSupported ? 'info' : 'default'}>
            {icpSupported ? 'PRO+ ENABLED' : 'PRO PLAN REQUIRED'}
          </Badge>
        }
      >
        {!icpSupported ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
            <p className="text-slate-600 text-xs">
              Upgrade to <strong>Pro</strong> or higher to define your own target industries, deal sizes, personas,
              and disqualifiers.
            </p>
            <Link
              to="/subscription"
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shrink-0"
            >
              Upgrade Plan
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSaveIcp}>
            {icpFeedback && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  icpFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {icpFeedback.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                What do you sell? (Product / Service Description)
              </label>
              <textarea
                rows={2}
                value={icp.product_description}
                onChange={(e) => setIcp({ ...icp, product_description: e.target.value })}
                placeholder="e.g., Automated SOC2 compliance and security monitoring platform for SaaS teams"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Target Industries"
                value={icp.target_industries}
                onChange={(e) => setIcp({ ...icp, target_industries: e.target.value })}
                placeholder="e.g., B2B SaaS, FinTech, HealthTech"
              />
              <Input
                label="Ideal Company Sizes"
                value={icp.target_company_sizes}
                onChange={(e) => setIcp({ ...icp, target_company_sizes: e.target.value })}
                placeholder="e.g., 11-50, 51-200"
              />
              <Input
                label="Target Geographies"
                value={icp.target_regions}
                onChange={(e) => setIcp({ ...icp, target_regions: e.target.value })}
                placeholder="e.g., US, UK, India, DACH"
              />
              <Input
                label="Buyer Personas"
                value={icp.target_personas}
                onChange={(e) => setIcp({ ...icp, target_personas: e.target.value })}
                placeholder="e.g., CTO, VP Engineering, Head of Security"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Priority Pain Points"
                value={icp.ideal_pain_points}
                onChange={(e) => setIcp({ ...icp, ideal_pain_points: e.target.value })}
                placeholder="e.g., Slow enterprise security questionnaires, audit prep"
              />
              <Input
                label="Disqualifiers"
                value={icp.disqualifiers}
                onChange={(e) => setIcp({ ...icp, disqualifiers: e.target.value })}
                placeholder="e.g., B2C-only shops, agencies under 5 staff"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" isLoading={savingIcp}>
                Save ICP Criteria
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* CRM Webhook Integrations */}
      <Card
        title="CRM Webhook Integration"
        subtitle="Push scored leads with HMAC-SHA256 signatures (`X-LeadPing-Signature`) to HubSpot, Zapier, Make, or custom endpoints"
        action={
          <Badge variant={webhookSupported ? 'info' : 'default'}>
            {webhookSupported ? 'BUSINESS+ ENABLED' : 'BUSINESS PLAN REQUIRED'}
          </Badge>
        }
      >
        {!webhookSupported ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
            <p className="text-slate-600 text-xs">
              Upgrade to <strong>Business</strong> or <strong>Agency</strong> to configure signed outbound CRM webhooks
              and 1-click lead syncing.
            </p>
            <Link
              to="/subscription"
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shrink-0"
            >
              Upgrade Plan
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => handleSaveWebhook(e, false)}>
            {webhookFeedback && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  webhookFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {webhookFeedback.text}
              </div>
            )}

            {newSecret && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Signing Secret (copy now — shown once):</p>
                <code className="block bg-white px-2.5 py-1.5 rounded border border-amber-200 font-mono text-[11px] break-all">
                  {newSecret}
                </code>
              </div>
            )}

            <Input
              label="Webhook Endpoint URL"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.yourcrm.com/leadping"
            />

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enable outbound CRM webhook delivery</span>
              </label>
              {secretPreview && (
                <span className="text-[11px] text-slate-500 font-mono">Secret: {secretPreview}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {secretPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleSaveWebhook(e, true)}
                  isLoading={savingWebhook}
                >
                  Rotate Secret
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestWebhook}
                isLoading={testingWebhook}
                disabled={!webhookUrl}
              >
                Send Test Event
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={savingWebhook}>
                Save Webhook
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Change Password */}
      <Card title="Change Password" subtitle="Updating your password signs out all other active devices">
        <form className="space-y-4" onSubmit={handleChangePassword}>
          {passwordFeedback && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Current password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" isLoading={savingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card
        title="Delete Account"
        subtitle="Permanently delete your account, saved leads, AI analyses, and active tokens"
      >
        <form className="space-y-4" onSubmit={handleDeleteAccount}>
          {deleteError && (
            <div className="p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Input
                label="Confirm password to permanently delete your account"
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <Button type="submit" variant="danger" size="md" isLoading={deletingAccount}>
              Delete Account Forever
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
