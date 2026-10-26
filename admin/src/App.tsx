import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { Orders } from './pages/Orders';
import { Coupons } from './pages/Coupons';
import { Notifications } from './pages/Notifications';
import { LiveClasses } from './pages/LiveClasses';
import { Quizzes } from './pages/Quizzes';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { Categories } from './pages/Categories';
import { Materials } from './pages/Materials';
import { HomeManager } from './pages/HomeManager';
import { Students } from './pages/Students';
import { ActivityLog } from './pages/ActivityLog';
import { Admins } from './pages/Admins';
import { NotFound } from './pages/NotFound';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicCertificateVerify } from './pages/PublicCertificateVerify';
import { PublicAccountDeletion } from './pages/PublicAccountDeletion';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { brandConfig } from './config/branding';

// Protected Route Wrapper with Role-Based Access Control
interface ProtectedProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'editor' | 'support')[];
}

const ProtectedRoute: React.FC<ProtectedProps> = ({ children, allowedRoles }) => {
  const { user, isAdmin, adminData, loading } = useAuth();
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role restrictions
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (adminData?.role || 'editor') as 'owner' | 'editor' | 'support';
    if (!allowedRoles.includes(userRole) && userRole !== 'owner') {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-dark-surface border border-red-200 dark:border-red-900/40 rounded-card p-6 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-light-text dark:text-dark-text mb-1">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Your role <code className="font-mono text-red-600 dark:text-red-400 font-bold">[{userRole}]</code> does not have permission to view or manage this administrative section.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Document title synchronization component
const DocumentTitleSync: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const pageName = location.pathname.split('/')[1] || 'Dashboard';
    const formatted = pageName.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    document.title = `${formatted} | ${brandConfig.shortName} Admin`;
  }, [location.pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <DocumentTitleSync />
      <ErrorBoundary fallbackTitle="Application Error">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/delete-account" element={<PublicAccountDeletion />} />
          <Route path="/verify" element={<PublicCertificateVerify />} />
          <Route path="/verify/:id" element={<PublicCertificateVerify />} />

          {/* Admin Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard onNavigate={() => {}} />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<Courses />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/live" element={<LiveClasses />} />
            <Route path="/live-classes" element={<Navigate to="/live" replace />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/home-manager" element={<HomeManager />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/support" element={<Support />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['owner', 'editor']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/students" element={<Students />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/activity-log" element={<Navigate to="/activity" replace />} />
            <Route
              path="/admins"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <Admins />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};
