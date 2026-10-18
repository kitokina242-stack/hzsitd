'use client';

import React, { ReactNode } from 'react';
import { useAppSelector } from '@/store';
import { UserRole } from '@/types/auth';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const activeRole = useAppSelector((state) => state.auth.activeRole);

  if (!allowedRoles.includes(activeRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
