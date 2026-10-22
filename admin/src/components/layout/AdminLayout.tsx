import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';

interface AdminLayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
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
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
