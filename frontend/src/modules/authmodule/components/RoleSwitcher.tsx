'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/store';
import { switchPresetUser, PRESET_GOVERNMENT_USERS } from '../features/authSlice';
import { useSwitchRoleMutation } from '../services/authApi';
import { ChevronDown, ShieldCheck, Check } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [isOpen, setIsOpen] = useState(false);
  const [switchRoleApi] = useSwitchRoleMutation();

  const handleSelectUser = async (userKey: keyof typeof PRESET_GOVERNMENT_USERS) => {
    dispatch(switchPresetUser(userKey));
    setIsOpen(false);
    try {
      const targetUser = PRESET_GOVERNMENT_USERS[userKey];
      await switchRoleApi({ username: targetUser.username, role: targetUser.role });
    } catch (err) {
      console.error('Error switching role on backend:', err);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Department Head':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Directory Lead':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Officer':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="role-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-900 leading-tight">
              {currentUser?.full_name}
            </div>
            <div className="text-xs text-slate-500">{currentUser?.position_title}</div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-2 space-y-1">
            <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Switch Government Persona
            </div>
            {Object.entries(PRESET_GOVERNMENT_USERS).map(([key, u]) => {
              const isSelected = currentUser?.username === u.username;
              return (
                <button
                  key={key}
                  type="button"
                  data-testid="role-option"
                  onClick={() => handleSelectUser(key as keyof typeof PRESET_GOVERNMENT_USERS)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition ${
                    isSelected ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-900 font-medium">{u.full_name}</span>
                    <span className="text-xs text-slate-500">{u.position_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getRoleBadgeClass(
                        u.role
                      )}`}
                    >
                      {u.role}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
