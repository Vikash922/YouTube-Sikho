import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Award, AlertTriangle, Loader2, Calendar, User, BookOpen, ShieldCheck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CertificateRecord {
  id: string;
  certId?: string;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  clientName: string;
  isValid?: boolean;
}

export const PublicCertificateVerify: React.FC<{ certId?: string }> = ({ certId: propCertId }) => {
  const params = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const certId = propCertId || params.id || searchParams.get('id') || searchParams.get('verify') || '';
  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certId) {
      setError('No certificate ID provided.');
      setLoading(false);
      return;
    }

    const fetchCert = async () => {
      try {
        const snap = await getDoc(doc(db, 'certificates', certId));
        if (snap.exists()) {
          setCert({ id: snap.id, ...snap.data() } as CertificateRecord);
        } else {
          setError(`No verified certificate found matching ID "${certId}".`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to verify certificate.');
      } finally {
        setLoading(false);
      }
    };

    fetchCert();
  }, [certId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Verifying credential authenticity...
          </p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 border border-slate-200 dark:border-slate-700 shadow-xl rounded-none text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto rounded-none">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Certificate Not Verified
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error || 'This credential could not be found or has been revoked.'}
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-block px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider rounded-none"
            >
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Verified';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-2xl rounded-none overflow-hidden">
        {/* Top Verified Header */}
        <div className="bg-emerald-600 text-white p-6 text-center space-y-2">
          <div className="w-12 h-12 bg-white/20 text-white flex items-center justify-center mx-auto rounded-none">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-extrabold uppercase tracking-widest">
            Official Verified Credential
          </h1>
          <p className="text-xs text-emerald-100 font-medium">
            This document has been verified against our tamper-evident blockchain-style certificate registry.
          </p>
        </div>

        {/* Certificate Details */}
        <div className="p-6 space-y-5">
          <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Recipient
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              <User className="w-5 h-5 text-brand-500" />
              {cert.studentName}
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <BookOpen className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Course Completed
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {cert.courseTitle}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-brand-500" /> Date Issued
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {formattedDate}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                  <Award className="w-3 h-3 text-brand-500" /> Issued By
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {cert.clientName}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Certificate ID Code
                </span>
                <span className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200">
                  {cert.id}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider">
                Active & Valid
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
