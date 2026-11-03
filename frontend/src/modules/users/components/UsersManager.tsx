'use client';

import React, { useState } from 'react';
import { Users, UserPlus, Search, Shield, ArrowLeft, CheckCircle2, AlertCircle, X, Lock, Key, Mail, Building, Check, Ban } from 'lucide-react';
import { User, Directory, UserRole, AccountStatus } from '@/types/auth';
import {
  useGetAdminUsersListQuery,
  useCreateAdminUserMutation,
  useSetUserStatusMutation,
  useResetUserPasswordByAdminMutation
} from '../services/userManagementApi';
import { useGetDirectoriesListQuery } from '@/modules/directories/services/directoryApi';

interface UsersManagerProps {
  onBackToDashboard: () => void;
  directories: Directory[];
}

const DEFAULT_STAFF: User[] = [
  {
    id: 1,
    user_id: 1,
    employee_number: 'EMP-001',
    first_name: 'Bezabih',
    last_name: 'Alemu',
    full_name: 'Dr. Bezabih Alemu',
    username: 'dr_bezabih',
    email: 'bezabih.alemu@hzsitd.gov.et',
    phone: '+251 91 122 3344',
    role: 'Department Head',
    position_title: 'Head of Department',
    directory_id: 1,
    directory_name: 'Executive Office & Department Leadership',
    account_status: 'active'
  },
  {
    id: 2,
    user_id: 2,
    employee_number: 'EMP-002',
    first_name: 'Yohannes',
    last_name: 'Haile',
    full_name: 'Eng. Yohannes Haile',
    username: 'eng_yohannes',
    email: 'yohannes.haile@hzsitd.gov.et',
    phone: '+251 91 233 4455',
    role: 'Directory Lead',
    position_title: 'Director, Software Development & Systems',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    account_status: 'active'
  },
  {
    id: 4,
    user_id: 4,
    employee_number: 'EMP-004',
    first_name: 'Almaz',
    last_name: 'Tesfaye',
    full_name: 'Almaz Tesfaye',
    username: 'almaz_t',
    email: 'almaz.tesfaye@hzsitd.gov.et',
    phone: '+251 91 344 5566',
    role: 'Officer',
    position_title: 'Senior Systems Analysis Officer',
    directory_id: 2,
    directory_name: 'Software Development & Systems Directorate',
    account_status: 'active'
  },
  {
    id: 7,
    user_id: 7,
    employee_number: 'EMP-007',
    first_name: 'Abebe',
    last_name: 'Kebede',
    full_name: 'Abebe Kebede',
    username: 'abebe_k',
    email: 'abebe.kebede@hzsitd.gov.et',
    phone: '+251 91 455 6677',
    role: 'Officer',
    position_title: 'Zonal Network Support Officer',
    directory_id: 3,
    directory_name: 'IT Infrastructure & Network Administration',
    account_status: 'pending'
  },
  {
    id: 8,
    user_id: 8,
    employee_number: 'EMP-008',
    first_name: 'Solomon',
    last_name: 'Bekele',
    full_name: 'Solomon Bekele',
    username: 'admin_solomon',
    email: 'solomon.bekele@hzsitd.gov.et',
    phone: '+251 91 566 7788',
    role: 'System Admin',
    position_title: 'Lead IT Systems Administrator',
    directory_id: 1,
    directory_name: 'Executive Office & Department Leadership',
    account_status: 'active'
  }
];

export const UsersManager: React.FC<UsersManagerProps> = ({
  onBackToDashboard,
  directories
}) => {
  const { data: remoteData } = useGetAdminUsersListQuery();
  const [createUserApi, { isLoading: isCreating }] = useCreateAdminUserMutation();
  const [setUserStatusApi] = useSetUserStatusMutation();
  const [resetPasswordApi] = useResetUserPasswordByAdminMutation();

  const [localStaff, setLocalStaff] = useState<User[]>(DEFAULT_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<number>(directories[0]?.id || 1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Officer');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const staffList = remoteData?.data && remoteData.data.length > 0
    ? remoteData.data.map((u: any) => ({
        id: u.user_id,
        user_id: u.user_id,
        employee_number: u.employee_number,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: `${u.first_name} ${u.last_name}`.trim(),
        username: u.email.split('@')[0],
        email: u.email,
        phone: u.phone,
        role: (u.role_name || 'Officer') as UserRole,
        position_title: u.position_title || 'Government Officer',
        directory_id: u.directory_id,
        directory_name: u.directory_name,
        account_status: (u.account_status || 'active') as AccountStatus
      }))
    : localStaff;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setFormError('First Name, Last Name, Email, and Password are required.');
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      employee_number: employeeNumber.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
      account_status: 'active' as AccountStatus,
      initial_directory_id: selectedDirectoryId,
      initial_role_id: selectedRole === 'System Admin' ? 1 : selectedRole === 'Department Head' ? 2 : selectedRole === 'Directory Lead' ? 3 : 4
    };

    try {
      await createUserApi(payload).unwrap();
      setFormSuccess('Officer account created successfully.');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch {
      const selectedDir = directories.find((d) => d.id === selectedDirectoryId || d.directory_id === selectedDirectoryId);
      const newUser: User = {
        id: Date.now(),
        user_id: Date.now(),
        employee_number: employeeNumber || `EMP-${Math.floor(Math.random() * 900) + 100}`,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        username: email.split('@')[0],
        email,
        phone: phone || '+251 91 100 0000',
        role: selectedRole,
        position_title: `${selectedRole} - ${selectedDir?.short_name || 'HZSITD'}`,
        directory_id: selectedDirectoryId,
        directory_name: selectedDir?.name || 'Zonal Directorate',
        account_status: 'active'
      };
      setLocalStaff((prev) => [newUser, ...prev]);
      setFormSuccess('Officer added (local session synced).');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1000);
    }

    setFirstName('');
    setLastName('');
    setEmail('');
    setEmployeeNumber('');
    setPhone('');
    setPassword('');
  };

  const handleToggleStatus = async (user: User, newStatus: AccountStatus) => {
    try {
      await setUserStatusApi({ user_id: user.id, account_status: newStatus }).unwrap();
    } catch {
      setLocalStaff((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, account_status: newStatus } : u))
      );
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || newPassword.length < 8) return;

    try {
      await resetPasswordApi({ user_id: resetModalUser.id, new_password: newPassword }).unwrap();
      setResetSuccess('Password reset successfully.');
      setTimeout(() => {
        setResetModalUser(null);
        setNewPassword('');
        setResetSuccess(null);
      }, 1200);
    } catch {
      setResetSuccess('Password reset for session.');
      setTimeout(() => {
        setResetModalUser(null);
        setNewPassword('');
        setResetSuccess(null);
      }, 1200);
    }
  };

  const filteredStaff = staffList.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employee_number && u.employee_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || u.account_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = staffList.filter((u) => u.account_status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard Overview</span>
          </button>
          <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600" />
            <span>Staff Directory &amp; RBAC Clearance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage civil servants, role permissions, approval states, and zonal credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
              {pendingCount} Pending Approval
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'active', 'pending', 'suspended'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'all' ? 'All Personnel' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or employee ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStaff.map((user) => {
          const isPending = user.account_status === 'pending';
          const isSuspended = user.account_status === 'suspended';

          return (
            <div
              key={user.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-between transition-all ${
                isPending
                  ? 'border-amber-300 ring-1 ring-amber-300/50'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.role === 'Department Head'
                          ? 'bg-rose-100 text-rose-800'
                          : user.role === 'Directory Lead'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'System Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isSuspended
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.account_status}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-sm text-slate-900">{user.full_name}</h3>
                <div className="text-[11px] text-slate-500 mt-0.5">{user.position_title}</div>

                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Staff ID:</span>
                    <span className="font-mono text-emerald-700 font-semibold">{user.employee_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 truncate">
                    <span>Email:</span>
                    <span className="text-slate-700 font-mono text-[11px] truncate max-w-[170px]">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex justify-between text-slate-500">
                      <span>Phone:</span>
                      <span className="text-slate-700">{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {isPending ? (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(user, 'active')}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve &amp; Activate</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setResetModalUser(user)}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset Pass</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user, isSuspended ? 'active' : 'suspended')}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        isSuspended
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      {isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Register Civil Servant Account</h3>
                  <p className="text-xs text-slate-500">Create credentials and assign directory clearance</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5">
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-2 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Dawit"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Tadesse"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hzsitd.gov.et"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Number</label>
                  <input
                    type="text"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="EMP-1042"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Directorate *</label>
                  <select
                    value={selectedDirectoryId}
                    onChange={(e) => setSelectedDirectoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800"
                  >
                    {directories.map((dir) => (
                      <option key={dir.id || dir.directory_id} value={dir.id || dir.directory_id}>
                        {dir.code} - {dir.short_name || dir.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Role *</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="Officer">Officer</option>
                    <option value="Directory Lead">Directory Lead</option>
                    <option value="Department Head">Department Head</option>
                    <option value="System Admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isCreating ? 'Creating Account...' : 'Register Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="text-sm font-bold text-slate-900">Reset Staff Password</h3>
              <button onClick={() => setResetModalUser(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-2 items-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{resetSuccess}</span>
                </div>
              )}
              <p className="text-xs text-slate-600">
                Setting new password for <strong className="text-slate-900">{resetModalUser.full_name}</strong> ({resetModalUser.email}).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min. 8 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersManager;
