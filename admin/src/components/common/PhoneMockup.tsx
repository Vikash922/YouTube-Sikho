import React, { useState } from 'react';
import { brandConfig } from '../../config/branding';
import {
  Wifi,
  Battery,
  Signal,
  Bell,
  Search,
  Flame,
  Radio,
  Star,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Home,
  BookOpen,
  PlayCircle,
  Play,
  User,
} from 'lucide-react';
import { AdminBanner, AdminHomeSection } from '../../pages/HomeManager';

interface PhoneMockupProps {
  banners: AdminBanner[];
  sections: AdminHomeSection[];
  brandName?: string;
  primaryColor?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  banners,
  sections,
  brandName = brandConfig.shortName,
  primaryColor = brandConfig.primaryColor,
}) => {
  const [mockTheme, setMockTheme] = useState<'light' | 'dark'>('dark');
  const activeBanners = banners.filter((b) => b.isVisible !== false);
  const visibleSections = [...sections]
    .filter((s) => s.isVisible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const isDark = mockTheme === 'dark';

  return (
    <div className="flex flex-col items-center">
      {/* Device Toolbar Controls */}
      <div className="mb-3 flex items-center justify-between w-full max-w-[320px] px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Interactive Preview</span>
        </div>
        <button
          onClick={() => setMockTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          {isDark ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-500" />}
          <span>{isDark ? 'Light App' : 'Dark App'}</span>
        </button>
      </div>

      {/* Phone Shell / Bezel */}
      <div
        className={`w-[320px] h-[640px] rounded-[44px] p-3 shadow-2xl relative transition-all duration-300 select-none ${
          isDark
            ? 'bg-slate-900 border-[6px] border-slate-700 shadow-slate-950/80'
            : 'bg-slate-100 border-[6px] border-slate-300 shadow-slate-400/30'
        }`}
      >
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mr-2" />
        </div>

        {/* Inner Screen Canvas */}
        <div
          className={`w-full h-full rounded-[36px] overflow-hidden flex flex-col relative transition-colors ${
            isDark ? 'bg-[#0B1020] text-slate-100' : 'bg-slate-50 text-slate-800'
          }`}
        >
          {/* Status Bar */}
          <div className="pt-2 px-5 pb-1 flex items-center justify-between text-[11px] font-mono shrink-0">
            <span className="font-bold">9:41</span>
            <div className="flex items-center gap-1.5 opacity-80">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* App Header */}
          <div className="px-4 py-2 flex items-center justify-between shrink-0">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Good morning</div>
              <div className="text-xs font-extrabold truncate max-w-[170px] flex items-center gap-1">
                <span>{brandName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                Y
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-1.5 shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] ${
                isDark ? 'bg-[#151B2E] text-slate-400 border border-slate-800' : 'bg-white text-slate-400 border border-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search masterclasses, topics...</span>
            </div>
          </div>

          {/* Scrollable Home Feed Preview */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 no-scrollbar">
            {/* 1. Hero Carousel Preview */}
            {activeBanners.length > 0 ? (
              <div className="w-full h-28 rounded-2xl overflow-hidden relative shadow-md bg-slate-800">
                <img
                  src={activeBanners[0].imageUrl}
                  alt={activeBanners[0].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                    FEATURED
                  </span>
                  <span className="text-xs font-bold text-white leading-tight truncate">
                    {activeBanners[0].title || 'Special Masterclass Banner'}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="w-full h-28 rounded-2xl p-3 text-white flex flex-col justify-between shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, #312E81)`,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderBottomRightRadius: 24,
                  borderBottomLeftRadius: 8,
                }}
              >
                <div className="flex items-center gap-1 text-[9px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full w-fit">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>MASTERCLASS</span>
                </div>
                <div>
                  <div className="text-xs font-extrabold">{brandName} Academy</div>
                  <div className="text-[10px] text-white/80 line-clamp-1">
                    Structured video training for serious creators
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Ordered Sections */}
            {visibleSections.map((sec) => {
              if (sec.type === 'banners') return null; // Already shown in top carousel

              if (sec.type === 'live_stream' || sec.type === 'liveNow') {
                return (
                  <div
                    key={sec.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isDark
                        ? 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <div>
                        <div className="text-[11px] font-bold flex items-center gap-1 text-rose-500">
                          <Radio className="w-3 h-3" />
                          <span>LIVE STREAMING NOW</span>
                        </div>
                        <div className="text-[10px] opacity-80">
                          {sec.title || 'Interactive Masterclass'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">
                      JOIN
                    </span>
                  </div>
                );
              }

              if (sec.type === 'continueWatching') {
                return (
                  <div
                    key={sec.id}
                    className={`p-2.5 rounded-xl border ${
                      isDark ? 'bg-[#151B2E] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span>{sec.title || 'Continue Learning'}</span>
                      <span className="text-[9px] text-brand-500">Resume</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold truncate">Lesson 4: Thumbnail Masterclass</div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-brand-500 h-full w-2/3 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.type === 'categories') {
                return (
                  <div key={sec.id} className="space-y-1.5">
                    <div className="text-[11px] font-bold">{sec.title || 'Explore Topics'}</div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      {['YouTube SEO', 'Shorts', 'Editing', 'Monetization'].map((cat) => (
                        <span
                          key={cat}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold whitespace-nowrap border ${
                            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }

              if (sec.type === 'streak_banner' || sec.type === 'streak') {
                return (
                  <div
                    key={sec.id}
                    className={`p-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-[#151B2E] border-slate-800'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Flame className="w-3.5 h-3.5 fill-amber-500" />
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>3-Day Streak</span>
                      </div>
                      <span className="text-[9px] text-emerald-500 font-bold">ON TRACK</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full w-3/5 rounded-full" />
                    </div>
                  </div>
                );
              }

              // Courses Sections (newCourses, featured, popular)
              return (
                <div key={sec.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>{sec.title}</span>
                    <span className="text-[9px] text-brand-500">See all</span>
                  </div>

                  {/* Sample Course Mini Card */}
                  <div
                    className={`p-2 rounded-xl border flex gap-2.5 ${
                      isDark ? 'bg-[#151B2E] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-slate-700 shrink-0 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-tr from-brand-600 to-indigo-700 flex items-center justify-center text-white text-[10px] font-bold">
                        PRO
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                      <div className="text-[10px] font-bold truncate">
                        YouTube Mastery 2026: 0 to 100k
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <Clock className="w-2.5 h-2.5" />
                        <span>12 Hours</span>
                        <span>•</span>
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        <span>4.9</span>
                      </div>
                      <div className="text-[11px] font-bold text-brand-500 font-mono">
                        ₹999
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Floating Tab Bar */}
          <div
            className={`h-12 border-t px-4 flex items-center justify-around shrink-0 text-[10px] ${
              isDark ? 'bg-[#0B1020]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex flex-col items-center text-brand-500 font-bold">
              <Home className="w-4 h-4" />
              <span className="text-[8px] mt-0.5">Home</span>
            </div>
            <div className="flex flex-col items-center">
              <BookOpen className="w-4 h-4" />
              <span className="text-[8px] mt-0.5">Courses</span>
            </div>
            <div className="flex flex-col items-center">
              <Radio className="w-4 h-4" />
              <span className="text-[8px] mt-0.5">Live</span>
            </div>
            <div className="flex flex-col items-center">
              <PlayCircle className="w-4 h-4" />
              <span className="text-[8px] mt-0.5">Learning</span>
            </div>
            <div className="flex flex-col items-center">
              <User className="w-4 h-4" />
              <span className="text-[8px] mt-0.5">Profile</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
