import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return null;
  }

  const formatName = (str: string) => {
    return str
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={name}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-light-text dark:text-dark-text">
                {formatName(name)}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                {formatName(name)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
