import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { Orders } from './pages/Orders';
import { PaymentGateway } from './pages/PaymentGateway';
import { Coupons } from './pages/Coupons';
import { Notifications } from './pages/Notifications';
import { LiveClasses } from './pages/LiveClasses';
import { Quizzes } from './pages/Quizzes';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { Categories } from './pages/Categories';
import { HomeManager } from './pages/HomeManager';
import { Students } from './pages/Students';
import { AdminLayout } from './components/layout/AdminLayout';
import { NavTab } from './components/layout/Sidebar';

export const App: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-bg dark:bg-dark-bg transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600 dark:text-brand-400" />
            <span>Verifying Administrator Access...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Login />;
  }

  return (
    <AdminLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
      {activeTab === 'categories' && <Categories />}
      {activeTab === 'courses' && <Courses />}
      {activeTab === 'live-classes' && <LiveClasses />}
      {activeTab === 'quizzes' && <Quizzes />}
      {activeTab === 'orders' && <Orders />}
      {activeTab === 'payment-gateway' && <PaymentGateway />}
      {activeTab === 'coupons' && <Coupons />}
      {activeTab === 'notifications' && <Notifications />}
      {activeTab === 'home-manager' && <HomeManager />}
      {activeTab === 'support' && <Support />}
      {activeTab === 'settings' && <Settings />}
      {activeTab === 'students' && <Students />}
    </AdminLayout>
  );
};
