'use client';

import React, { useState } from 'react';
import { Shield, Key, Plus, Search, ArrowLeft, CheckCircle2, Lock, UserCheck, Check, AlertCircle, X } from 'lucide-react';
import { useGetRolesQuery, useGetPermissionsQuery, useAssignRolePermissionMutation, Role, Permission } from '@/modules/lettermodule/services/securityAssetsApi';

interface RolesPermissionsManagerProps {
  onBackToDashboard: () => void;
}

const DEFAULT_ROLES: Role[] = [
  {
    role_id: 1,
    role_name: 'Department Head',
    description: 'Executive authority: full signature rights, sealing power, approval delegation.',
  },
  {
    role_id: 2,
    role_name: 'Directory Lead',
    description: 'Operational lead: internal directives creation, minute routing, technical reviews.',
  },
  {
    role_id: 3,
    role_name: 'Officer',
    description: 'Civil servant desk: letter drafting, response formulation, incoming review.',
  },
  {
    role_id: 4,
    role_name: 'System Admin',
    description: 'IT Administrator: user provisioning, directory architecture, security audit.',
  },
];

const DEFAULT_PERMISSIONS: Permission[] = [
  { permission_id: 1, permission_code: 'letter.create', permission_name: 'Create & Draft Letters', description: 'Draft outbox and inbound correspondence' },
  { permission_id: 2, permission_code: 'letter.sign', permission_name: 'Digital Cryptographic Signature', description: 'Attach authorized cryptographic key' },
  { permission_id: 3, permission_code: 'letter.seal', permission_name: 'Affix Official Stamp & Seal', description: 'Apply authenticated departmental seal' },
  { permission_id: 4, permission_code: 'letter.archive', permission_name: 'Archive & Close Letter', description: 'Move correspondence to permanent zonal record' },
  { permission_id: 5, permission_code: 'chat.send', permission_name: 'Send Directives & Messages', description: 'Participate in secure communications channels' },
  { permission_id: 6, permission_code: 'users.manage', permission_name: 'User & RBAC Administration', description: 'Create accounts, assign roles, reset credentials' },
  { permission_id: 7, permission_code: 'directories.manage', permission_name: 'Directory Architecture', description: 'Create and configure organizational directorates' },
  { permission_id: 8, permission_code: 'audit.view', permission_name: 'View Cryptographic Audit Trail', description: 'Inspect immutable system event logs' },
];

export const RolesPermissionsManager: React.FC<RolesPermissionsManagerProps> = ({ onBackToDashboard }) => {
  const { data: remoteRoles } = useGetRolesQuery();
  const { data: remotePermissions } = useGetPermissionsQuery();
  const [assignApi] = useAssignRolePermissionMutation();

  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Local assignment map for instant responsive UI and offline fallback
  // Maps role_id -> Set of permission_codes
  const [rolePermMap, setRolePermMap] = useState<Record<number, string[]>>({
    1: ['letter.create', 'letter.sign', 'letter.seal', 'letter.archive', 'chat.send', 'audit.view'],
    2: ['letter.create', 'letter.sign', 'chat.send'],
    3: ['letter.create', 'chat.send'],
    4: ['letter.create', 'chat.send', 'users.manage', 'directories.manage', 'audit.view'],
  });

  const rolesList: Role[] =
    remoteRoles?.data && remoteRoles.data.length > 0 ? remoteRoles.data : DEFAULT_ROLES;

  const permissionsList: Permission[] =
    remotePermissions?.data && remotePermissions.data.length > 0 ? remotePermissions.data : DEFAULT_PERMISSIONS;

  const activeRole = rolesList.find((r) => r.role_id === selectedRoleId) || rolesList[0];
  const activePerms = rolePermMap[activeRole.role_id] || [];

  const handleTogglePermission = async (perm: Permission) => {
    const isGranted = activePerms.includes(perm.permission_code);
    const updated = isGranted
      ? activePerms.filter((c) => c !== perm.permission_code)
      : [...activePerms, perm.permission_code];

    setRolePermMap((prev) => ({
      ...prev,
      [activeRole.role_id]: updated,
    }));

    try {
      await assignApi({
        role_id: activeRole.role_id,
        permission_id: perm.permission_id,
      }).unwrap();
    } catch {
      // Local state is already updated for offline/server resilience
    }
  };

  const filteredPermissions = permissionsList.filter(
    (p) =>
      p.permission_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.permission_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard Overview</span>
          </button>
          <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-amber-600" />
            <span>Role-Based Access Control (RBAC) &amp; Permissions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure system authorization matrix, granular privileges, and administrative clearance policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {rolesList.length} Active Roles
          </span>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            {permissionsList.length} Granular Permissions
          </span>
        </div>
      </div>

      {/* Main Grid: Roles List + Permissions Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Roles Selector */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            System Roles Roster
          </h2>
          <div className="space-y-2">
            {rolesList.map((role) => {
              const isSelected = role.role_id === activeRole.role_id;
              const grantedCount = (rolePermMap[role.role_id] || []).length;
              return (
                <button
                  key={role.role_id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.role_id)}
                  className={`w-full text-left p-4 rounded-2xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{role.role_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {grantedCount} perms
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{role.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permissions Matrix for Active Role */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  Permissions Matrix: {activeRole.role_name}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {activePerms.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Toggle capabilities granted to civil servants holding this role.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPermissions.map((perm) => {
              const hasPerm = activePerms.includes(perm.permission_code);
              return (
                <div
                  key={perm.permission_id}
                  onClick={() => handleTogglePermission(perm)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    hasPerm
                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                      hasPerm
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 bg-slate-50 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {perm.permission_name}
                      </span>
                    </div>
                    <code className="text-[10px] text-slate-500 font-mono block mt-0.5">
                      {perm.permission_code}
                    </code>
                    {perm.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{perm.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
