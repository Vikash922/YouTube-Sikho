import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';
import { brandConfig } from '../config/branding';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = `404 - Page Not Found | ${brandConfig.shortName}`;
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-light-bg dark:bg-dark-bg text-center">
      <div className="max-w-md w-full bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-card p-8 shadow-xl">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>
        <div className="text-4xl font-extrabold font-display text-brand-600 mb-2">404</div>
        <h1 className="text-lg font-bold text-light-text dark:text-dark-text mb-2">
          Page Not Found
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          The admin route you requested does not exist or has been relocated in the latest platform architecture.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Home className="w-4 h-4" />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
