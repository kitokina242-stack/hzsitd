'use client';

import React from 'react';
import Image from 'next/image';
import { useGetLetterByIdQuery, useExecuteLetterActionMutation } from '../services/letterApi';
import { useAppSelector } from '@/store';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import {
  X,
  Printer,
  CheckCircle,
  ShieldCheck,
  CornerDownRight,
  RotateCcw,
  FileText,
  Paperclip,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
} from 'lucide-react';

interface LetterDetailsSheetProps {
  letterId: number | null;
  onClose: () => void;
  onOpenFullDocument?: (id: number, tab?: 'document' | 'pdf' | 'attachments') => void;
}

export const LetterDetailsSheet: React.FC<LetterDetailsSheetProps> = ({
  letterId,
  onClose,
  onOpenFullDocument,
}) => {
  const activeRole = useAppSelector((state) => state.auth.activeRole);
  const { data, isLoading } = useGetLetterByIdQuery(letterId as number, {
    skip: !letterId,
  });
  const [executeAction, { isLoading: isActionLoading }] = useExecuteLetterActionMutation();

  if (!letterId) return null;

  const letter = data?.letter;
  const timeline = data?.timeline || [];
  const attachments = data?.attachments || [];
  const comments = data?.comments || [];

  const pdfAttachments = attachments.filter(
    (a) =>
      a.mime_type?.includes('pdf') ||
      a.filename?.toLowerCase().endsWith('.pdf') ||
      a.original_name?.toLowerCase().endsWith('.pdf')
  );

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '')
    : 'http://localhost:8000';

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAction = async (action: any, notes = '') => {
    if (!letterId) return;
    try {
      await executeAction({ id: letterId, action, notes });
      onClose();
    } catch (err) {
      console.error('Failed to execute action:', err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Sheet (540px wide) */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-[540px] bg-slate-50 shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {letter?.direction}
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {letter?.reference_no}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {isLoading ? 'Loading letter...' : letter?.subject}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : letter ? (
            <>
              {/* Overview Metric Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </div>
                  <StatusPill status={letter.status} />
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Priority
                  </div>
                  <PriorityBadge priority={letter.priority} />
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Approval Stage
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {letter.approval_stage}
                  </div>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Date Filed
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {letter.created_at ? letter.created_at.split(' ')[0] : 'Today'}
                  </div>
                </div>
              </div>

              {/* Scanned Ministerial PDF Original Alert Banner */}
              {pdfAttachments.length > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Scanned Ministerial PDF Attached
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {pdfAttachments.length} document{pdfAttachments.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-white/90 p-2.5 rounded-lg border border-red-100 shadow-xs">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {pdfAttachments[0].original_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {formatFileSize(pdfAttachments[0].file_size)} · Scanned Physical Original
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (letterId && onOpenFullDocument) {
                            onOpenFullDocument(letterId, 'pdf');
                            onClose();
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </button>
                      <a
                        href={`${BACKEND_URL}${pdfAttachments[0].file_path}`}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Correspondence Parties */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Correspondence Parties
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">From: </span>
                    {letter.direction === 'INCOMING'
                      ? `${letter.external_sender_name} (${letter.external_sender_org || 'External'})`
                      : `${letter.sender_name} — ${letter.sender_dir_name || 'HZSITD'}`}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">To: </span>
                    {letter.direction === 'INCOMING'
                      ? letter.recipient_dir_name || 'Executive Office'
                      : letter.external_recipient_name || 'General Delivery'}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Official Letter Content
                </div>
                <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {letter.body}
                </div>
              </div>

              {/* Attachments & Supporting Evidence Section */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Attached Documents ({attachments.length})</span>
                  </div>
                  {attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (letterId && onOpenFullDocument) {
                          onOpenFullDocument(letterId, 'attachments');
                          onClose();
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      View All
                    </button>
                  )}
                </div>

                {attachments.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No physical files or scanned PDFs attached to this letter.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => {
                      const isPdf =
                        att.mime_type?.includes('pdf') ||
                        att.filename?.toLowerCase().endsWith('.pdf') ||
                        att.original_name?.toLowerCase().endsWith('.pdf');
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition text-xs"
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPdf ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {isPdf ? 'PDF' : 'DOC'}
                            </span>
                            <span className="font-medium text-slate-800 truncate max-w-[200px]">
                              {att.original_name}
                            </span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              ({formatFileSize(att.file_size)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isPdf && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (letterId && onOpenFullDocument) {
                                    onOpenFullDocument(letterId, 'pdf');
                                    onClose();
                                  }
                                }}
                                className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                                title="View in PDF Reader"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <a
                              href={`${BACKEND_URL}${att.file_path}`}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200 transition"
                              title="Download Attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Audit Timeline */}
              {timeline.length > 0 && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cryptographic Audit Trail ({timeline.length})
                  </div>
                  <div className="space-y-3">
                    {timeline.map((t, idx) => (
                      <div key={t.id || idx} className="flex gap-3 text-xs">
                        <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold flex-shrink-0 text-[10px] shadow-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{t.action}</div>
                          <div className="text-[11px] text-slate-400">
                            {t.actor_name} ({t.actor_role}) · {t.created_at}
                          </div>
                          {t.notes && <div className="text-slate-600 mt-0.5">{t.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHA-256 Seal Preview */}
              {letter.verification_hash && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    SHA-256 Verification Seal
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 truncate max-w-xs mx-auto">
                    {letter.verification_hash}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> VERIFIED & SEALED
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (letterId && onOpenFullDocument) {
                  onOpenFullDocument(letterId);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 text-slate-800 bg-slate-50 hover:bg-slate-100 transition shadow-sm"
            >
              <FileText className="w-4 h-4 text-slate-700" />
              Full Document View
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer className="w-4 h-4" />
              Print View
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Dept Head Action */}
            {activeRole === 'Department Head' &&
              letter?.approval_stage === 'Department Head Endorsement' && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => handleAction('endorse_and_seal', 'Endorsed by Department Head')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Endorse &amp; Sign
                </button>
              )}

            {/* Directory Lead Action */}
            {activeRole === 'Directory Lead' &&
              letter?.approval_stage === 'Directory Lead Review' && (
                <>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleAction('return_for_revision', 'Revisions requested')}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Return
                  </button>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleAction('approve_to_head', 'Approved by Director')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </>
              )}
          </div>
        </div>
      </aside>
    </>
  );
};
