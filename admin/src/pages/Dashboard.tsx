import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  TrendingUp,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Circle,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { NavTab } from '../components/layout/Sidebar';
import { RevenueChart } from '../components/common/RevenueChart';
import { brandConfig } from '../config/branding';

interface DashboardProps {
  onNavigate?: (tab: NavTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    blockedStudents: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalCategories: 0,
    activeBanners: 0,
    totalQuizzes: 0,
    totalOrders: 0,
    totalRevenue: 0,
    todayOrders: 0,
    todayRevenue: 0,
    todaySignups: 0,
  });

  const [loading, setLoading] = useState(true);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    document.title = `Dashboard Overview | ${brandConfig.shortName} Admin`;

    // 1. Live listener for stats/dashboard (cost: 1 document read only!)
    const unsubStats = onSnapshot(doc(db, 'stats', 'dashboard'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setMetrics((prev) => ({
          ...prev,
          totalStudents: d.totalStudents || prev.totalStudents,
          blockedStudents: d.blockedStudents || prev.blockedStudents,
          totalOrders: d.totalOrders || prev.totalOrders,
          totalRevenue: Math.round((d.totalRevenuePaise || 0) / 100) || prev.totalRevenue,
          todayOrders: d.todayOrders || 0,
          todayRevenue: Math.round((d.todayRevenuePaise || 0) / 100) || 0,
          todaySignups: d.todaySignups || 0,
        }));
      }
    });

    // 2. Fetch server aggregations (cost: 1 read per 1,000 index items)
    const loadAggregations = async () => {
      try {
        const [
          coursesCount,
          pubCoursesCount,
          categoriesCount,
          bannersCount,
          quizzesCount,
          usersCount,
          blockedCount,
          ordersPaidCount,
        ] = await Promise.all([
          getCountFromServer(collection(db, 'courses')),
          getCountFromServer(query(collection(db, 'courses'), where('isPublished', '==', true))),
          getCountFromServer(collection(db, 'categories')),
          getCountFromServer(query(collection(db, 'banners'), where('isVisible', '==', true))),
          getCountFromServer(collection(db, 'quizzes')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'users'), where('isBlocked', '==', true))),
          getCountFromServer(query(collection(db, 'orders'), where('status', '==', 'paid'))),
        ]);

        setMetrics((prev) => ({
          ...prev,
          totalCourses: coursesCount.data().count,
          publishedCourses: pubCoursesCount.data().count,
          totalCategories: categoriesCount.data().count,
          activeBanners: bannersCount.data().count,
          totalQuizzes: quizzesCount.data().count,
          totalStudents: Math.max(0, usersCount.data().count - blockedCount.data().count),
          blockedStudents: blockedCount.data().count,
          totalOrders: ordersPaidCount.data().count,
        }));

        // 3. Fetch limited recent documents (cost: 5 + 10 reads)
        const [recentCoursesSnap, recentOrdersSnap] = await Promise.all([
          getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc'), limit(4))),
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(10))),
        ]);

        setRecentCourses(recentCoursesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setRecentOrders(recentOrdersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('Dashboard aggregation notice:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAggregations();

    return () => {
      unsubStats();
    };
  }, []);

  // Checklist for Empty Accounts
  const checklist = [
    { label: 'Set App Name & Branding', done: Boolean(brandConfig.appName), path: '/settings' },
    { label: 'Create First Course Category', done: metrics.totalCategories > 0, path: '/categories' },
    { label: 'Publish Your First Course', done: metrics.totalCourses > 0, path: '/courses' },
    { label: 'Upload Hero Banner', done: metrics.activeBanners > 0, path: '/home-manager' },
    { label: 'Add Practice Quiz', done: metrics.totalQuizzes > 0, path: '/quizzes' },
  ];
  const allChecklistDone = checklist.every((c) => c.done);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-card bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-brand-200 text-xs font-semibold mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Administrator Console</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
            Welcome to {brandConfig.appName} Portal
          </h2>
          <p className="mt-2 text-sm text-brand-100/90 leading-relaxed">
            Manage your courses, curriculum video lessons, dynamic home layout sections, brand theme settings, and student roster in real-time.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="accent"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => navigate('/courses')}
            >
              Add New Course
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              icon={<ArrowUpRight className="w-4 h-4" />}
              onClick={() => navigate('/home-manager')}
            >
              Customize Home
            </Button>
          </div>
        </div>
      </div>

      {/* Getting Started Checklist (Auto-hidden when all steps complete) */}
      {!allChecklistDone && !loading && (
        <div className="bg-white dark:bg-dark-surface rounded-card border border-amber-200 dark:border-amber-900/40 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border mb-4">
            <div>
              <h3 className="text-sm font-bold text-light-text dark:text-dark-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Getting Started Checklist</span>
              </h3>
              <p className="text-xs text-slate-500">
                Complete these initial milestones to launch your branded academy
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full">
              {checklist.filter((c) => c.done).length} / {checklist.length} Complete
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {checklist.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all ${
                  item.done
                    ? 'bg-slate-50 dark:bg-dark-bg/60 border-emerald-500/30 text-slate-700 dark:text-slate-300'
                    : 'bg-white dark:bg-dark-surface border-light-border dark:border-dark-border hover:border-brand-500 text-light-text dark:text-dark-text'
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className={`truncate ${item.done ? 'line-through opacity-75' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Key Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Students */}
        <div className="bg-white dark:bg-dark-surface rounded-card p-5 border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Learners
            </span>
            <div className="text-2xl font-extrabold font-display text-light-text dark:text-dark-text mt-1">
              {metrics.totalStudents}
            </div>
            {metrics.blockedStudents > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-red-500 mt-1">
                <ShieldAlert className="w-3 h-3" />
                <span>{metrics.blockedStudents} suspended</span>
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Courses */}
        <div className="bg-white dark:bg-dark-surface rounded-card p-5 border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Courses in Catalog
            </span>
            <div className="text-2xl font-extrabold font-display text-light-text dark:text-dark-text mt-1">
              {metrics.totalCourses}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              {metrics.publishedCourses} Published
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-dark-surface rounded-card p-5 border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Paid Enrollments
            </span>
            <div className="text-2xl font-extrabold font-display text-light-text dark:text-dark-text mt-1">
              {metrics.totalOrders}
            </div>
            <span className="text-[11px] text-brand-600 font-semibold mt-1 block">
              +{metrics.todayOrders} today
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-dark-surface rounded-card p-5 border border-light-border dark:border-dark-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Revenue
            </span>
            <div className="text-2xl font-extrabold font-display text-light-text dark:text-dark-text mt-1">
              ₹{metrics.totalRevenue.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              +₹{metrics.todayRevenue.toLocaleString('en-IN')} today
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueChart orders={recentOrders} />

      {/* Two-Column Section: Recent Courses & Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses List */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border">
            <div>
              <h3 className="text-base font-bold font-display text-light-text dark:text-dark-text">
                Active Courses in Catalog
              </h3>
              <p className="text-xs text-slate-500">Recently updated masterclasses</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowUpRight className="w-4 h-4" />}
              onClick={() => navigate('/courses')}
            >
              View All
            </Button>
          </div>

          <div className="divide-y divide-light-border dark:divide-dark-border mt-2">
            {recentCourses.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No courses published yet. Click "Add New Course" above to create your first course.
              </div>
            ) : (
              recentCourses.map((course) => (
                <div key={course.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-dark-bg overflow-hidden flex-shrink-0 border border-light-border dark:border-dark-border">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-light-text dark:text-dark-text truncate">
                        {course.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-brand-600 dark:text-brand-400">
                          ₹{course.price || 0}
                        </span>
                        <span>•</span>
                        <span>{course.category || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      course.isPublished !== false
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {course.isPublished !== false ? 'Live' : 'Draft'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Navigation Card */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-light-text dark:text-dark-text pb-4 border-b border-light-border dark:border-dark-border">
              Quick Shortcuts
            </h3>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate('/materials')}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/60 text-xs font-semibold flex items-center justify-between text-left transition-colors"
              >
                <span>Upload PDF Study Notes</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/live')}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/60 text-xs font-semibold flex items-center justify-between text-left transition-colors"
              >
                <span>Schedule Live Class</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/notifications')}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/60 text-xs font-semibold flex items-center justify-between text-left transition-colors"
              >
                <span>Broadcast Push Alert</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/settings')}
                className="w-full p-2.5 rounded-xl border border-light-border dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg/60 text-xs font-semibold flex items-center justify-between text-left transition-colors"
              >
                <span>App Theme & Brand Tokens</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-light-border dark:border-dark-border text-center">
            <span className="text-[11px] text-slate-400">
              White-label client: {brandConfig.appName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
