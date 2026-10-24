import React, { useEffect, useState } from 'react';
import {
  Users,
  BookOpen,
  FolderTree,
  Image,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { NavTab } from '../components/layout/Sidebar';
import { RevenueChart } from '../components/common/RevenueChart';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalCategories: 0,
    activeBanners: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);

  useEffect(() => {
    // 1. Live listener for courses
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pubCount = list.filter((c: any) => c.isPublished !== false).length;
      setMetrics((prev) => ({
        ...prev,
        totalCourses: snap.size,
        publishedCourses: pubCount,
      }));
      setRecentCourses(list.slice(0, 4));
      setLoading(false);
    });

    // 2. Live listener for users (students)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setMetrics((prev) => ({ ...prev, totalStudents: snap.size }));
    });

    // 3. Live listener for categories
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      setMetrics((prev) => ({ ...prev, totalCategories: snap.size }));
    });

    // 4. Live listener for banners
    const unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
      const activeCount = snap.docs.filter((d) => d.data()?.isVisible !== false).length;
      setMetrics((prev) => ({ ...prev, activeBanners: activeCount }));
    });

    // 5. Live listener for orders & sales
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const paidOrders = orders.filter((o: any) => o.status === 'paid');
      const revenue = paidOrders.reduce((sum, o: any) => sum + (Number(o.amount) || 0), 0);
      setOrdersList(orders);
      setMetrics((prev) => ({
        ...prev,
        totalOrders: paidOrders.length,
        totalRevenue: revenue,
      }));
    });

    return () => {
      unsubCourses();
      unsubUsers();
      unsubCats();
      unsubBanners();
      unsubOrders();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-brand-200 text-xs font-semibold mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Phase 2 Admin Engine Active</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
            Welcome to YouTube Sikho Academy Portal
          </h2>
          <p className="mt-2 text-sm text-brand-100/90 leading-relaxed">
            Manage your courses, curriculum video lessons, dynamic home layout sections, brand theme settings, and student roster in real-time.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="accent"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => onNavigate('courses')}
            >
              Add New Course
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={() => onNavigate('home-manager')}
            >
              Manage Home Screen
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-light-text dark:text-dark-text">
              {loading ? '...' : metrics.totalStudents}
            </span>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real-time registered users</span>
            </div>
          </div>
        </div>

        {/* Total Courses */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Published Courses
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-light-text dark:text-dark-text">
              {loading ? '...' : metrics.publishedCourses}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">
              / {metrics.totalCourses} total
            </span>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{metrics.totalCourses - metrics.publishedCourses} draft items</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Categories
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-light-text dark:text-dark-text">
              {loading ? '...' : metrics.totalCategories}
            </span>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Active learning topics
            </div>
          </div>
        </div>

        {/* Active Banners */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Banners
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Image className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-display font-extrabold text-light-text dark:text-dark-text">
              {loading ? '...' : metrics.activeBanners}
            </span>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Live mobile hero carousels
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Sales Placeholder & Recent Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Revenue Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm">
          <RevenueChart orders={ordersList} />
        </div>

        {/* Quick Management Shortcuts (1 Col) */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-light-text dark:text-dark-text">
              Quick Actions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Frequent management shortcuts
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('categories')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2.5">
                  <FolderTree className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Reorder Categories</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('home-manager')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2.5">
                  <Image className="w-4 h-4 text-amber-500" />
                  <span>Update Promotional Banners</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>App Theme & WhatsApp Support</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border text-center">
            <span className="text-[11px] text-slate-400">
              White-label client: YouTube Sikho Academy
            </span>
          </div>
        </div>
      </div>

      {/* Recent Courses List */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
          <div>
            <h3 className="text-base font-bold font-display text-light-text dark:text-dark-text">
              Active Courses in Catalog
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of seeded courses and status
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('courses')}
            icon={<ArrowUpRight className="w-4 h-4" />}
          >
            View All
          </Button>
        </div>

        <div className="mt-4 divide-y divide-light-border dark:divide-dark-border">
          {recentCourses.map((c) => (
            <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={c.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100'}
                  alt={c.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-light-border dark:border-dark-border"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-light-text dark:text-dark-text truncate">
                    {c.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Instructor: {c.instructor} • ₹{c.discountPrice || c.price}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {c.isPublished ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    Published
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                    Draft
                  </span>
                )}
                {c.isFeatured && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-800">
                    Featured
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
