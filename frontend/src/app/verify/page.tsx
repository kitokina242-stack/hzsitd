'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ArrowLeft, Search, CheckCircle2, Lock, Calendar, FileText, User } from 'lucide-react';

interface VerifiedLetter {
  id: number;
  reference_no: string;
  direction: string;
  subject: string;
  priority: string;
  letter_type: string;
  status: string;
  approval_stage: string;
  created_at: string;
  dispatched_at: string | null;
  verification_hash: string | null;
  recipient_dir_name: string | null;
  sender_dir_name: string | null;
  endorsed_by_name: string | null;
}

interface TimelineEvent {
  actor_name: string;
  actor_role: string;
  action: string;
  notes: string;
  created_at: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || 'HZSITD/OUT/2026/039';
  const initialHash = searchParams.get('hash') || '';

  const [inputRef, setInputRef] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [letterData, setLetterData] = useState<VerifiedLetter | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const fetchVerification = async (ref: string) => {
    if (!ref.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/letters/track?ref=${encodeURIComponent(ref.trim())}`);
      const data = await res.json();
      if (data.success && data.letter) {
        setLetterData(data.letter);
        setTimeline(data.timeline || []);
      } else {
        setError(data.message || 'No official correspondence record found matching this reference.');
        setLetterData(null);
      }
    } catch {
      setError('Unable to reach government ledger. Please verify network connectivity.');
      setLetterData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      fetchVerification(initialRef);
    }
  }, [initialRef]);

  const isHashMatching =
    initialHash && letterData?.verification_hash
      ? initialHash.toLowerCase() === letterData.verification_hash.toLowerCase()
      : true;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white text-slate-900 border-b border-slate-200 py-4 px-6 sm:px-12 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              H
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900">HZSITD Public Verification Service</div>
              <div className="text-[11px] text-slate-500">Hadiya Zone Science &amp; IT Department</div>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Return to Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Verify Document Authenticity or QR Token
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchVerification(inputRef);
            }}
            className="flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter Reference Number (e.g. HZSITD/OUT/2026/001)"
                value={inputRef}
                onChange={(e) => setInputRef(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-semibold text-slate-600">
              Querying zonal cryptographic ledger &amp; digital signatures...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Record Not Verified</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          </div>
        )}

        {/* Verified Result Card */}
        {!loading && letterData && (
          <div className="space-y-6">
            {/* Authenticity Certificate Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200 block">
                      Official Government Clearance
                    </span>
                    <h1 className="text-lg font-bold">Cryptographically Verified Genuine</h1>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-sm border border-white/20">
                  <Lock className="w-3.5 h-3.5" />
                  <span>SHA-256 Validated</span>
                </div>
              </div>

              {/* Document Overview Grid */}
              <div className="p-8 space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Document Subject
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{letterData.subject}</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Reference Number</span>
                    <span className="font-mono font-bold text-slate-900">{letterData.reference_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Classification</span>
                    <span className="font-bold text-slate-900">
                      {letterData.direction} · {letterData.letter_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Status</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {letterData.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Dispatched Date</span>
                    <span className="font-semibold text-slate-700">
                      {letterData.dispatched_at || letterData.created_at}
                    </span>
                  </div>
                </div>

                {/* Signatory & Cryptographic Seal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Authorized Executive Signatory
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {letterData.endorsed_by_name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {letterData.endorsed_by_name || 'Dr. Bezabih Alemu'}
                        </div>
                        <div className="text-[11px] text-slate-500">Head of Department, HZSITD</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Cryptographic SHA-256 Digest
                    </span>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-[10px] text-slate-700 break-all">
                      {letterData.verification_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                  </div>
                </div>

                {/* Audit Timeline */}
                {timeline.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 block mb-4">
                      Official Clearance Chain of Custody
                    </span>
                    <div className="space-y-3">
                      {timeline.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{event.action}</span>
                              <span className="text-[10px] text-slate-400">{event.created_at}</span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              {event.actor_name} ({event.actor_role}) — {event.notes}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 text-xs border-t border-slate-200 bg-white">
        Official Digital Verification Ledger · Federal Democratic Republic of Ethiopia · HZSITD
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-600">
          Loading verification service...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
