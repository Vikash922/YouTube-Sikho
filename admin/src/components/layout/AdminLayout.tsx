import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../common/CommandPalette';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

  // Derive activeTab from current URL pathname
  const getActiveTab = (): NavTab => {
    const p = location.pathname.split('/')[1] || 'dashboard';
    if (p === 'live') return 'live-classes';
    if (p === 'activity') return 'activity-log';
    return (p as NavTab) || 'dashboard';
  };

  const activeTab = getActiveTab();

  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'live-classes') {
      navigate('/live');
    } else if (tab === 'activity-log') {
      navigate('/activity');
    } else {
      navigate(`/${tab}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors">
      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onSelectTab={handleSelectTab}
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            <Breadcrumbs />
            <ErrorBoundary>
              {children || <Outlet />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
