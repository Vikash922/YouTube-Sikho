import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, KeyRound, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { brandConfig } from '../config/branding';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

const MAX_FAILED_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

export const Login: React.FC = () => {
  const { signIn, resetPassword, error: authError, clearError } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Client lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Forgot Password modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Timer countdown for lockout
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (lockoutRemaining > 0) {
      timer = setTimeout(() => {
        setLockoutRemaining((prev) => prev - 1);
      }, 1000);
    } else if (lockoutRemaining === 0 && failedAttempts >= MAX_FAILED_ATTEMPTS) {
      setFailedAttempts(0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lockoutRemaining, failedAttempts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (lockoutRemaining > 0) {
      setLocalError(`Too many failed login attempts. Please wait ${lockoutRemaining} seconds.`);
      return;
    }

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      setFailedAttempts(0);
      showToast('Welcome back, Administrator!', 'success');
    } catch (err: any) {
      const nextFailCount = failedAttempts + 1;
      setFailedAttempts(nextFailCount);

      if (nextFailCount >= MAX_FAILED_ATTEMPTS) {
        setLockoutRemaining(COOLDOWN_SECONDS);
        setLocalError(`Too many failed login attempts. Account temporarily locked for ${COOLDOWN_SECONDS} seconds.`);
      } else {
        setLocalError(err.message || 'Invalid email or password.');
      }
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
              {brandConfig.appName}
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
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              disabled={lockoutRemaining > 0}
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
                  disabled={lockoutRemaining > 0}
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
              disabled={lockoutRemaining > 0}
              className="w-full mt-2 font-semibold shadow-md shadow-brand-500/20"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {lockoutRemaining > 0 ? `Locked (${lockoutRemaining}s)` : 'Sign In to Dashboard'}
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
              <div>
                <h3 className="font-semibold text-sm text-light-text dark:text-dark-text">Reset Password</h3>
                <p className="text-xs text-slate-500">We'll send you a link to reset your password</p>
              </div>
            </div>

            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                  Password reset link sent to <strong>{resetEmail}</strong>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setIsResetOpen(false);
                    setResetSuccess(false);
                  }}
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsResetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={resetLoading}
                    className="flex-1"
                  >
                    Send Link
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
