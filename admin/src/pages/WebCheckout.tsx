import React, { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { db } from '../firebase';
import { Course } from '../types';

interface WebCheckoutProps {
  courseId: string;
}

export const WebCheckout: React.FC<WebCheckoutProps> = ({ courseId }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment configuration
  const [upiId, setUpiId] = useState('7848894498@ibl');
  const [payeeName, setPayeeName] = useState('YouTube Sikho');

  // Student inputs
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // 1. Fetch course details and payment settings
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch course
        const courseSnap = await getDoc(doc(db, 'courses', courseId));
        if (courseSnap.exists()) {
          setCourse({ id: courseSnap.id, ...courseSnap.data() } as Course);
        } else {
          setError('Course not found. Please check the link or contact support.');
        }

        // Fetch UPI config
        const configSnap = await getDoc(doc(db, 'appConfig', 'payment'));
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          if (cfg.merchantUpiId) setUpiId(cfg.merchantUpiId);
          if (cfg.payeeName) setPayeeName(cfg.payeeName);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load checkout details');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [courseId]);

  const payableAmount = course?.discountPrice ?? course?.price ?? 499;

  // UPI deep link
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${payableAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
    course ? `Course - ${course.title.slice(0, 20)}` : 'Course Enrollment'
  )}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
    upiIntentUri
  )}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.trim()) {
      alert('Please enter your email to receive course access');
      return;
    }
    const cleanUtr = utr.replace(/\D/g, '').trim();
    if (cleanUtr.length !== 12) {
      alert('Please enter a valid 12-digit Bank UTR / UPI Reference Number');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        courseId,
        courseTitle: course?.title || 'Course Enrollment',
        amount: payableAmount,
        currency: 'INR',
        paymentMethod: 'DIRECT_UPI_QR',
        receiverUpi: upiId,
        utr: cleanUtr,
        customerName: studentName.trim() || 'Student',
        customerEmail: studentEmail.trim().toLowerCase(),
        customerPhone: studentPhone.trim() || null,
        status: 'paid',
        paymentStatus: 'captured',
        isManualVerification: true,
        source: 'web_checkout',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      alert('Payment submission error: ' + (err.message || 'Please try again'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <p className="text-sm text-slate-400">Loading secure checkout...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-100 mb-1">Checkout Unavailable</h2>
          <p className="text-sm text-slate-400 mb-4">{error || 'Course not found'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Academy
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="bg-slate-800/90 border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Payment Submitted!</h2>
          <p className="text-sm text-slate-300 mb-4">
            Thank you, <span className="font-semibold text-emerald-400">{studentName || studentEmail}</span>. Your payment of{' '}
            <span className="font-bold text-slate-100">₹{payableAmount.toLocaleString('en-IN')}</span> for{' '}
            <span className="font-medium text-slate-200">"{course.title}"</span> has been submitted with Bank UTR{' '}
            <code className="bg-slate-950 px-2 py-0.5 rounded text-xs text-amber-400 font-mono">{utr}</code>.
          </p>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs text-slate-400 mb-6">
            Course access is unlocked automatically or within a few minutes by our team. Check your email for confirmation.
          </div>
          <a
            href="/"
            className="block w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition"
          >
            Return to App / Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Left Column: Course Details & Price */}
        <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Direct 0% Fee UPI Checkout
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mb-2">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 line-clamp-3 mb-4">
              {course.description || 'India’s premier online creator course with live mentoring and community.'}
            </p>

            <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 mb-4">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-slate-400">Total Payable</span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{payableAmount.toLocaleString('en-IN')}
                </span>
              </div>
              {course.price && course.discountPrice && course.price > course.discountPrice && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Original Price</span>
                  <span className="line-through">₹{course.price.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1.5 pt-4">
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant verification via 12-digit UTR
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Direct to Official Merchant Account
            </div>
          </div>
        </div>

        {/* Right Column: Scan & Pay QR + UTR Form */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Direct UPI Box */}
          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Scan with Any UPI App
            </p>

            {/* Dynamic QR Code */}
            <div className="bg-white p-3 rounded-2xl shadow-xl mb-3">
              <img
                src={qrImageUrl}
                alt="UPI QR Code"
                className="w-48 h-48 rounded-lg"
              />
            </div>

            {/* UPI ID Pill */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 mb-2">
              <span className="text-xs text-slate-400 font-mono">UPI ID:</span>
              <span className="text-xs font-bold text-slate-100 font-mono">{upiId}</span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium ml-1 flex items-center gap-1"
              >
                {copiedUpi ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUpi ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Mobile UPI Intent Button */}
            <div className="w-full flex gap-2 mt-2">
              <a
                href={upiIntentUri}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-brand-400" /> Open UPI App (Mobile)
              </a>
            </div>
          </div>

          {/* UTR Submission Form */}
          <form onSubmit={handleSubmitPayment} className="w-full space-y-3">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Step 2: Enter Payment Details & 12-Digit Bank UTR
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">WhatsApp / Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                12-Digit Bank UTR / UPI Ref No. * (Find this in your GPay / PhonePe / Paytm receipt)
              </label>
              <input
                type="text"
                required
                maxLength={12}
                placeholder="e.g. 429812984124"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm tracking-wider placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || utr.length !== 12}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Unlock Course Access
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
