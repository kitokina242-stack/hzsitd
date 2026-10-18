import { Suspense } from 'react';
import { LetterDashboardLayout } from '@/modules/lettermodule/layouts/LetterDashboardLayout';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans text-xs font-semibold text-slate-500">
          Loading HZSITD Command Center...
        </div>
      }
    >
      <LetterDashboardLayout />
    </Suspense>
  );
}
