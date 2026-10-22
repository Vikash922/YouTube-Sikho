import React, { useState } from 'react';
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const Login: React.FC = () => {
  const { signIn, signInAsDemoAdmin, resetPassword, error: authError, clearError } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Forgot Password modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your administrator email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      showToast('Welcome back, Administrator!', 'success');
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Please enter your email to receive a reset link.', 'warning');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      showToast('Password reset link sent to your email!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset link.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const activeError = localError || authError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-light-bg dark:bg-dark-bg transition-colors">
      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-xl p-8 backdrop-blur-md">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight text-light-text dark:text-dark-text">
              YouTube Sikho
            </h1>
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest mt-1">
              Admin Portal
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Sign in with your administrator credentials
            </p>
          </div>

          {/* Error Alert */}
          {activeError && (
            <div className="mb-6 p-4 rounded-btn bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-700 dark:text-red-300 text-xs font-medium leading-relaxed animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{activeError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@youtubesikho.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetOpen(true);
                    setResetEmail(email);
                    setResetSuccess(false);
                  }}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-input border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-light-text dark:text-dark-text pl-10 pr-10 py-2.5 text-sm hover:border-slate-400 dark:hover:border-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2 font-semibold shadow-md shadow-brand-500/20"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Dashboard
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
              <span className="flex-shrink mx-3 text-xs text-slate-400">or</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full text-xs"
              onClick={() => {
                signInAsDemoAdmin();
                showToast('Signed in with Demo Admin credentials!', 'success');
              }}
              icon={<Sparkles className="w-4 h-4 text-brand-500" />}
            >
              Instant Admin Demo Access
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-light-border dark:border-dark-border text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Restricted area. Non-administrator accounts are strictly prohibited and will be logged out automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-light-text dark:text-dark-text">
                Reset Admin Password
              </h3>
            </div>

            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-light-text dark:text-dark-text">
                  Reset Link Sent!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please check your inbox at <span className="font-semibold">{resetEmail}</span>.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-5 w-full"
                  onClick={() => setIsResetOpen(false)}
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your registered administrator email address to receive a secure password reset link.
                </p>
                <Input
                  label="Admin Email"
                  type="email"
                  required
                  placeholder="admin@youtubesikho.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={resetLoading}
                    onClick={() => setIsResetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={resetLoading}
                  >
                    Send Reset Link
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
