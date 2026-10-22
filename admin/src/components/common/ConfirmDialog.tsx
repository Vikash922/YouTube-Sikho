import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-2xl overflow-hidden p-6"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full flex-shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  : variant === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
              }`}
            >
              {variant === 'danger' && <AlertCircle className="w-6 h-6" />}
              {variant === 'warning' && <AlertTriangle className="w-6 h-6" />}
              {variant === 'primary' && <HelpCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-light-text dark:text-dark-text">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-12">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3 pl-12">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
