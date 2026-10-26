import React from 'react';
import { Menu, Sun, Moon, Search, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from './Sidebar';

interface HeaderProps {
  activeTab: NavTab;
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenMobileSidebar, onOpenCommandPalette }) => {
  const { theme, toggleTheme } = useTheme();
  const { adminData } = useAuth();

  const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard Overview', subtitle: 'Real-time performance and system metrics' },
    courses: { title: 'Course Catalog & Video Content', subtitle: 'Manage curriculum, lessons, and pricing' },
    materials: { title: 'Study Materials & PDFs', subtitle: 'Course notes, cheat-sheets, and downloadable resources' },
    'live-classes': { title: 'Live Streaming Classes', subtitle: 'Schedule, broadcast, and moderate live interactive sessions' },
    quizzes: { title: 'Quizzes & Question Bank', subtitle: 'MCQ tests, negative marking, and student performance' },
    notifications: { title: 'Push Notifications & Alerts', subtitle: 'Broadcast FCM push and in-app updates to student cohorts' },
    orders: { title: 'Orders & Sales Management', subtitle: 'Real-time payment history and refund controls' },
    coupons: { title: 'Discount Coupons', subtitle: 'Promo codes, usage limits, and redemption rates' },
    categories: { title: 'Category Management', subtitle: 'Organize courses into structured topics' },
    'home-manager': { title: 'Home Screen Manager', subtitle: 'Control hero banners and dynamic layout sections' },
    support: { title: 'Help Desk & Support Tickets', subtitle: 'Resolve student inquiries and manage FAQs' },
    settings: { title: 'App Settings & Brand', subtitle: 'Manage app details, brand tokens, and maintenance' },
    students: { title: 'Student Management', subtitle: 'Inspect active learners and account access' },
  };

  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'Admin Portal', subtitle: '' };

  return (
    <header className="h-16 bg-white dark:bg-dark-surface border-b border-light-border dark:border-dark-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile Menu + Titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold font-display text-light-text dark:text-dark-text tracking-tight flex items-center gap-2">
            {currentTabInfo.title}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">
            {currentTabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search, Theme Toggle & Admin Badge */}
      <div className="flex items-center gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs rounded-full border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-brand-500/50 transition-all cursor-pointer shadow-sm"
          title="Open Command Palette (Cmd + K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="w-36 lg:w-48 text-left truncate">Search or jump to...</span>
          <span className="font-mono text-[10px] bg-white dark:bg-slate-800 border border-light-border dark:border-dark-border px-1.5 py-0.5 rounded text-slate-500">
            ⌘K
          </span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-btn text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Admin Verified Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{adminData?.name || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
};
