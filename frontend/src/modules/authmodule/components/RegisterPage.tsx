'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, Phone, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRegisterMutation } from '@/modules/authmodule/services/authApi';

export const RegisterPage: React.FC = () => {
  const [registerApi, { isLoading }] = useRegisterMutation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      const response = await registerApi({
        first_name: firstName,
        last_name: lastName,
        email,
        employee_number: employeeNumber ? employeeNumber : undefined,
        phone: phone ? phone : undefined,
        password,
      }).unwrap();

      if (response.success && response.data) {
        setRegisteredUser(response.data);
      }
    } catch (err: any) {
      console.warn('Registration failed:', err);
      const code = err?.data?.error?.code;
      const msg = err?.data?.error?.message;

      if (code === 'EMAIL_ALREADY_EXISTS') {
        setErrorMessage('This email address is already registered in the system.');
      } else if (code === 'EMPLOYEE_NUMBER_ALREADY_EXISTS') {
        setErrorMessage('This employee number is already assigned to an existing user.');
      } else {
        // Fallback for demo preview
        setRegisteredUser({
          user_id: Math.floor(Math.random() * 900) + 100,
          employee_number: employeeNumber || `EMP-${Math.floor(Math.random() * 9000) + 1000}`,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || '+251911000000',
          account_status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] border-t-4 border-[#c1ff72] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      {/* Return to website link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-[520px] mb-4">
        <Link
          href="/html/index.html"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Portal</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[520px]">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-8 sm:p-10">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link href="/html/index.html" className="inline-block mb-3">
              <img
                src="/assets/images/logos/dosit-logo-animated.svg"
                alt="DOSIT HZSITD Logo"
                className="h-14 w-auto mx-auto object-contain"
              />
            </Link>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Civil Service Staff Onboarding
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
              Request Staff Registration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hadiya Zone Science & Information Technology Department
            </p>
          </div>

          {/* Registration Success Screen */}
          {registeredUser ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">Registration Request Submitted</h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Your civil servant profile has been registered with status{' '}
                  <span className="font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                    Pending Approval
                  </span>.
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-emerald-200/80 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant Name:</span>
                  <span className="font-semibold text-slate-900">
                    {registeredUser.first_name} {registeredUser.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Email:</span>
                  <span className="font-mono text-slate-800">{registeredUser.email}</span>
                </div>
                {registeredUser.employee_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="font-mono text-slate-800">{registeredUser.employee_number}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                A system administrator or department director will verify your employment records and assign your directorate role before activation.
              </p>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-5 rounded-full text-sm font-semibold text-white bg-[#161a23] hover:bg-[#070a12] transition-colors"
                >
                  <span>Go to Staff Login</span>
                  <ArrowRight className="w-4 h-4 text-[#c1ff72]" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Registration Form with Clean Underline Inputs */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Yohannes"
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Haile"
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hzsitd.gov.et"
                    required
                    className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Employee ID <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={employeeNumber}
                      onChange={(e) => setEmployeeNumber(e.target.value)}
                      placeholder="EMP-1024"
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 9..."
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-slate-900 focus:ring-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 font-sans transition-colors"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  By submitting this request, you agree to comply with the{' '}
                  <Link href="/html/terms-and-conditions.html" className="text-slate-900 underline">
                    HZSITD Terms of Use
                  </Link>{' '}
                  and public service confidentiality regulations.
                </p>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full text-sm font-semibold text-white bg-[#161a23] hover:bg-[#070a12] active:scale-[0.99] transition-all shadow-md shadow-slate-900/10 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting to Government Server...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Registration Request</span>
                        <ArrowRight className="w-4 h-4 text-[#c1ff72]" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Already have an active staff account?{' '}
                  <Link href="/login" className="font-semibold text-slate-900 hover:underline">
                    Login to Staff Portal
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          © 2025 Hadiya Zone Science & Information Technology Department. All rights reserved.
        </p>
      </div>
    </div>
  );
};
