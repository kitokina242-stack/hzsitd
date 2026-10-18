'use client';

import React from 'react';
import Image from 'next/image';

interface MetricCardProps {
  title: string;
  value: number | string;
  iconSrc: string;
  trendText: string;
  trendType?: 'live' | 'up' | 'alert';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  iconSrc,
  trendText,
  trendType = 'up',
}) => {
  const getTrendStyle = () => {
    switch (trendType) {
      case 'alert':
        return 'text-red-600 bg-red-50 border-red-100';
      case 'live':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      default:
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between min-h-[160px] shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
          <Image
            src={iconSrc}
            alt={title}
            width={38}
            height={38}
            className="object-contain"
            unoptimized
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1">
        <span className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
          {value}
        </span>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getTrendStyle()}`}>
            {trendText}
          </span>
        </div>
      </div>
    </div>
  );
};
