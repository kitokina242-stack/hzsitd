'use client';

import React from 'react';
import Image from 'next/image';
import { Letter } from '@/types/letter';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { ChevronRight, FileText, Paperclip } from 'lucide-react';

interface LetterTableProps {
  letters: Letter[];
  onSelectLetter: (id: number) => void;
  isLoading?: boolean;
}

export const LetterTable: React.FC<LetterTableProps> = ({
  letters,
  onSelectLetter,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading correspondence ledger...</p>
      </div>
    );
  }

  if (!letters || letters.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center">
        <Image
          src="/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp"
          alt="Empty"
          width={64}
          height={64}
          unoptimized
        />
        <h4 className="mt-4 text-base font-bold text-slate-900">No Correspondence in Queue</h4>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          All letters for this clearance stage have been processed. New correspondence will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 h-14">
              <th className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[185px] min-w-[185px] whitespace-nowrap">
                Status
              </th>
              <th className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[140px] whitespace-nowrap">
                Tracking Ref
              </th>
              <th className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[165px] whitespace-nowrap">
                Sender / Origin
              </th>
              <th className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Subject
              </th>
              <th className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[90px] whitespace-nowrap">
                Priority
              </th>
              <th className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 w-[85px] text-right whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {letters.map((l) => (
              <tr
                key={l.id}
                onClick={() => onSelectLetter(l.id)}
                className="h-16 hover:bg-slate-50/80 cursor-pointer transition"
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusPill status={l.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {l.reference_no}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {l.created_at ? l.created_at.split(' ')[0] : 'Today'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">
                      {l.direction === 'INCOMING'
                        ? l.external_sender_org || l.external_sender_name || 'External Office'
                        : l.sender_name || 'Staff Member'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {l.direction === 'INCOMING'
                        ? l.external_sender_name || 'Ministerial Directive'
                        : l.sender_dir_name || 'HZSITD'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col max-w-[220px] md:max-w-[260px] lg:max-w-[300px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate" title={l.subject}>
                        {l.subject}
                      </span>
                      {Boolean(l.has_pdf) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 flex-shrink-0">
                          <FileText className="w-2.5 h-2.5" />
                          PDF
                        </span>
                      )}
                      {Boolean(l.attachment_count && Number(l.attachment_count) > 0) && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0"
                          title={`${l.attachment_count} attachment(s)`}
                        >
                          <Paperclip className="w-2.5 h-2.5" />
                          {l.attachment_count}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 truncate mt-0.5">{l.body}</span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <PriorityBadge priority={l.priority} />
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelectLetter(l.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                  >
                    View
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
