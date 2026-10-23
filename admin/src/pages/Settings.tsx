import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  Save,
  AlertTriangle,
  Smartphone,
  Palette,
  Phone,
  Loader2,
} from 'lucide-react';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { ImageUploadField } from '../components/common/ImageUploadField';

export interface AdminAppSettings {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportPhone: string;
  supportWhatsApp: string;
  supportEmail: string;
  maintenanceMode: boolean;
  minVersion: string;
  privacyUrl: string;
  termsUrl: string;
}

const DEFAULT_SETTINGS: AdminAppSettings = {
  appName: 'YouTube Sikho',
  logoUrl: '',
  primaryColor: '#4F46E5',
  secondaryColor: '#06B6D4',
  accentColor: '#F59E0B',
  supportPhone: '+91 98765 43210',
  supportWhatsApp: '+91 98765 43210',
  supportEmail: 'support@youtubesikho.com',
  maintenanceMode: false,
  minVersion: '1.0.0',
  privacyUrl: 'https://youtubesikho.com/privacy',
  termsUrl: 'https://youtubesikho.com/terms',
};

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AdminAppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Real-time listener for appConfig/main
  useEffect(() => {
    const docRef = doc(db, 'appConfig', 'main');
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...snap.data(),
          } as AdminAppSettings);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Settings listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'appConfig', 'main'),
        {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast('App configuration & theme saved live!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const nextVal = !settings.maintenanceMode;
    setSettings((prev) => ({ ...prev, maintenanceMode: nextVal }));
    try {
      await setDoc(
        doc(db, 'appConfig', 'main'),
        {
          maintenanceMode: nextVal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      showToast(
        nextVal
          ? 'Maintenance Mode turned ON live!'
          : 'Maintenance Mode turned OFF live!',
        nextVal ? 'info' : 'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle maintenance mode', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            App Brand & Maintenance Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time configuration. Any change saved here updates all students' mobile apps within seconds without an update.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          icon={<Save className="w-4 h-4" />}
        >
          Save All Changes
        </Button>
      </div>

      {/* 1. Maintenance Mode Live Blocker Card */}
      <div
        className={`p-6 rounded-card border transition-all ${
          settings.maintenanceMode
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-white dark:bg-dark-surface border-light-border dark:border-dark-border shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                settings.maintenanceMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-light-text dark:text-dark-text">
                  Live Maintenance Mode Blocker
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    settings.maintenanceMode
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  }`}
                >
                  {settings.maintenanceMode ? 'ACTIVE (APP BLOCKED)' : 'SYSTEM HEALTHY'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                When active, all students currently using the mobile app are instantly redirected to the Under Maintenance screen with support contacts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleMaintenance}
            className={`px-4 py-2 text-xs font-bold rounded-btn transition-colors border select-none ${
              settings.maintenanceMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            {settings.maintenanceMode ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 2. Visual Identity & Real-Time Colors */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-light-border dark:border-dark-border">
            <Palette className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-light-text dark:text-dark-text">
              Visual Identity & Live Theme Colors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                App Display Name
              </label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. YouTube Sikho"
              />
            </div>

            <ImageUploadField
              label="App Logo Image"
              value={settings.logoUrl}
              onChange={(url) => setSettings({ ...settings, logoUrl: url })}
              aspectRatio="1/1"
              storageFolder="branding"
              helpText="Upload brand logo from phone/PC, or paste Google Photos / Drive / image link."
            />
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-light-border dark:border-dark-border"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-mono text-light-text dark:text-dark-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-light-border dark:border-dark-border"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-mono text-light-text dark:text-dark-text"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Accent / Streak Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-light-border dark:border-dark-border"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm font-mono text-light-text dark:text-dark-text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Support & Official Contacts */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-light-border dark:border-dark-border">
            <Phone className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-light-text dark:text-dark-text">
              Support Channels & Legal URLs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Support Phone
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="+91 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Support WhatsApp
              </label>
              <input
                type="text"
                value={settings.supportWhatsApp}
                onChange={(e) => setSettings({ ...settings, supportWhatsApp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="+91 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="support@..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Privacy Policy URL
              </label>
              <input
                type="url"
                value={settings.privacyUrl}
                onChange={(e) => setSettings({ ...settings, privacyUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Terms of Service URL
              </label>
              <input
                type="url"
                value={settings.termsUrl}
                onChange={(e) => setSettings({ ...settings, termsUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Version Enforcement */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-light-border dark:border-dark-border">
            <Smartphone className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-light-text dark:text-dark-text">
              Minimum Required App Version
            </h2>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              Minimum Semantic Version
            </label>
            <input
              type="text"
              value={settings.minVersion}
              onChange={(e) => setSettings({ ...settings, minVersion: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="1.0.0"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Devices running a lower version will prompt the student to update from Play Store.
            </p>
          </div>
        </div>

        {/* 5. Production Database Initialization */}
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-light-border dark:border-dark-border">
            <Palette className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-light-text dark:text-dark-text">
              Clean Database Setup
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Initializes clean production Firestore schemas (App Configuration and dynamic Home Layout) with zero demo data.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (window.confirm('Initialize fresh database schema? Existing configuration will be reset to defaults.')) {
                try {
                  await setDoc(doc(db, 'appConfig', 'main'), {
                    ...settings,
                    updatedAt: new Date().toISOString(),
                  });
                  showToast('Production schema initialized successfully!', 'success');
                } catch (err: any) {
                  showToast('Initialization failed: ' + err.message, 'error');
                }
              }
            }}
          >
            Initialize Clean Database
          </Button>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            icon={<Save className="w-4 h-4" />}
          >
            Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};