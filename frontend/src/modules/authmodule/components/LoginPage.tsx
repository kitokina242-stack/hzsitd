'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
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
      setErrorMessage('Please enter both email and password.');
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
            
            // Map role ID to UserRole string
            let mappedRole: UserRole = 'Officer';
            if (primaryRoleAssignment?.role_id === 1) mappedRole = 'System Admin';
            else if (primaryRoleAssignment?.role_id === 2) mappedRole = 'Department Head';
            else if (primaryRoleAssignment?.role_id === 3) mappedRole = 'Directory Lead';

            dispatch(setCredentials({
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
                avatar_url: '/assets/images/profile/user-1.jpg'
              }
            }));
          }
        } catch {
          // Fallback user state with token
          dispatch(setCredentials({
            token,
            refreshToken,
            user: {
              id: 1,
              full_name: email.split('@')[0],
              username: email.split('@')[0],
              email,
              role: 'Officer',
              position_title: 'Government Officer'
            }
          }));
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      console.warn('Backend login attempt returned error:', err);
      const errorCode = err?.data?.error?.code;
      const errorMsg = err?.data?.error?.message;

      if (errorCode === 'ACCOUNT_NOT_ACTIVE') {
        setPendingNotice(true);
        setErrorMessage('Account Pending Verification: Your account has been registered but is awaiting administrator activation.');
      } else if (errorCode === 'INVALID_CREDENTIALS' || err?.status === 401) {
        setErrorMessage('Invalid credentials: The email or password entered is incorrect.');
      } else {
        setErrorMessage(errorMsg || 'Unable to connect to the authentication server. You can also use quick demo personas below for offline testing.');
      }
    }
  };

  const handleQuickDemoLogin = (personaKey: keyof typeof PRESET_GOVERNMENT_USERS) => {
    dispatch(switchPresetUser(personaKey));
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-500/20 mb-4 ring-1 ring-white/20">
          <Shield className="w-8 h-8 text-white stroke-[2.2]" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-2">
          Federal Democratic Republic of Ethiopia
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          HZSITD Executive Portal
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Hadiya Zone Science & Information Technology Department
        </p>
      </div>

      {/* Main Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl ring-1 ring-white/10 sm:rounded-2xl sm:px-10 border border-slate-700/50">
          <div className="mb-6 pb-4 border-b border-slate-700/60">
            <h3 className="text-lg font-semibold text-white">Sign In to Command Center</h3>
            <p className="text-xs text-slate-400 mt-0.5">Enter your official credentials to access letters and directives</p>
          </div>

          {/* Pending Approval Notice */}
          {pendingNotice && (
            <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex gap-3 items-start animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Account Pending Verification</p>
                <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                  Your registration request is currently in queue. A System Administrator must assign your directory role before you can sign in.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !pendingNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex gap-2.5 items-center animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Official Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hzsitd.gov.et"
                  required
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors">
                  Need help?
                </span>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center pt-4 border-t border-slate-700/60">
            <p className="text-xs text-slate-400">
              New civil servant or staff member?{' '}
              <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Register an Account
              </Link>
            </p>
          </div>

          {/* One-Click Quick Testing Personas */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <div className="flex items-center gap-1.5 mb-2.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Test Access (Offline / Demo)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('dr_bezabih')}
                className="text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-700/70 border border-slate-700/50 hover:border-emerald-500/40 transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 truncate">Dr. Bezabih Alemu</div>
                <div className="text-[10px] text-emerald-400">Dept Head (Seal & Sign)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('eng_yohannes')}
                className="text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-700/70 border border-slate-700/50 hover:border-emerald-500/40 transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 truncate">Eng. Yohannes Haile</div>
                <div className="text-[10px] text-blue-400">Directory Lead</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('almaz_t')}
                className="text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-700/70 border border-slate-700/50 hover:border-emerald-500/40 transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 truncate">Almaz Tesfaye</div>
                <div className="text-[10px] text-amber-400">Officer (Dispatch)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin_solomon')}
                className="text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-700/70 border border-slate-700/50 hover:border-emerald-500/40 transition-all cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 truncate">Solomon Bekele</div>
                <div className="text-[10px] text-purple-400">System Admin</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
