import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-dark-surface border border-red-200 dark:border-red-900/40 rounded-card p-6 text-center shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-light-text dark:text-dark-text mb-1">
              {this.props.fallbackTitle || 'Unable to Load Component'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              An unexpected error occurred while rendering this section. Your data is safe.
            </p>
            {this.state.error && (
              <div className="p-3 mb-6 rounded-lg bg-slate-50 dark:bg-dark-bg text-left font-mono text-[11px] text-red-600 dark:text-red-400 overflow-x-auto border border-light-border dark:border-dark-border">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Home className="w-4 h-4" />}
                onClick={() => (window.location.href = '/dashboard')}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
