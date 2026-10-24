import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  BookOpen,
  Layers,
  Sliders,
  Users,
  CreditCard,
  Tag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Radio,
  FileQuestion,
  LifeBuoy,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'courses'
  | 'live-classes'
  | 'quizzes'
  | 'notifications'
  | 'orders'
  | 'payment-gateway'
  | 'coupons'
  | 'categories'
  | 'home-manager'
  | 'support'
  | 'settings'
  | 'students';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { signOut, adminData } = useAuth();

  const NAV_ITEMS: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'courses', label: 'Courses & Videos', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'live-classes', label: 'Live Classes', icon: <Radio className="w-5 h-5" /> },
    { id: 'quizzes', label: 'Quizzes & Tests', icon: <FileQuestion className="w-5 h-5" /> },
    { id: 'notifications', label: 'Push Notifications', icon: <Bell className="w-5 h-5" /> },
    { id: 'orders', label: 'Orders & Sales', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'payment-gateway', label: 'UPI Gateway & QR', icon: <QrCode className="w-5 h-5 text-emerald-500" />, badge: '0%' },
    { id: 'coupons', label: 'Coupons', icon: <Tag className="w-5 h-5" /> },
    { id: 'categories', label: 'Categories', icon: <FolderTree className="w-5 h-5" /> },
    { id: 'home-manager', label: 'Home Manager', icon: <Layers className="w-5 h-5" /> },
    { id: 'support', label: 'Help & Tickets', icon: <LifeBuoy className="w-5 h-5" /> },
    { id: 'settings', label: 'App Settings', icon: <Sliders className="w-5 h-5" /> },
    { id: 'students', label: 'Students', icon: <Users className="w-5 h-5" /> },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <aside
      className={`h-full flex flex-col justify-between bg-white dark:bg-dark-surface border-r border-light-border dark:border-dark-border transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-light-border dark:border-dark-border">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm tracking-tight text-light-text dark:text-dark-text truncate">
                  YouTube Sikho
                </span>
                <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
          )}

          {/* Collapse Toggle for Desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-btn text-sm font-medium transition-all duration-150 select-none ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 shadow-sm border border-brand-200 dark:border-brand-900/50 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile & Sign Out Footer */}
      <div className="p-3 border-t border-light-border dark:border-dark-border">
        {!collapsed ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-card border border-light-border/60 dark:border-dark-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-600/20 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                {adminData?.email ? adminData.email.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-light-text dark:text-dark-text truncate">
                  {adminData?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {adminData?.email || 'admin@youtubesikho.com'}
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center p-2.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
