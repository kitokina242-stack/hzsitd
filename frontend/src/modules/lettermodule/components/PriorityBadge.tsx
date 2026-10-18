'use client';

import React from 'react';
import { LetterPriority } from '@/types/letter';

interface PriorityBadgeProps {
  priority: LetterPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  if (priority === 'Urgent') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        Urgent
      </span>
    );
  }

  if (priority === 'Confidential') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
        Confidential
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
      Routine
    </span>
  );
};
