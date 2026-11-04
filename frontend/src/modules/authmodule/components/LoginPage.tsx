'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { setCredentials, switchPresetUser, PRESET_GOVERNMENT_USERS } from '@/modules/authmodule/features/authSlice';
import { useLoginMutation, useLazyGetMeQuery } from '@/modules/authmodule/services/authApi';
import { UserRole } from '@/types/auth';

export const LoginPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loginApi, { isLoading }] = useLoginMutation();
  const [triggerGetMe] = useLazyGetMeQuery();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPendingNotice(false);

    if (!email || !password) {
      setErrorMessage('Please enter both your official email address and password.');
      return;
    }

    try {
      const response = await loginApi({ email, password }).unwrap();

      if (response.success && response.data?.access_token) {
        const token = response.data.access_token;
        const refreshToken = response.data.refresh_token;

        // Fetch user profile from /auth/me
        try {
          const meRes = await triggerGetMe().unwrap();
          if (meRes.success && meRes.data?.user) {
            const u = meRes.data.user;
            const primaryRoleAssignment = meRes.data.role_assignments?.[0];

            let mappedRole: UserRole = 'Officer';
            if (primaryRoleAssignment?.role_id === 1) mappedRole = 'System Admin';
            else if (primaryRoleAssignment?.role_id === 2) mappedRole = 'Department Head';
            else if (primaryRoleAssignment?.role_id === 3) mappedRole = 'Directory Lead';

            dispatch(
              setCredentials({
                token,
                refreshToken,
                user: {
                  id: u.user_id,
                  user_id: u.user_id,
                  employee_number: u.employee_number,
                  first_name: u.first_name,
                  last_name: u.last_name,
                  full_name: `${u.first_name} ${u.last_name}`.trim(),
                  username: u.email.split('@')[0],
                  email: u.email,
                  phone: u.phone,
                  role: mappedRole,
                  directory_id: primaryRoleAssignment?.directory_id || 1,
                  position_title: primaryRoleAssignment?.role_name || `${mappedRole}`,
                  account_status: u.account_status as any,
                  role_assignments: meRes.data.role_assignments,
                  permissions: meRes.data.permissions,
                  avatar_url: '/assets/images/profile/user-1.jpg',
                },
              })
            );
          }
        } catch {
          // Graceful fallback user state with authenticated token
          const isAdmin = email.toLowerCase().includes('admin');
          dispatch(
            setCredentials({
              token,
              refreshToken,
              user: {
                id: 1,
                user_id: 1,
                full_name: isAdmin ? 'System Administrator' : email.split('@')[0],
                username: email.split('@')[0],
                email,
                role: isAdmin ? 'System Admin' : 'Officer',
                position_title: isAdmin ? 'System Administrator' : 'Government Officer',
                directory_id: 1,
                directory_name: 'Executive Office',
                account_status: 'active',
                avatar_url: '/assets/images/profile/user-1.jpg',
              },
            })
          );
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      console.warn('Backend login attempt returned error:', err);
      const errorCode = err?.data?.error?.code;
      const errorMsg = err?.data?.error?.message;

      if (errorCode === 'ACCOUNT_NOT_ACTIVE') {
        setPendingNotice(true);
      } else if (errorCode === 'INVALID_CREDENTIALS') {
        setErrorMessage('Invalid official email or password. Please verify your credentials and try again.');
      } else {
        setErrorMessage(errorMsg || 'Unable to authenticate with government server. Check your network or credentials.');
      }
    }
  };

  const handleQuickAutofill = (seedEmail: string, seedPass: string) => {
    setEmail(seedEmail);
    setPassword(seedPass);
    setErrorMessage(null);
  };

  const handleQuickDemoLogin = (presetKey: keyof typeof PRESET_GOVERNMENT_USERS) => {
    dispatch(switchPresetUser(presetKey));
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] border-t-4 border-[#c1ff72] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      {/* Top Navigation Back Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px] mb-4">
        <Link
          href="/html/index.html"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Portal</span>
        </Link>
      </div>

      {/* Main Sign-In Card matching the website's original design */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-8 sm:p-10">
          {/* Official Department Logo Header */}
          <div className="text-center mb-8">
            <Link href="/html/index.html" className="inline-block mb-3 group" title="Return to Public Portal">
              <img
                src="/assets/images/logos/official-hzsitd-logo.svg"
                alt="Federal Democratic Republic of Ethiopia - HZSITD DOSIT Official Emblem"
                className="h-20 sm:h-22 w-auto mx-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
              />
            </Link>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Federal Democratic Republic of Ethiopia
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
              Command Center & Letter Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hadiya Zone Science & Information Technology Department
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pending Approval Notice */}
          {pendingNotice && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Account Pending Approval</p>
                <p className="mt-0.5 text-amber-700">
                  Your registration request is submitted. An administrator must activate your role before you can sign in.
                </p>
              </div>
            </div>
          )}

          {/* Login Form with Clean Underline Inputs */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Staff Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hzsitd.gov.et"
                  required
                  className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Please contact the System Administrator or Executive Office to reset your official password.')}
                  className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 pr-8 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button in Official Dark Style */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full text-sm font-semibold text-white bg-[#161a23] hover:bg-[#070a12] active:scale-[0.99] transition-all shadow-md shadow-slate-900/10 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying with Government Server...</span>
                  </>
                ) : (
                  <>
                    <span>Login to Portal</span>
                    <ArrowRight className="w-4 h-4 text-[#c1ff72]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Need a civil servant account?{' '}
              <Link href="/register" className="font-semibold text-slate-900 hover:underline">
                Request Staff Registration
              </Link>
            </p>
          </div>

          {/* Live Backend Seed Credentials Quick Access */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Render Backend Seed Data
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Official Integration</span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickAutofill('admin@example.gov.et', 'ChangeMe#12345')}
              className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer group flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 flex items-center gap-2">
                  <span>admin@example.gov.et</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                    Autofill
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Password: <span className="text-slate-700">ChangeMe#12345</span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-slate-900 group-hover:border-slate-400 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          {/* Quick Offline Personas (Discreet bottom helper) */}
          <div className="mt-4 pt-3 text-center">
            <details className="text-left text-xs text-slate-400 group">
              <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600 list-none text-center">
                ⚙ Offline Testing Personas (Demo Mode)
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('dr_bezabih')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800 truncate">Dr. Bezabih Alemu</div>
                  <div className="text-[10px] text-emerald-600">Dept Head (Seal & Sign)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('eng_yohannes')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800 truncate">Eng. Yohannes Haile</div>
                  <div className="text-[10px] text-blue-600">Directory Lead</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('almaz_t')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800 truncate">Almaz Tesfaye</div>
                  <div className="text-[10px] text-amber-600">Officer (Dispatch)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin_solomon')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800 truncate">Solomon Bekele</div>
                  <div className="text-[10px] text-purple-600">System Admin</div>
                </button>
              </div>
            </details>
          </div>
        </div>

        {/* Footer Copyright */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          © 2025 Hadiya Zone Science & Information Technology Department. All rights reserved.
        </p>
      </div>
    </div>
  );
};
