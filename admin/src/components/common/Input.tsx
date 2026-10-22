import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-input border text-sm transition-all duration-150 py-2.5 min-h-[44px] ${
              icon ? 'pl-10 pr-3.5' : 'px-3.5'
            } ${
              error
                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200 focus:ring-2 focus:ring-red-400'
                : 'border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-light-text dark:text-dark-text hover:border-slate-400 dark:hover:border-slate-500 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20'
            } disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {helperText && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
