import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Home,
  BookOpen,
  Radio,
  Award,
  Bell,
  CreditCard,
  Tag,
  Layers,
  HelpCircle,
  Settings,
  Users,
  PlusCircle,
  Sun,
  Moon,
  ArrowRight,
  Command,
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { useTheme } from '../../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Navigation' | 'Actions' | 'Preferences';
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard Overview',
      subtitle: 'View real-time telemetry, revenue, and system metrics',
      category: 'Navigation',
      icon: <Home className="w-4 h-4 text-brand-500" />,
      action: () => {
        onSelectTab('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-courses',
      title: 'Course Catalog & Bunny Stream',
      subtitle: 'Manage curriculum, lessons, pricing, and video tokens',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      action: () => {
        onSelectTab('courses');
        onClose();
      },
    },
    {
      id: 'nav-live',
      title: 'Live Interactive Classes',
      subtitle: 'Broadcast studio feed, schedule masterclasses, live chat',
      category: 'Navigation',
      icon: <Radio className="w-4 h-4 text-rose-500" />,
      action: () => {
        onSelectTab('live-classes');
        onClose();
      },
    },
    {
      id: 'nav-quizzes',
      title: 'Quizzes & Question Bank',
      subtitle: 'Manage MCQ tests, time limits, and negative marking',
      category: 'Navigation',
      icon: <Award className="w-4 h-4 text-amber-500" />,
      action: () => {
        onSelectTab('quizzes');
        onClose();
      },
    },
    {
      id: 'nav-orders',
      title: 'Orders & Sales Ledger',
      subtitle: 'Inspect student payments, Razorpay IDs, and refunds',
      category: 'Navigation',
      icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
      action: () => {
        onSelectTab('orders');
        onClose();
      },
    },
    {
      id: 'nav-coupons',
      title: 'Discount Coupons',
      subtitle: 'Manage promo codes, percentages, and usage caps',
      category: 'Navigation',
      icon: <Tag className="w-4 h-4 text-teal-500" />,
      action: () => {
        onSelectTab('coupons');
        onClose();
      },
    },
    {
      id: 'nav-notifications',
      title: 'Push Notifications Center',
      subtitle: 'Broadcast FCM push notifications to enrolled cohorts',
      category: 'Navigation',
      icon: <Bell className="w-4 h-4 text-violet-500" />,
      action: () => {
        onSelectTab('notifications');
        onClose();
      },
    },
    {
      id: 'nav-home',
      title: 'Home Screen Manager',
      subtitle: 'Order home feed sections and configure promotional banners',
      category: 'Navigation',
      icon: <Layers className="w-4 h-4 text-cyan-500" />,
      action: () => {
        onSelectTab('home-manager');
        onClose();
      },
    },
    {
      id: 'nav-students',
      title: 'Student Roster',
      subtitle: 'View registered users, enrollment status, and progress',
      category: 'Navigation',
      icon: <Users className="w-4 h-4 text-blue-500" />,
      action: () => {
        onSelectTab('students');
        onClose();
      },
    },
    {
      id: 'nav-support',
      title: 'Help Desk & Student Tickets',
      subtitle: 'Resolve inquiries, WhatsApp routing, and FAQs',
      category: 'Navigation',
      icon: <HelpCircle className="w-4 h-4 text-orange-500" />,
      action: () => {
        onSelectTab('support');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      title: 'Settings & Brand Tokens',
      subtitle: 'Configure primary colors, app identity, and maintenance mode',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4 text-slate-500" />,
      action: () => {
        onSelectTab('settings');
        onClose();
      },
    },

    // Quick Actions
    {
      id: 'act-new-course',
      title: 'Create New Course',
      subtitle: 'Add a new masterclass with curriculum to the catalog',
      category: 'Actions',
      icon: <PlusCircle className="w-4 h-4 text-brand-600" />,
      badge: 'Shortcut',
      action: () => {
        onSelectTab('courses');
        onClose();
      },
    },
    {
      id: 'act-broadcast',
      title: 'Broadcast Push Notification',
      subtitle: 'Send instant notification alert to all mobile app devices',
      category: 'Actions',
      icon: <Bell className="w-4 h-4 text-violet-600" />,
      badge: 'Broadcast',
      action: () => {
        onSelectTab('notifications');
        onClose();
      },
    },
    {
      id: 'act-theme',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: `Toggle UI appearance from ${theme} mode`,
      category: 'Preferences',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />,
      action: () => {
        toggleTheme();
        onClose();
      },
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-light-border dark:border-dark-border gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, or action..."
            className="flex-1 bg-transparent text-sm text-light-text dark:text-dark-text placeholder-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-dark-card px-2 py-0.5 rounded">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands or pages found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white dark:bg-dark-card shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-brand-500" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-dark-card/50 border-t border-light-border dark:border-dark-border flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
};
