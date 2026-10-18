'use client';

import React from 'react';
import Image from 'next/image';
import { LetterStatus } from '@/types/letter';

interface StatusPillProps {
  status: LetterStatus;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  if (status === 'Approved' || status === 'Dispatched' || status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        <Image
          src="/animated-icons/wired-outline-37-check-in-reveal.webp"
          alt="Done"
          width={14}
          height={14}
          unoptimized
        />
        {status}
      </span>
    );
  }

  if (status === 'Returned for Revision' || status === 'Exception') {
    return (
      <span className="inline-flex items-center gap-1.5 pl-3 pr-4 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        <Image
          src="/animated-icons/wired-outline-35-pencil-in-reveal.webp"
          alt="Revision"
          width={14}
          height={14}
          unoptimized
        />
        {status}
      </span>
    );
  }

  if (
    status === 'Under Review' ||
    status === 'Pending Department Head'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0" />
        {status}
      </span>
    );
  }

  if (status === 'Draft') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
        <Image
          src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
          alt="Draft"
          width={14}
          height={14}
          unoptimized
        />
        Draft
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
      {status || 'Active'}
    </span>
  );
};
