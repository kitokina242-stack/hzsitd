'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  useGetLetterByIdQuery,
  useExecuteLetterActionMutation,
  useAddLetterCommentMutation,
  useAttachFilesToLetterMutation,
  WorkflowAction,
} from '../services/letterApi';
import { useAppSelector } from '@/store';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  Check,
  Send,
  RotateCcw,
  FileText,
  Paperclip,
  Download,
  ExternalLink,
  Upload,
  Plus,
  Loader2,
  Eye,
  FileCheck,
} from 'lucide-react';

interface FullDocumentModalProps {
  letterId: number | null;
  isOpen: boolean;
  initialTab?: 'document' | 'pdf' | 'attachments' | 'timeline' | 'minutes';
  onClose: () => void;
}

export const FullDocumentModal: React.FC<FullDocumentModalProps> = ({
  letterId,
  isOpen,
  initialTab = 'document',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'pdf' | 'attachments' | 'timeline' | 'minutes'>(initialTab);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [minuteText, setMinuteText] = useState('');
  const attachInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, letterId]);

  const { data: letterData, isLoading } = useGetLetterByIdQuery(letterId!, {
    skip: !letterId || !isOpen,
  });

  const [executeAction, { isLoading: isActionLoading }] = useExecuteLetterActionMutation();
  const [addComment, { isLoading: isCommentLoading }] = useAddLetterCommentMutation();
  const [attachFiles, { isLoading: isAttaching }] = useAttachFilesToLetterMutation();

  if (!isOpen || !letterId) return null;

  const letter = letterData?.letter;
  const timeline = letterData?.timeline || [];
  const comments = letterData?.comments || [];
  const attachments = letterData?.attachments || [];

  const pdfAttachments = attachments.filter(
    (a) => a.mime_type?.includes('pdf') || a.filename?.toLowerCase().endsWith('.pdf') || a.original_name?.toLowerCase().endsWith('.pdf')
  );
  const activePdf = pdfAttachments[selectedPdfIndex] || pdfAttachments[0] || attachments[0];

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '')
    : 'http://localhost:8000';

  const isStep1Done = true;
  const isStep2Done =
    letter?.approval_stage === 'Directory Lead Review' ||
    letter?.approval_stage === 'Department Head Endorsement' ||
    letter?.approval_stage === 'Completed';
  const isStep3Done =
    letter?.approval_stage === 'Department Head Endorsement' ||
    letter?.approval_stage === 'Completed';
  const isStep4Done = letter?.approval_stage === 'Completed';
  const isReturned = letter?.status === 'Returned for Revision';

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadNewAttachment = async (files: FileList | null) => {
    if (!files || files.length === 0 || !letterId) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    try {
      await attachFiles({ id: letterId, formData }).unwrap();
    } catch (err) {
      console.error('Failed to attach files:', err);
      alert('Failed to upload attachment.');
    }
  };

  const handleAction = async (action: WorkflowAction, notes?: string) => {
    if (!letterId) return;
    try {
      await executeAction({ id: letterId, action, notes }).unwrap();
      onClose();
    } catch (err) {
      console.error('Failed to execute action:', err);
    }
  };

  const handleAddMinute = async () => {
    if (!letterId || !minuteText.trim()) return;
    try {
      await addComment({
        id: letterId,
        comment_text: minuteText.trim(),
        comment_type: 'Minute',
      }).unwrap();
      setMinuteText('');
    } catch (err) {
      console.error('Failed to add minute:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/25 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Image
              src={
                letter?.direction === 'INCOMING'
                  ? '/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp'
                  : '/animated-icons/wired-outline-177-mail-fast-in-assembly.webp'
              }
              alt="Icon"
              width={26}
              height={26}
              unoptimized
            />
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                letter?.direction === 'INCOMING'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {letter?.direction || 'Letter'}
            </span>
            <h3 className="text-base font-bold text-slate-900 font-mono">
              {letter?.reference_no || `Letter #${letterId}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/60 flex-shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'document'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Image
              src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
              alt="Doc"
              width={16}
              height={16}
              unoptimized
            />
            <span>Official Letterhead</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'border-red-600 text-red-700 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="w-4 h-4 rounded bg-red-100 text-red-700 flex items-center justify-center font-bold text-[9px]">
              PDF
            </div>
            <span>
              Attached PDF / Scanned Original{' '}
              {pdfAttachments.length > 0 && `(${pdfAttachments.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'attachments'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Attachments &amp; Evidence ({attachments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Audit Timeline ({timeline.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('minutes')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'minutes'
                ? 'border-slate-900 text-slate-900 font-bold bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Minutes &amp; Directives ({comments.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Retrieving official government letter...</p>
            </div>
          ) : !letter ? (
            <div className="py-20 text-center text-xs text-slate-500">Document could not be located.</div>
          ) : (
            <>
              {/* TAB 1: OFFICIAL LETTERHEAD PREVIEW */}
              {activeTab === 'document' && (
                <div className="space-y-6">
                  {/* Stepper Pipeline */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm mb-1">
                          <Check className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-[11px]">1. Draft Prepared</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                            isStep2Done
                              ? 'bg-emerald-600 text-white'
                              : letter.approval_stage === 'Directory Lead Review'
                              ? 'bg-blue-600 text-white animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isStep2Done ? <Check className="w-4 h-4" /> : '2'}
                        </div>
                        <span className="font-semibold text-slate-700 text-[11px]">2. Lead Review</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                            isStep3Done
                              ? 'bg-emerald-600 text-white'
                              : letter.approval_stage === 'Department Head Endorsement'
                              ? 'bg-purple-600 text-white animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isStep3Done ? <Check className="w-4 h-4" /> : '3'}
                        </div>
                        <span className="font-semibold text-slate-700 text-[11px]">3. Head Endorsement</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                            isStep4Done
                              ? 'bg-emerald-600 text-white'
                              : isReturned
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isStep4Done ? <Check className="w-4 h-4" /> : isReturned ? '!' : '4'}
                        </div>
                        <span
                          className={`text-[11px] ${
                            isReturned ? 'text-red-700 font-bold' : 'font-semibold text-slate-700'
                          }`}
                        >
                          {isReturned ? 'Returned for Revision' : '4. Dispatched & Sealed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Original Scanned PDF Banner */}
                  {pdfAttachments.length > 0 && (
                    <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          PDF
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">Original Scanned Ministerial PDF Attached</div>
                          <div className="text-[11px] text-slate-600">
                            {activePdf?.original_name} ({formatFileSize(activePdf?.file_size || 0)}) · Physical seal verified
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('pdf')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 text-white font-bold hover:bg-red-800 transition shadow-xs text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Scanned PDF</span>
                        </button>
                        <a
                          href={`${BACKEND_URL}${activePdf?.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 text-red-800 font-semibold hover:bg-red-100 transition text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </a>
                        <a
                          href={`${BACKEND_URL}${activePdf?.file_path}`}
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 text-red-800 font-semibold hover:bg-red-100 transition text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Printable Official Government Letterhead */}
                  <div className="official-letterhead printable-letter bg-white p-8 sm:p-12 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    {/* Letterhead Top Banner */}
                    <div className="letterhead-border-top text-center space-y-1">
                      <div className="text-sm font-semibold text-slate-800 tracking-wide font-sans">
                        በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የሀዲያ ዞን አስተዳደር
                      </div>
                      <div className="text-sm font-bold uppercase tracking-wider text-slate-900">
                        Hadiya Zone Administration — Regional Government
                      </div>
                      <div className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                        Science &amp; Information Technology Department
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1">
                        P.O. Box 114, Hossana, Ethiopia · Tel: +251-46-555-0100 · Email: info@hzsitd.gov.et
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 text-xs py-2 border-b border-slate-200 gap-4">
                      <div className="space-y-1">
                        <div>
                          <strong className="text-slate-500 font-semibold">Ref No:</strong>{' '}
                          <span className="font-mono font-bold text-slate-900">{letter.reference_no}</span>
                        </div>
                        <div>
                          <strong className="text-slate-500 font-semibold">Letter Type:</strong>{' '}
                          <span className="font-medium text-slate-800">{letter.letter_type}</span>
                        </div>
                        <div>
                          <strong className="text-slate-500 font-semibold">Priority:</strong>{' '}
                          <PriorityBadge priority={letter.priority} />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div>
                          <strong className="text-slate-500 font-semibold">Date:</strong>{' '}
                          <span className="font-medium text-slate-800">
                            {letter.created_at ? letter.created_at.split(' ')[0] : 'Current'}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-500 font-semibold">Security:</strong>{' '}
                          <span className="font-bold text-slate-900">Official Confidential</span>
                        </div>
                        <div>
                          <strong className="text-slate-500 font-semibold">Status:</strong>{' '}
                          <StatusPill status={letter.status} />
                        </div>
                      </div>
                    </div>

                    {/* Routing Addresses */}
                    <div className="text-xs space-y-1.5 py-2">
                      <div>
                        <strong className="text-slate-500 font-semibold">FROM:</strong>{' '}
                        <span className="text-slate-900 font-medium">
                          {letter.direction === 'INCOMING'
                            ? `${letter.external_sender_name || 'Ministry'} (${
                                letter.external_sender_org || 'External Authority'
                              })`
                            : `${letter.sender_name || 'Staff Member'} — ${
                                letter.sender_dir_name || 'HZSITD'
                              }`}
                        </span>
                      </div>
                      <div>
                        <strong className="text-slate-500 font-semibold">TO:</strong>{' '}
                        <span className="text-slate-900 font-medium">
                          {letter.direction === 'INCOMING'
                            ? letter.recipient_dir_name || 'Executive Office'
                            : letter.recipient_type === 'INTERNAL'
                            ? `${letter.recipient_dir_name || 'Department Directorate'}${letter.assigned_officer_name ? ` (Attn: ${letter.assigned_officer_name})` : ''}`
                            : letter.external_recipient_name
                            ? `${letter.external_recipient_name}, ${letter.external_recipient_org || ''}`
                            : letter.recipient_dir_name || 'General Delivery'}
                        </span>
                      </div>
                      <div className="pt-2">
                        <strong className="text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                          SUBJECT:
                        </strong>{' '}
                        <u className="text-slate-900 font-bold text-sm">{letter.subject}</u>
                      </div>
                    </div>

                    {/* Formal Letter Body */}
                    <div className="py-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-serif-executive text-sm">
                      {letter.body}
                    </div>

                    {/* Endorsement, Seal & Cryptographic Signature Block */}
                    <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                      {/* Department / Ministerial Seal Stamp */}
                      <div className="text-center sm:text-left">
                        {letter.direction === 'INCOMING' ? (
                          <div className="w-24 h-24 rounded-full border-4 border-blue-700/80 p-2 flex flex-col items-center justify-center text-center text-blue-700 font-bold text-[9px] rotate-[-4deg] shadow-xs">
                            <span className="uppercase">MINISTERIAL</span>
                            <span>OFFICIAL</span>
                            <span>ORIGINAL</span>
                          </div>
                        ) : letter.stamp_data ? (
                          <div className="w-24 h-24 rounded-full border-4 border-red-600/80 p-2 flex flex-col items-center justify-center text-center text-red-600 font-bold text-[9px] rotate-[-6deg] shadow-sm">
                            <span className="uppercase">HZSITD</span>
                            <span>OFFICIAL</span>
                            <span>SEAL</span>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-xl border border-dashed border-slate-300 p-2 flex items-center justify-center text-center text-slate-400 text-[10px]">
                            [Department Seal Applied On Endorsement]
                          </div>
                        )}
                      </div>

                      {/* Signatory Signature */}
                      <div className="text-center space-y-1">
                        <div className="h-10 flex items-center justify-center">
                          {letter.direction === 'INCOMING' ? (
                            <span className="font-serif-executive italic text-xl text-blue-900 tracking-wider">
                              {letter.external_sender_name || 'State Minister'}
                            </span>
                          ) : letter.digital_signature ? (
                            <span className="font-serif-executive italic text-xl text-slate-900 tracking-wider">
                              {letter.endorsed_by_name || 'Dr. Bezabih Alemu'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">[Pending Executive Signature]</span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900">
                          {letter.direction === 'INCOMING'
                            ? letter.external_sender_name || 'Authorized Signatory'
                            : letter.endorsed_by_name || 'Dr. Bezabih Alemu'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {letter.direction === 'INCOMING'
                            ? letter.external_sender_org || 'External Ministry'
                            : 'Head of Department, HZSITD'}
                        </div>
                        <div className="text-[9px] text-emerald-700 font-bold">
                          {letter.direction === 'INCOMING'
                            ? 'Verified Inbound Ministerial Dispatch'
                            : 'Official Department Endorsement'}
                        </div>
                      </div>

                      {/* Cryptographic QR Box */}
                      <div className="flex flex-col items-center sm:items-end text-center sm:text-right space-y-1">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center font-mono text-[9px] text-slate-500">
                          <Image
                            src="/animated-icons/wired-outline-3235-badge-ribbon-in-reveal.webp"
                            alt="QR"
                            width={32}
                            height={32}
                            unoptimized
                          />
                        </div>
                        <div className="font-mono text-[9px] text-slate-400 max-w-[120px] truncate">
                          {letter.verification_hash ? letter.verification_hash.substring(0, 16) + '...' : 'SHA-256 Validated'}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>SEAL VERIFIED</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTACHED PDF / SCANNED ORIGINAL DOCUMENT */}
              {activeTab === 'pdf' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  {pdfAttachments.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <FileText className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800">No Scanned PDF Attached Yet</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        This correspondence was authored natively in digital text. You can upload an official scanned copy or supporting PDF attachment below.
                      </p>
                      <input
                        ref={attachInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleUploadNewAttachment(e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => attachInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Scanned PDF</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* PDF Header Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                            PDF
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                              {activePdf?.original_name}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {formatFileSize(activePdf?.file_size || 0)} · Official Scanned Ministerial Document
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {pdfAttachments.length > 1 && (
                            <select
                              value={selectedPdfIndex}
                              onChange={(e) => setSelectedPdfIndex(Number(e.target.value))}
                              className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none"
                            >
                              {pdfAttachments.map((p, idx) => (
                                <option key={p.id} value={idx}>
                                  File #{idx + 1}: {p.original_name}
                                </option>
                              ))}
                            </select>
                          )}

                          <a
                            href={`${BACKEND_URL}${activePdf?.file_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open in New Tab</span>
                          </a>

                          <a
                            href={`${BACKEND_URL}${activePdf?.file_path}`}
                            download
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      </div>

                      {/* Embedded PDF iframe */}
                      <div className="w-full h-[650px] rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner">
                        <iframe
                          src={`${BACKEND_URL}${activePdf?.file_path}#toolbar=1&navpanes=0`}
                          title={activePdf?.original_name}
                          className="w-full h-full border-0"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: ATTACHMENTS & EVIDENCE */}
              {activeTab === 'attachments' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Official Attachments &amp; Supporting Documents</h4>
                      <p className="text-xs text-slate-500">
                        Scanned letters, technical reports, survey documents, and verification files.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={attachInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleUploadNewAttachment(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={isAttaching}
                        onClick={() => attachInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAttaching ? 'Attaching...' : 'Add Attachment'}</span>
                      </button>
                    </div>
                  </div>

                  {attachments.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Paperclip className="w-8 h-8 text-slate-300 mx-auto" />
                      <h5 className="font-bold text-xs text-slate-700">No Attachments on Record</h5>
                      <p className="text-[11px] text-slate-400">
                        Upload ministerial PDFs, scanned memos, or survey documents to preserve with this letter.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                file.mime_type?.includes('pdf')
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {file.mime_type?.includes('pdf') ? 'PDF' : 'DOC'}
                            </div>
                            <div className="flex-1 truncate">
                              <h5 className="font-bold text-xs text-slate-900 truncate" title={file.original_name}>
                                {file.original_name}
                              </h5>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {formatFileSize(file.file_size)}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Uploaded: {file.created_at || 'Registered with document'}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                            {file.mime_type?.includes('pdf') && (
                              <button
                                type="button"
                                onClick={() => {
                                  const pdfIdx = pdfAttachments.findIndex((p) => p.id === file.id);
                                  if (pdfIdx !== -1) setSelectedPdfIndex(pdfIdx);
                                  setActiveTab('pdf');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs transition"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Preview</span>
                              </button>
                            )}

                            <a
                              href={`${BACKEND_URL}${file.file_path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View</span>
                            </a>

                            <a
                              href={`${BACKEND_URL}${file.file_path}`}
                              download
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: AUDIT TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="font-bold text-sm text-slate-900">Permanent Cryptographic Audit Ledger</h4>
                    <span className="text-xs text-slate-400 font-medium">{timeline.length} Recorded Milestones</span>
                  </div>
                  <div className="space-y-4">
                    {timeline.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-4 text-xs">
                        <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{item.action}</span>
                            <span className="text-[10px] text-slate-400">{item.created_at}</span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{item.notes || 'No additional remarks.'}</p>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.actor_name} ({item.actor_role})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: MINUTES & NOTES */}
              {activeTab === 'minutes' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Internal Routing Minutes &amp; Instructions</h4>
                    <p className="text-xs text-slate-500">Official directives exchanged between clearance stages.</p>
                  </div>

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">No minutes or notes recorded for this document.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                              {comment.comment_type}
                            </span>
                            <span className="text-[10px] text-slate-400">{comment.created_at}</span>
                          </div>
                          <p className="text-slate-800 text-xs font-medium leading-relaxed">{comment.comment_text}</p>
                          <div className="text-[10px] text-slate-500">
                            — {comment.author_name} ({comment.author_role})
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Minute Form */}
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Add Routing Minute / Directive</label>
                    <textarea
                      rows={3}
                      value={minuteText}
                      onChange={(e) => setMinuteText(e.target.value)}
                      placeholder="Enter minute, instruction note, or revision remarks..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddMinute}
                      disabled={isCommentLoading || !minuteText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isCommentLoading ? 'Recording...' : 'Add Minute'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Document</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Department Head clearance action */}
            {currentUser?.role === 'Department Head' &&
              letter?.approval_stage === 'Department Head Endorsement' && (
                <button
                  type="button"
                  onClick={() => handleAction('endorse_and_sign', 'Officially endorsed by Dr. Bezabih Alemu.')}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Endorse &amp; Apply Digital Seal</span>
                </button>
              )}

            {/* Directory Lead clearance action */}
            {currentUser?.role === 'Directory Lead' &&
              letter?.approval_stage === 'Directory Lead Review' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAction('return_for_revision', 'Returned for corrections.')}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition border border-red-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Return for Revision</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('approve_to_head', 'Approved by Director and forwarded to Head.')}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Forward to Head</span>
                  </button>
                </>
              )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
