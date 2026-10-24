import React, { useState, useEffect } from 'react';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Save,
  CreditCard,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { Course, Order } from '../types';

export const PaymentGateway: React.FC = () => {
  const { showToast } = useToast();

  // Gateway Settings State
  const [upiId, setUpiId] = useState('7848894498@ibl');
  const [payeeName, setPayeeName] = useState('YouTube Sikho');
  const [testAmount, setTestAmount] = useState('499');
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Gateway Status State
  const [copiedLink, setCopiedLink] = useState(false);
  const [webCheckoutCourseId, setWebCheckoutCourseId] = useState('');

  // Manual UTR Verification state
  const [utrInput, setUtrInput] = useState('');
  const [studentUidInput, setStudentUidInput] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [verifyingUtr, setVerifyingUtr] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  // Recent UPI Orders
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // 1. Listen to real-time payment config from Firestore
  useEffect(() => {
    const configRef = doc(db, 'appConfig', 'payment');
    const unsubscribe = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.merchantUpiId) setUpiId(data.merchantUpiId);
        if (data.payeeName) setPayeeName(data.payeeName);
      } else {
        // Initialize with default 7848894498@ibl
        setDoc(
          configRef,
          {
            merchantUpiId: '7848894498@ibl',
            payeeName: 'YouTube Sikho',
            gatewayMode: 'direct_upi',
            zeroCommission: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch courses for manual enrollment dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Course[];
        setCourses(list);
        if (list.length > 0 && !selectedCourseId) {
          setSelectedCourseId(list[0].id);
        }
      } catch (err) {
        console.warn('Failed to fetch courses:', err);
      }
    };
    fetchCourses();
  }, []);

  // 3. Listen to recent orders
  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Order[];
      setRecentOrders(items);
      setLoadingOrders(false);
    });

    return () => unsubscribe();
  }, []);

  // Set default web checkout course when courses load
  useEffect(() => {
    if (courses.length > 0 && !webCheckoutCourseId) {
      setWebCheckoutCourseId(courses[0].id);
    }
  }, [courses, webCheckoutCourseId]);

  // Save UPI Configuration
  const handleSaveSettings = async () => {
    const cleanUpi = upiId.trim();
    if (!cleanUpi || !cleanUpi.includes('@')) {
      showToast('Please enter a valid UPI ID (e.g. 7848894498@ibl)', 'error');
      return;
    }

    setSavingSettings(true);
    try {
      await setDoc(
        doc(db, 'appConfig', 'payment'),
        {
          merchantUpiId: cleanUpi,
          payeeName: payeeName.trim() || 'YouTube Sikho',
          gatewayMode: 'direct_upi',
          zeroCommission: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast(`UPI ID updated to ${cleanUpi}. Real-time synced to mobile app!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Copy UPI ID to clipboard
  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      showToast(`Copied ${upiId} to clipboard`, 'success');
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // Manual UTR Verification & Instant Unlock
  const handleManualUtrUnlock = async () => {
    const cleanUtr = utrInput.trim();
    const cleanUid = studentUidInput.trim();

    if (!cleanUtr || cleanUtr.length < 6) {
      showToast('Please enter a valid 6 to 12-digit Bank UTR number', 'error');
      return;
    }
    if (!cleanUid) {
      showToast('Please enter the Student UID', 'error');
      return;
    }
    if (!selectedCourseId) {
      showToast('Please select a course to unlock', 'error');
      return;
    }

    const course = courses.find((c) => c.id === selectedCourseId);
    const courseTitle = course?.title || 'Course Enrollment';
    const amount = Number(course?.discountPrice || course?.price || 499);

    setVerifyingUtr(true);
    try {
      const orderId = `ORD_MANUAL_${Date.now()}`;
      const enrollmentId = `${cleanUid}_${selectedCourseId}`;

      // 1. Create paid order document
      await setDoc(doc(db, 'orders', orderId), {
        id: orderId,
        orderId,
        uid: cleanUid,
        courseId: selectedCourseId,
        courseTitle,
        amount,
        finalPrice: amount,
        currency: 'INR',
        status: 'paid',
        utr: cleanUtr,
        paymentId: `manual_${cleanUtr}`,
        gateway: 'youpi_manual_verified',
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
      });

      // 2. Provision student enrollment
      await setDoc(
        doc(db, 'enrollments', enrollmentId),
        {
          uid: cleanUid,
          courseId: selectedCourseId,
          orderId,
          utr: cleanUtr,
          paymentId: `manual_${cleanUtr}`,
          active: true,
          source: 'admin_manual_utr_verification',
          enrolledAt: new Date().toISOString(),
        },
        { merge: true }
      );

      showToast(`Payment verified! Course successfully unlocked for ${cleanUid}`, 'success');
      setUtrInput('');
      setStudentUidInput('');
    } catch (err: any) {
      showToast(err.message || 'Failed to verify UTR and enroll student', 'error');
    } finally {
      setVerifyingUtr(false);
    }
  };

  // Construct Dynamic UPI URI
  const amountNumber = Number(testAmount) || 499;
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amountNumber.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    `Course Enrollment - ${payeeName}`
  )}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    upiIntentUri
  )}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display text-light-text dark:text-dark-text flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-500" />
              UPI Payment Gateway & Settlement Hub
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              0% Gateway Fees
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Direct peer-to-peer UPI payments to <strong>{upiId}</strong>. Zero aggregator cuts, instant bank credit, and real-time UTR verification.
          </p>
        </div>

        {/* Server Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>All-in-One Admin Gateway (Port :5173 · 0% Fee)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Settings + Right QR Code Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Active UPI Account Setup + Manual UTR Tool */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Active UPI Receiver Configuration */}
          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold font-display text-sm text-light-text dark:text-dark-text">
                  Active UPI Receiving Account (P2P Bank Settlement)
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Live in Mobile App
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Whenever a student buys a course through Google Pay, PhonePe, Paytm, or BHIM, the money is transferred directly to this UPI address.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Receiving UPI ID (VPA)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 7848894498@ibl"
                    className="w-full pl-3 pr-24 py-2.5 text-sm font-mono font-bold rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={handleCopyUpi}
                    className="absolute right-2 top-2 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-700 border border-light-border dark:border-dark-border text-slate-600 dark:text-slate-200 hover:text-brand-600 flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payee Display Name
                </label>
                <input
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="e.g. YouTube Sikho"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-amber-800 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  All payments from Android & iOS students will settle into <strong>{upiId}</strong>. Changes saved here sync instantly across all devices.
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  loading={savingSettings}
                  onClick={handleSaveSettings}
                  icon={<Save className="w-4 h-4" />}
                >
                  Save & Push to Mobile App
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Manual Bank UTR Verifier & Instant Student Enroller */}
          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold font-display text-sm text-light-text dark:text-dark-text">
                Manual UTR Verification & Instant Student Unlock
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              If a student paid via UPI offline or sent their screenshot, enter their 12-digit UTR and UID below to instantly unlock their course.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  12-Digit Bank UTR / Reference No.
                </label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 429812984124"
                  maxLength={12}
                  className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student UID
                </label>
                <input
                  type="text"
                  value={studentUidInput}
                  onChange={(e) => setStudentUidInput(e.target.value)}
                  placeholder="e.g. user_abc123"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Course to Unlock
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (₹{c.discountPrice || c.price})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="primary"
                size="sm"
                loading={verifyingUtr}
                onClick={handleManualUtrUnlock}
                icon={<UserCheck className="w-4 h-4" />}
              >
                Verify UTR & Unlock Course
              </Button>
            </div>
          </div>

          {/* 3. Direct Web Checkout Sharable Links (No separate port 7000 needed!) */}
          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <ExternalLink className="w-5 h-5 text-brand-500" />
                <h3 className="font-bold font-display text-sm text-light-text dark:text-dark-text">
                  Direct Web Checkout Links (Integrated in Admin)
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                Port :5173 Unified
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share this link with any student to let them pay directly in their web browser without installing the app.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Course
                </label>
                <select
                  value={webCheckoutCourseId}
                  onChange={(e) => setWebCheckoutCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (₹{c.discountPrice || c.price})
                    </option>
                  ))}
                </select>
              </div>

              {webCheckoutCourseId && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?checkout=${webCheckoutCourseId}`}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-light-border dark:border-dark-border bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 select-all"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?checkout=${webCheckoutCourseId}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      showToast('Web Checkout link copied!', 'success');
                    }}
                    icon={copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  >
                    {copiedLink ? 'Copied' : 'Copy'}
                  </Button>
                  <a
                    href={`/?checkout=${webCheckoutCourseId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Test
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Dynamic UPI QR Code Tester & Pay Link */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface p-6 shadow-sm space-y-4 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
              <QrCode className="w-5 h-5" />
              <h3 className="font-bold font-display text-sm text-light-text dark:text-dark-text">
                Live UPI QR Code & Direct Intent Tester
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan this QR with any UPI app (GPay, PhonePe, Paytm, BHIM) to test live settlement into <strong>{upiId}</strong>.
            </p>

            {/* Amount Selector */}
            <div className="flex items-center gap-2 pt-1">
              {['1', '499', '999'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTestAmount(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    testAmount === amt
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
              <div className="flex items-center gap-1 border border-light-border dark:border-dark-border rounded-lg px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-16 text-xs bg-transparent focus:outline-none font-bold text-light-text dark:text-dark-text"
                />
              </div>
            </div>

            {/* Dynamic QR Code Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md inline-block my-2">
              <img
                src={qrCodeUrl}
                alt="Live UPI QR"
                className="w-52 h-52 object-contain rounded-xl"
              />
              <div className="mt-2 text-slate-700 text-xs font-mono font-bold tracking-tight">
                {upiId}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold font-display">
                Payable: ₹{Number(testAmount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Direct UPI Intent Button */}
            <div className="w-full space-y-2 pt-1">
              <a
                href={upiIntentUri}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test UPI Intent on Mobile (GPay / PhonePe)</span>
              </a>

              <button
                onClick={handleCopyUpi}
                className="w-full py-2 px-4 rounded-xl border border-light-border dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {copiedUpi ? '✓ UPI ID Copied!' : `Copy UPI ID: ${upiId}`}
              </button>
            </div>

            {/* Trust Footer */}
            <div className="pt-3 border-t border-light-border dark:border-dark-border w-full text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Direct Bank-to-Bank UPI Transfer via NPCI Protocols</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-Time UPI Orders & UTR Ledger */}
      <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        <div className="p-5 border-b border-light-border dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold font-display text-light-text dark:text-dark-text flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Real-Time Settlement & UTR Transactions
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verified orders settled directly to <strong>{upiId}</strong> with banking reference numbers.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Total Orders: {recentOrders.length}
          </span>
        </div>

        {loadingOrders ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading orders...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No transactions yet. Real-time payments to {upiId} will appear here instantly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-light-border dark:border-dark-border text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Order Details</th>
                  <th className="px-5 py-3">Student UID</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Bank UTR</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium text-slate-700 dark:text-slate-200">
                {recentOrders.slice(0, 15).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-[11px]">
                      <div className="font-bold text-light-text dark:text-dark-text">
                        {order.id}
                      </div>
                      {order.paymentId && (
                        <div className="text-slate-400 text-[10px]">
                          PayID: {order.paymentId}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] truncate max-w-[120px]">
                      {order.uid}
                    </td>
                    <td className="px-5 py-3 font-semibold text-light-text dark:text-dark-text">
                      {order.courseTitle || order.courseId}
                    </td>
                    <td className="px-5 py-3 font-bold font-display text-sm text-light-text dark:text-dark-text">
                      ₹{order.amount}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : order.status === 'refunded'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {order.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px]">
                      {order.utr ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {order.utr}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
