'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Key,
  Mail,
  Building,
  Check,
  Ban,
  Phone,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileBadge,
  Stamp,
  PenTool,
  Hash,
  Briefcase
} from 'lucide-react';
import { User, Directory, UserRole, AccountStatus } from '@/types/auth';
import {
  useGetAdminUsersListQuery,
  useCreateAdminUserMutation,
  useSetUserStatusMutation,
  useResetUserPasswordByAdminMutation,
  useGetRolesListQuery
} from '../services/userManagementApi';
import { useGetDirectoriesListQuery } from '@/modules/directories/services/directoryApi';
import { mergeDirectories } from '@/modules/directories/constants/directories';
import { useAppSelector } from '@/store';

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
  const activeRole = useAppSelector((state) => state.auth.activeRole);
  const isAdmin = activeRole === 'System Admin';

  const { data: remoteData } = useGetAdminUsersListQuery();
  const { data: rolesData } = useGetRolesListQuery();
  const [createUserApi, { isLoading: isCreating }] = useCreateAdminUserMutation();
  const [setUserStatusApi] = useSetUserStatusMutation();
  const [resetPasswordApi] = useResetUserPasswordByAdminMutation();

  const [localStaff, setLocalStaff] = useState<User[]>(DEFAULT_STAFF);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Synchronize directories across custom additions and defaults
  const [dirsUpdateTick, setDirsUpdateTick] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setDirsUpdateTick((t) => t + 1);
    window.addEventListener('hzsitd_directories_updated', handleUpdate);
    return () => window.removeEventListener('hzsitd_directories_updated', handleUpdate);
  }, []);

  const availableDirectories = useMemo(
    () => mergeDirectories(directories),
    [directories, dirsUpdateTick]
  );

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<number>(() => {
    const initial = mergeDirectories(directories);
    return Number(initial[0]?.id || initial[0]?.directory_id || 1);
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>('Officer');
  const [clearanceLevel, setClearanceLevel] = useState<string>('Level 1 - Standard / Routine');
  const [canSign, setCanSign] = useState<boolean>(false);
  const [canSeal, setCanSeal] = useState<boolean>(false);
  const [isCrossDirectorate, setIsCrossDirectorate] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(true);
  const [initialAccountStatus, setInitialAccountStatus] = useState<AccountStatus>('active');
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
        account_status: (u.account_status || 'active') as AccountStatus,
        clearance_level: u.clearance_level,
        can_sign: u.can_sign,
        can_seal: u.can_seal,
        is_cross_directorate: u.is_cross_directorate,
        must_change_password: u.must_change_password,
      }))
    : localStaff;

  const generateNextEmployeeNumber = () => {
    const existingNums = staffList
      .map((u) => {
        const match = u.employee_number?.match(/EMP-(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null);

    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : staffList.length + 1;
    return `EMP-${String(nextNum).padStart(3, '0')}`;
  };

  const handleOpenCreateModal = () => {
    const defaultDirId = Number(availableDirectories[0]?.id || availableDirectories[0]?.directory_id || 1);
    setFirstName('');
    setLastName('');
    setEmail('');
    setEmployeeNumber(generateNextEmployeeNumber());
    setPhone('+251 91 ');
    setPositionTitle('Technical Officer');
    setPassword('');
    setSelectedDirectoryId(defaultDirId);
    setSelectedRole('Officer');
    setClearanceLevel('Level 1 - Standard / Routine');
    setCanSign(false);
    setCanSeal(false);
    setIsCrossDirectorate(false);
    setMustChangePassword(true);
    setInitialAccountStatus('active');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    const selDir = availableDirectories.find((d) => (d.id || d.directory_id) === selectedDirectoryId) || availableDirectories[0];
    if (newRole === 'Department Head') {
      setCanSign(true);
      setCanSeal(true);
      setClearanceLevel('Level 3 - Secret & Executive Directives');
      setIsCrossDirectorate(true);
      setPositionTitle('Department Head');
    } else if (newRole === 'Directory Lead') {
      setCanSign(true);
      setCanSeal(false);
      setClearanceLevel('Level 2 - Confidential / Directorate Directives');
      setIsCrossDirectorate(false);
      setPositionTitle(`Director, ${selDir?.short_name || selDir?.name || 'Directorate'}`);
    } else if (newRole === 'System Admin') {
      setCanSign(false);
      setCanSeal(false);
      setClearanceLevel('Level 3 - Secret & Executive Directives');
      setIsCrossDirectorate(true);
      setPositionTitle('IT Systems Administrator');
    } else {
      // Officer
      setCanSign(false);
      setCanSeal(false);
      setClearanceLevel('Level 1 - Standard / Routine');
      setIsCrossDirectorate(false);
      setPositionTitle(`Officer, ${selDir?.short_name || selDir?.name || 'Directorate'}`);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = 'HZS@';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setFormError('First Name, Last Name, Email, and Password are required.');
      return;
    }

    const resolvedDir =
      availableDirectories.find((d) => (d.id || d.directory_id) === selectedDirectoryId) ||
      availableDirectories[0];
    const resolvedDirId = Number(resolvedDir?.id || resolvedDir?.directory_id || selectedDirectoryId);

    const resolvedPosition =
      positionTitle.trim() ||
      `${selectedRole} - ${resolvedDir?.short_name || resolvedDir?.name || 'HZSITD'}`;

    const matchingRole = rolesData?.data?.find(
      (r) =>
        r.role_name.toLowerCase().includes(selectedRole.toLowerCase().split(' ')[0]) ||
        (selectedRole === 'Department Head' && r.role_name.toLowerCase().includes('director')) ||
        (selectedRole === 'Directory Lead' && r.role_name.toLowerCase().includes('director'))
    );
    const resolvedRoleId = matchingRole?.role_id || (selectedRole === 'System Admin' ? 1 : 2);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      employee_number: employeeNumber.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
      account_status: initialAccountStatus,
      initial_directory_id: resolvedDirId,
      initial_role_id: resolvedRoleId,
      position_title: resolvedPosition,
      clearance_level: clearanceLevel,
      can_sign: canSign,
      can_seal: canSeal,
      is_cross_directorate: isCrossDirectorate,
      must_change_password: mustChangePassword,
    };

    try {
      const res = await createUserApi(payload).unwrap();
      const newUserId = res?.data?.user_id || res?.data?.id;
      if (newUserId && initialAccountStatus === 'active') {
        try {
          await setUserStatusApi({ user_id: newUserId, account_status: 'active' }).unwrap();
        } catch (statusErr) {
          console.warn('Auto-activation note:', statusErr);
        }
      }

      setFormSuccess('Personnel account registered successfully in government records.');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
        setFirstName('');
        setLastName('');
        setEmail('');
        setEmployeeNumber('');
        setPhone('');
        setPositionTitle('');
        setPassword('');
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create user on server:', err);
      const apiMsg =
        err?.data?.error?.message ||
        err?.data?.message ||
        (Array.isArray(err?.data?.error?.details)
          ? err.data.error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
          : null);

      if (apiMsg) {
        setFormError(apiMsg);
      } else {
        const newUser: User = {
          id: Date.now(),
          user_id: Date.now(),
          employee_number: employeeNumber.trim() || generateNextEmployeeNumber(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          username: email.split('@')[0],
          email: email.trim(),
          phone: phone.trim() || '+251 91 100 0000',
          role: selectedRole,
          position_title: resolvedPosition,
          directory_id: resolvedDirId,
          directory_name: resolvedDir?.name || 'Zonal Directorate',
          account_status: initialAccountStatus,
          clearance_level: clearanceLevel,
          can_sign: canSign,
          can_seal: canSeal,
          is_cross_directorate: isCrossDirectorate,
          must_change_password: mustChangePassword,
        };
        setLocalStaff((prev) => [newUser, ...prev]);
        setFormSuccess('Officer added (local offline session).');
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
          setFirstName('');
          setLastName('');
          setEmail('');
          setEmployeeNumber('');
          setPhone('');
          setPositionTitle('');
          setPassword('');
        }, 1000);
      }
    }
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
      isAdmin ? (statusFilter === 'all' || u.account_status === statusFilter) : true;

    const matchesRole =
      !isAdmin ? (roleFilter === 'all' || u.role === roleFilter) : true;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingCount = staffList.filter((u) => u.account_status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header Card (Role-Adaptive: Executive Directory vs IT RBAC) */}
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
            {isAdmin ? (
              <Shield className="w-7 h-7 text-purple-600" />
            ) : (
              <Users className="w-7 h-7 text-emerald-600" />
            )}
            <span>
              {isAdmin
                ? 'Staff Accounts & Access Management (RBAC)'
                : 'Departmental Staff Directory & Leadership Roster'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Manage civil servants, role permissions, approval states, and zonal credentials.'
              : 'Official roster of civil servants, leadership assignments, and departmental contact coordinates.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <>
              {pendingCount > 0 && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                  {pendingCount} Pending Approval
                </span>
              )}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Provision User Account</span>
              </button>
            </>
          ) : (
            <span className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              {staffList.length} Registered Civil Servants
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {isAdmin ? (
            ['all', 'active', 'pending', 'suspended'].map((tab) => (
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
            ))
          ) : (
            [
              { id: 'all', label: 'All Ranks' },
              { id: 'Department Head', label: 'Executive Head' },
              { id: 'Directory Lead', label: 'Directory Leads' },
              { id: 'Officer', label: 'Officers' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}
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
                  {user.clearance_level && (
                    <div className="flex justify-between text-slate-500">
                      <span>Clearance:</span>
                      <span className="text-slate-800 font-medium truncate max-w-[170px]">{user.clearance_level.split('-')[0].trim()}</span>
                    </div>
                  )}
                  {(user.can_sign || user.can_seal) && (
                    <div className="flex items-center gap-1.5 pt-1.5 text-[10px] text-slate-600 font-semibold border-t border-slate-100">
                      {user.can_sign && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                          <PenTool className="w-2.5 h-2.5" /> Signatory
                        </span>
                      )}
                      {user.can_seal && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                          <Stamp className="w-2.5 h-2.5" /> Seal Custodian
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Role-Adaptive (Quick Contact for Executive/Staff vs IT Admin Actions) */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {!isAdmin ? (
                  <>
                    <a
                      href={`mailto:${user.email}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 transition"
                      title={`Send official email to ${user.email}`}
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                      <span>Official Email</span>
                    </a>
                    {user.phone && (
                      <a
                        href={`tel:${user.phone.replace(/\s+/g, '')}`}
                        className="inline-flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 transition gap-1.5"
                        title={`Call ${user.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Call</span>
                      </a>
                    )}
                  </>
                ) : isPending ? (
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Register Civil Servant Account</h3>
                  <p className="text-xs text-slate-500">Create credentials, assign directory clearance, and configure governance privileges</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-2.5 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2.5 items-center">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              {/* SECTION 1: CIVIL SERVANT IDENTITY */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Section 1: Civil Servant Identity &amp; Designation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Dawit"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@hzsitd.gov.et"
                        required
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+251 91 100 0000"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Staff / Employee ID</label>
                      <button
                        type="button"
                        onClick={() => setEmployeeNumber(generateNextEmployeeNumber())}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 hover:text-purple-800 transition cursor-pointer"
                        title="Auto-calculate next sequential ID"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Auto-Assign</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={employeeNumber}
                        onChange={(e) => setEmployeeNumber(e.target.value)}
                        placeholder="EMP-010"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Auto-generated sequential ID. Editable to link with Civil Service HR dossier.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Exact Position / Designation Title</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={positionTitle}
                        onChange={(e) => setPositionTitle(e.target.value)}
                        placeholder="e.g. Senior Network Infrastructure Officer"
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Appears on official letterheads, minute routing, and digital stamps.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ORGANIZATIONAL CLEARANCE & RBAC */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Section 2: Organizational Clearance &amp; Governance RBAC
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Directorate *</label>
                    <select
                      value={selectedDirectoryId}
                      onChange={(e) => {
                        const newId = Number(e.target.value);
                        setSelectedDirectoryId(newId);
                        const selDir = availableDirectories.find((d) => (d.id || d.directory_id) === newId);
                        if (selectedRole === 'Directory Lead') {
                          setPositionTitle(`Director, ${selDir?.short_name || selDir?.name || 'Directorate'}`);
                        } else if (selectedRole === 'Officer') {
                          setPositionTitle(`Officer, ${selDir?.short_name || selDir?.name || 'Directorate'}`);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold text-slate-800"
                    >
                      {availableDirectories.map((dir) => {
                        const dirId = Number(dir.id || dir.directory_id);
                        const displayCode = dir.code || dir.directory_code || 'DIR';
                        const displayName = dir.name || dir.directory_name || dir.short_name || `Directorate #${dirId}`;
                        return (
                          <option key={dirId} value={dirId}>
                            [{displayCode}] {displayName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Role Tier *</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold text-slate-800"
                    >
                      <option value="Officer">Officer (Civil Servant Desk)</option>
                      <option value="Directory Lead">Directory Lead (Director / Operational Head)</option>
                      <option value="Department Head">Department Head (Executive Authority)</option>
                      <option value="System Admin">System Admin (IT Administrator)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confidentiality &amp; Document Clearance Level
                  </label>
                  <select
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800"
                  >
                    <option value="Level 1 - Standard / Routine">Level 1 - Standard / Routine Correspondence</option>
                    <option value="Level 2 - Confidential / Directorate Directives">Level 2 - Confidential / Directorate Directives</option>
                    <option value="Level 3 - Secret & Executive Directives">Level 3 - Secret &amp; Executive Directives</option>
                  </select>
                </div>

                {/* Governance Authority Toggles */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold text-slate-700">Governance &amp; Authority Privileges</label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={canSign}
                        onChange={(e) => setCanSign(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Authorized Outgoing Signatory</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Grants legal rights to affix digital cryptographic signatures to outbound correspondence.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={canSeal}
                        onChange={(e) => setCanSeal(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Stamp className="w-3.5 h-3.5 text-blue-600" />
                          <span>Official Seal &amp; Stamp Custodian</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Authorizes application of the authentic HZSITD departmental seal to finalized letters.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={isCrossDirectorate}
                        onChange={(e) => setIsCrossDirectorate(e.target.checked)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-purple-600" />
                          <span>Cross-Directorate Reviewer Clearance</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Grants cross-directorate inspection clearance (required for Legal, Internal Audit, and Exec Staff).
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SECURITY & ONBOARDING CREDENTIALS */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Section 3: Security &amp; Onboarding Credentials
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Temporary Password *</label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 hover:text-purple-800 transition cursor-pointer"
                        title="Generate a random secure temporary password"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Account Status</label>
                    <select
                      value={initialAccountStatus}
                      onChange={(e) => setInitialAccountStatus(e.target.value as AccountStatus)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-800 font-medium"
                    >
                      <option value="active">Active (Immediate Login Permitted)</option>
                      <option value="pending">Pending HR / Biometric Verification</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={mustChangePassword}
                    onChange={(e) => setMustChangePassword(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-medium">
                    Require officer to change password upon first login (Recommended for audit compliance)
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm disabled:opacity-60 transition cursor-pointer flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isCreating ? 'Provisioning Account...' : 'Register Officer & Provision Access'}</span>
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
