'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/modules/authmodule/features/authSlice';
import {
  useGetStatsQuery,
  useGetLettersQuery,
  useExecuteLetterActionMutation,
  WorkflowAction,
} from '../services/letterApi';
import { useGetDirectoriesQuery, useGetUsersQuery } from '@/modules/authmodule/services/authApi';
import { Letter } from '@/types/letter';
import { MetricCard } from '../components/MetricCard';
import { LetterTable } from '../components/LetterTable';
import { LetterDetailsSheet } from '../components/LetterDetailsSheet';
import { FullDocumentModal } from '../components/FullDocumentModal';
import { ComposeModal } from '../components/ComposeModal';
import { AssignMinuteModal } from '../components/AssignMinuteModal';
import { RoleSwitcher } from '@/modules/authmodule/components/RoleSwitcher';
import { useSocket } from '@/modules/messagemodule/hooks/useSocket';
import { NotificationDropdown } from '@/modules/messagemodule/components/NotificationDropdown';
import { StatusPill } from '../components/StatusPill';
import { PriorityBadge } from '../components/PriorityBadge';
import {
  Search,
  Plus,
  Home,
  Mail,
  Send,
  FileText,
  Archive,
  Shield,
  CheckSquare,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Folder,
  Users,
  Settings,
  Download,
  RotateCcw,
  ArrowLeft,
  Clock,
  Printer,
  Share2,
  UserCheck,
  AlertTriangle,
  FileEdit,
  CornerDownRight,
  Paperclip,
  ExternalLink,
  LogOut,
} from 'lucide-react';

export type NavKey =
  | 'dashboard'
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'archived'
  | 'endorsements'
  | 'clearance'
  | 'directives'
  | 'directory'
  | 'audit'
  | 'users'
  | 'settings';

interface LetterSubjectCellProps {
  letter: Letter;
  onOpenPdf?: (id: number) => void;
}

const LetterSubjectCell: React.FC<LetterSubjectCellProps> = ({ letter, onOpenPdf }) => (
  <div className="max-w-xl">
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-semibold text-slate-900 truncate" title={letter.subject}>
        {letter.subject}
      </span>
      {Boolean(letter.has_pdf) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPdf?.(letter.id);
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition flex-shrink-0"
          title="Open Scanned PDF Original"
        >
          <FileText className="w-2.5 h-2.5" />
          PDF
        </button>
      )}
      {Boolean(letter.attachment_count && Number(letter.attachment_count) > 0) && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0"
          title={`${letter.attachment_count} attachment(s)`}
        >
          <Paperclip className="w-2.5 h-2.5" />
          {letter.attachment_count}
        </span>
      )}
    </div>
    <div className="text-[10px] text-slate-400 truncate mt-0.5">{letter.body}</div>
  </div>
);

export const LetterDashboardLayout: React.FC = () => {
  useSocket(); // Real-time socket listeners & RTK cache invalidation

  const activeRole = useAppSelector((state) => state.auth.activeRole);
  const currentUser = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    try {
      localStorage.removeItem('hzsitd_token');
      localStorage.removeItem('hzsitd_user');
      sessionStorage.clear();
    } catch (e) {}
    dispatch(logout());
    window.location.href = '/html/index.html';
  };

  const [currentNav, setCurrentNav] = useState<NavKey>('dashboard');
  const [selectedDirId, setSelectedDirId] = useState<number | null>(null);
  const [selectedLetterId, setSelectedLetterId] = useState<number | null>(null);
  const [fullDocLetterId, setFullDocLetterId] = useState<number | null>(null);
  const [fullDocTab, setFullDocTab] = useState<'document' | 'pdf' | 'attachments' | 'timeline' | 'minutes'>('document');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialSubject, setComposeInitialSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [assignModalLetter, setAssignModalLetter] = useState<Letter | null>(null);
  const [assignModalMode, setAssignModalMode] = useState<'assign_directory' | 'delegate_officer'>('assign_directory');

  // RBAC permissions for System Governance
  const canAccessAudit = activeRole === 'System Admin' || activeRole === 'Department Head';
  const canAccessUsers = activeRole === 'System Admin' || activeRole === 'Department Head';
  const canAccessSettings = activeRole === 'System Admin';

  // Guard navigation against unauthorized direct access
  useEffect(() => {
    if (currentNav === 'settings' && !canAccessSettings) {
      setCurrentNav('dashboard');
    } else if (currentNav === 'audit' && !canAccessAudit) {
      setCurrentNav('dashboard');
    } else if (currentNav === 'users' && !canAccessUsers) {
      setCurrentNav('dashboard');
    }
  }, [currentNav, activeRole, canAccessSettings, canAccessAudit, canAccessUsers]);

  const { data: statsData } = useGetStatsQuery();
  const { data: lettersData, isLoading: isLettersLoading } = useGetLettersQuery({
    tab: currentNav === 'inbox' ? 'inbox' : currentNav === 'sent' ? 'sent' : currentNav === 'drafts' ? 'drafts' : currentNav === 'archived' ? 'archived' : 'all',
    search: searchQuery,
  });
  const { data: dirsData } = useGetDirectoriesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [executeAction] = useExecuteLetterActionMutation();

  const stats = statsData?.stats;
  const allLetters = lettersData?.letters || [];
  const directories = dirsData?.directories || [];
  const allStaffUsers = usersData?.users || [];

  // Filtered queues
  const awaitingEndorsement = allLetters.filter(
    (l) => l.direction === 'OUTGOING' && l.approval_stage === 'Department Head Endorsement'
  );

  const incomingMinisterial = allLetters.filter((l) => l.direction === 'INCOMING');

  const subordinateQueue = allLetters.filter(
    (l) =>
      l.direction === 'OUTGOING' &&
      l.approval_stage === 'Directory Lead Review' &&
      (currentUser?.directory_id ? l.sender_directory_id === currentUser.directory_id : true)
  );

  const leadDirectivesToDelegate = allLetters.filter(
    (l) =>
      (l.recipient_directory_id === currentUser?.directory_id || (!l.recipient_directory_id && l.direction === 'INCOMING')) &&
      !l.assigned_officer_id
  );

  const directoryOfficers = allStaffUsers.filter(
    (u) => (currentUser?.directory_id ? u.directory_id === currentUser.directory_id : true) && u.role === 'Officer'
  );

  const assignedDirectives = allLetters.filter(
    (l) => l.assigned_officer_id === currentUser?.id || (l.direction === 'INCOMING' && !l.assigned_officer_id)
  );

  const officerDrafts = allLetters.filter(
    (l) =>
      (l.created_by === currentUser?.id || l.assigned_officer_id === currentUser?.id) &&
      (l.status === 'Draft' || l.status === 'Returned for Revision')
  );

  const officerRevisions = allLetters.filter(
    (l) =>
      l.status === 'Returned for Revision' &&
      (l.created_by === currentUser?.id || l.assigned_officer_id === currentUser?.id)
  );

  const officerCompleted = allLetters.filter(
    (l) =>
      (l.created_by === currentUser?.id || l.assigned_officer_id === currentUser?.id) &&
      (l.status === 'Dispatched' || l.status === 'Completed' || l.approval_stage === 'Department Head Endorsement')
  );

  const handleQuickAction = async (id: number, action: WorkflowAction, notes?: string) => {
    try {
      await executeAction({ id, action, notes }).unwrap();
    } catch (err) {
      console.error('Quick action failed:', err);
    }
  };

  // Determine current view metadata and filtered dataset
  let viewLetters = allLetters;
  let pageTitle = 'Dashboard Overview';
  let pageSubtitle = '';

  if (currentNav === 'inbox') {
    viewLetters = allLetters.filter((l) => l.direction === 'INCOMING');
    pageTitle = 'Inbox — Incoming Directives & Correspondence';
    pageSubtitle = 'All inbound letters received from external ministries, federal organs, and regional government.';
  } else if (currentNav === 'sent') {
    viewLetters = allLetters.filter((l) => l.direction === 'OUTGOING' && l.status !== 'Draft');
    pageTitle = 'Sent & Dispatched Letters';
    pageSubtitle = 'All outgoing correspondence officially submitted, endorsed, digitally sealed, and dispatched.';
  } else if (currentNav === 'drafts') {
    viewLetters = allLetters.filter((l) => l.status === 'Draft');
    pageTitle = 'Draft Letters Workbench';
    pageSubtitle = 'Unpublished drafts in progress awaiting finalization, review, or submission.';
  } else if (currentNav === 'archived') {
    viewLetters = allLetters.filter(
      (l) => l.status === 'Dispatched' || l.status === 'Completed' || l.status === 'Archived'
    );
    pageTitle = 'Archived & Completed Records';
    pageSubtitle = 'Fully endorsed, sealed, and dispatched official records permanently preserved in departmental archives.';
  } else if (currentNav === 'endorsements') {
    viewLetters = awaitingEndorsement;
    pageTitle = 'Executive Endorsement Clearance Queue';
    pageSubtitle = 'Outgoing letters approved by Directory Leads awaiting final executive signature and cryptographic legal seal.';
  } else if (currentNav === 'clearance') {
    viewLetters = subordinateQueue;
    pageTitle = 'Supervisor Review Queue';
    pageSubtitle = 'Draft correspondence prepared by operational officers awaiting supervisory review and clearance.';
  } else if (currentNav === 'directives') {
    viewLetters = assignedDirectives;
    pageTitle = 'Assigned Directives & Tasks';
    pageSubtitle = 'Tasks and ministerial mandates assigned directly to your operational workbench.';
  } else if (currentNav === 'directory' && selectedDirId) {
    viewLetters = allLetters.filter(
      (l) => l.sender_directory_id === selectedDirId || l.recipient_directory_id === selectedDirId
    );
    const dir = directories.find((d) => d.id === selectedDirId);
    pageTitle = dir ? `${dir.name} — Directory Ledger` : 'Directory Correspondence';
    pageSubtitle = dir
      ? `All official correspondence involving the ${dir.name} (${dir.code}) directory · ${dir.amharic_name || ''}`
      : '';
  }

  const selectedDir = directories.find((d) => d.id === selectedDirId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* 1. Left Tallie Collapsible Sidebar */}
      <aside className="w-[300px] bg-[#fafafa] border-r border-slate-200 flex flex-col justify-between flex-shrink-0 z-20">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Top Header with Official Animated Crest from Loader */}
          <div className="px-4 py-2 border-b border-slate-200/70 flex items-center justify-between">
            <a
              href="/html/index.html"
              title="Return to Public Website"
              className="flex items-center group focus:outline-none"
            >
              <iframe
                src="/loader-logo.html"
                title="HZSITD Official Animated Logo"
                className="w-[134px] h-[92px] border-none bg-transparent flex-shrink-0 select-none pointer-events-none"
                style={{ overflow: 'hidden' }}
              />
            </a>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out & Return to Portal Homepage"
              aria-label="Sign Out"
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition flex items-center justify-center flex-shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Groups — Role-Specific Sidebar */}
          <div className="p-3 space-y-5">

            {/* ============================================================= */}
            {/* DEPARTMENT HEAD SIDEBAR                                       */}
            {/* ============================================================= */}
            {activeRole === 'Department Head' && (
              <>
                {/* Group: Executive Correspondence */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Executive Correspondence
                  </div>
                  <nav className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('dashboard');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'dashboard'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-63-home-in-reveal.webp"
                          alt="Home"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('inbox');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'inbox'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp"
                            alt="Inbox"
                            width={24}
                            height={24}
                            unoptimized
                          />
                        </div>
                        <span>Ministerial Inbound</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          currentNav === 'inbox'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {incomingMinisterial.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('sent');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'sent'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-177-mail-fast-in-assembly.webp"
                            alt="Sent"
                            width={24}
                            height={24}
                            unoptimized
                          />
                        </div>
                        <span>Official Outbound</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          currentNav === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {stats?.sentCount || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('archived');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'archived'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-12-layers-in-reveal.webp"
                          alt="Archived"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>Archived Records</span>
                    </button>
                  </nav>
                </div>

                {/* Group: Executive Clearance */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Executive Clearance
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('endorsements');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'endorsements'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-3235-badge-ribbon-in-reveal.webp"
                            alt="Seal"
                            width={22}
                            height={22}
                            unoptimized
                          />
                        </div>
                        <span className="whitespace-nowrap">Executive Endorsements</span>
                      </div>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                          awaitingEndorsement.length > 0
                            ? 'bg-red-100 text-red-800'
                            : currentNav === 'endorsements'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {awaitingEndorsement.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Group: Directorates (9) */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Directory Ledgers
                  </div>
                  <div className="space-y-0.5">
                    {directories.map((dir) => {
                      const isDirActive = currentNav === 'directory' && selectedDirId === dir.id;
                      return (
                        <button
                          key={dir.id}
                          type="button"
                          onClick={() => {
                            setCurrentNav('directory');
                            setSelectedDirId(dir.id);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            isDirActive
                              ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Folder
                              className={`w-4.5 h-4.5 flex-shrink-0 ${
                                isDirActive ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate">{dir.code}</span>
                          </div>
                          <span
                            className={`text-[10px] ${
                              isDirActive ? 'text-emerald-700 font-bold' : 'text-emerald-600 font-medium'
                            }`}
                          >
                            Active
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group: Governance */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Governance
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <button
                      type="button"
                      onClick={() => setCurrentNav('audit')}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                        currentNav === 'audit'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span>Audit Trail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentNav('users')}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                        currentNav === 'users'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Users className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span>Staff Directory</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ============================================================= */}
            {/* DIRECTORY LEAD SIDEBAR                                        */}
            {/* ============================================================= */}
            {activeRole === 'Directory Lead' && (
              <>
                {/* Group: Directory Operations */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Directory Operations
                  </div>
                  <nav className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('dashboard');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'dashboard'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-63-home-in-reveal.webp"
                          alt="Home"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>Operations Hub</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('directives');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'directives'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp"
                            alt="Directives"
                            width={24}
                            height={24}
                            unoptimized
                          />
                        </div>
                        <span>Assigned Directives</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          currentNav === 'directives'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {assignedDirectives.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('sent');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'sent'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-177-mail-fast-in-assembly.webp"
                            alt="Dispatched"
                            width={24}
                            height={24}
                            unoptimized
                          />
                        </div>
                        <span>Directorate Dispatch</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          currentNav === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {stats?.sentCount || 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('drafts');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'drafts'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
                          alt="Drafts"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>Active Drafts</span>
                    </button>
                  </nav>
                </div>

                {/* Group: Supervisory Review */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Supervisory Review
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('clearance');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'clearance'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-1933-hand-voting-in-reveal.webp"
                            alt="Review"
                            width={22}
                            height={22}
                            unoptimized
                          />
                        </div>
                        <span>Clearance Queue</span>
                      </div>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                          subordinateQueue.length > 0
                            ? 'bg-red-100 text-red-800'
                            : currentNav === 'clearance'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {subordinateQueue.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Group: Directory Officers */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    My Directorate
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    {currentUser?.directory_id && (() => {
                      const myDir = directories.find((d) => d.id === currentUser.directory_id);
                      if (!myDir) return null;
                      const isDirActive = currentNav === 'directory' && selectedDirId === myDir.id;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentNav('directory');
                            setSelectedDirId(myDir.id);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                            isDirActive
                              ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                              : 'hover:text-slate-900 hover:bg-slate-100/70'
                          }`}
                        >
                          <Folder className={`w-4.5 h-4.5 flex-shrink-0 ${isDirActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span>{myDir.code}</span>
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setCurrentNav('users')}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                        currentNav === 'users'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Users className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span>Directory Officers</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ============================================================= */}
            {/* OFFICER SIDEBAR                                               */}
            {/* ============================================================= */}
            {activeRole === 'Officer' && (
              <>
                {/* Group: Officer Workbench */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Officer Workbench
                  </div>
                  <nav className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('dashboard');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'dashboard'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-63-home-in-reveal.webp"
                          alt="Home"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>My Workbench</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('directives');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'directives'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                            alt="Directives"
                            width={24}
                            height={24}
                            unoptimized
                          />
                        </div>
                        <span>My Assigned Tasks</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          currentNav === 'directives'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {assignedDirectives.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('drafts');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'drafts'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
                          alt="Drafts"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>My Drafts & Revisions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('sent');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'sent'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <Image
                            src="/animated-icons/wired-outline-177-mail-fast-in-assembly.webp"
                            alt="Dispatched"
                            width={24}
                            height={24}
                            unoptimized
                          />
                        </div>
                        <span>Dispatched & Closed</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          currentNav === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {stats?.sentCount || 0}
                      </span>
                    </button>
                  </nav>
                </div>
              </>
            )}

            {/* ============================================================= */}
            {/* SYSTEM ADMIN SIDEBAR                                          */}
            {/* ============================================================= */}
            {activeRole === 'System Admin' && (
              <>
                {/* Group: System Cockpit */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    System Cockpit
                  </div>
                  <nav className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('dashboard');
                        setSelectedDirId(null);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition ${
                        currentNav === 'dashboard'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <Image
                          src="/animated-icons/wired-outline-63-home-in-reveal.webp"
                          alt="Home"
                          width={24}
                          height={24}
                          unoptimized
                        />
                      </div>
                      <span>System Overview</span>
                    </button>
                  </nav>
                </div>

                {/* Group: Administration */}
                <div>
                  <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Administration
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <button
                      type="button"
                      onClick={() => setCurrentNav('users')}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                        currentNav === 'users'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Users className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span>Staff Accounts & Roles</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentNav('audit')}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                        currentNav === 'audit'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span>Audit Trail Logs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentNav('settings')}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition ${
                        currentNav === 'settings'
                          ? 'bg-white text-slate-900 font-bold border border-slate-200/90 shadow-xs ring-1 ring-slate-900/5'
                          : 'hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Settings className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <span>Zonal Configuration</span>
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Sidebar Bottom: Dawit's Role Switcher Component */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <RoleSwitcher />
        </div>
      </aside>

      {/* 2. Main Application Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0 z-10">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <button
              type="button"
              onClick={() => {
                setCurrentNav('dashboard');
                setSelectedDirId(null);
              }}
              className="hover:text-slate-900 transition font-semibold"
            >
              Portal
            </button>
            <span>/</span>
            <span className="text-slate-900 font-bold">
              {currentNav === 'dashboard'
                ? activeRole === 'Department Head'
                  ? 'Executive Command Center'
                  : activeRole === 'Directory Lead'
                  ? 'Directory Operations Hub'
                  : activeRole === 'Officer'
                  ? 'Officer Operational Workbench'
                  : 'System Governance Cockpit'
                : pageTitle}
            </span>
          </div>

          {/* Right Topbar Actions */}
          <div className="flex items-center gap-4">
            {/* Search Input with Ctrl K */}
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search correspondence, IDs, officers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-14 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none transition"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 shadow-2xl">
                Ctrl K
              </kbd>
            </div>

            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </div>

            {/* Real-time Notifications Bell */}
            <NotificationDropdown />

            {/* New Letter Compose Button */}
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Letter</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport Body */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 py-8 bg-slate-50">
          <div className="max-w-[1720px] mx-auto space-y-10">
            {/* =============================================================
                VIEW A: THE FULL DASHBOARD OVERVIEW (Executive Command Center)
                ============================================================= */}
            {currentNav === 'dashboard' && (
              <>
                {/* 1. Executive Hero Header (with Instrument Serif Typography) */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
                  <div>
                    <h1 className="font-serif-executive text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
                      {activeRole === 'Department Head'
                        ? 'Executive Command Center'
                        : activeRole === 'Directory Lead'
                        ? 'Directory Operations Hub'
                        : activeRole === 'Officer'
                        ? 'Officer Operational Workbench'
                        : 'System Governance Cockpit'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeRole === 'Department Head'
                        ? `${currentUser?.full_name} · Head of Department`
                        : activeRole === 'Directory Lead'
                        ? `${currentUser?.full_name} — Director, ${
                            currentUser?.directory_name || 'Technology Directory'
                          }`
                        : activeRole === 'Officer'
                        ? `${currentUser?.full_name} — ${currentUser?.position_title}`
                        : `${currentUser?.full_name} — System Administrator`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsComposeOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {activeRole === 'Department Head'
                          ? 'Issue Executive Directive'
                          : activeRole === 'Directory Lead'
                          ? 'Draft Directory Letter'
                          : 'New Draft'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Four Metrics Cards Grid (Role-Adaptive) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {activeRole === 'Department Head' && (
                    <>
                      <MetricCard
                        title="Awaiting Endorsement"
                        value={awaitingEndorsement.length}
                        iconSrc="/animated-icons/wired-outline-3235-badge-ribbon-in-reveal.webp"
                        trendText={awaitingEndorsement.length > 0 ? 'Official Action Required' : 'Queue Clear'}
                        trendType={awaitingEndorsement.length > 0 ? 'alert' : 'up'}
                      />
                      <MetricCard
                        title="Ministerial Inbound"
                        value={incomingMinisterial.length}
                        iconSrc="/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp"
                        trendText="Federal Directives"
                        trendType="live"
                      />
                      <MetricCard
                        title="Zonal Correspondence"
                        value={stats?.totalLetters || allLetters.length}
                        iconSrc="/animated-icons/wired-outline-12-layers-in-reveal.webp"
                        trendText="Across 9 Active Directorates"
                        trendType="up"
                      />
                      <MetricCard
                        title="High-Priority Flagged"
                        value={stats?.urgentLetters || 0}
                        iconSrc="/animated-icons/wired-outline-1459-signboard-retro-in-reveal.webp"
                        trendText="Time-Sensitive Mandates"
                        trendType="alert"
                      />
                    </>
                  )}

                  {activeRole === 'Directory Lead' && (
                    <>
                      <MetricCard
                        title="Subordinate Review Queue"
                        value={subordinateQueue.length}
                        iconSrc="/animated-icons/wired-outline-1933-hand-voting-in-reveal.webp"
                        trendText={subordinateQueue.length > 0 ? 'Officer Drafts Awaiting Review' : 'Queue Clear'}
                        trendType={subordinateQueue.length > 0 ? 'alert' : 'up'}
                      />
                      <MetricCard
                        title="Directives to Delegate"
                        value={leadDirectivesToDelegate.length}
                        iconSrc="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                        trendText="Executive Directives"
                        trendType="live"
                      />
                      <MetricCard
                        title="Directory Records"
                        value={
                          allLetters.filter(
                            (l) =>
                              l.sender_directory_id === currentUser?.directory_id ||
                              l.recipient_directory_id === currentUser?.directory_id
                          ).length
                        }
                        iconSrc="/animated-icons/wired-outline-12-layers-in-reveal.webp"
                        trendText={currentUser?.directory_name || 'Active Directory'}
                        trendType="up"
                      />
                      <MetricCard
                        title="Operational Officers"
                        value={directoryOfficers.length || 1}
                        iconSrc="/animated-icons/wired-outline-63-home-in-reveal.webp"
                        trendText="Ready for Assignment"
                        trendType="up"
                      />
                    </>
                  )}

                  {activeRole === 'Officer' && (
                    <>
                      <MetricCard
                        title="Assigned Directives"
                        value={assignedDirectives.length}
                        iconSrc="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                        trendText={assignedDirectives.length > 0 ? 'Action Tasks Assigned' : 'No Pending Directives'}
                        trendType={assignedDirectives.length > 0 ? 'alert' : 'up'}
                      />
                      <MetricCard
                        title="Drafts in Progress"
                        value={officerDrafts.length}
                        iconSrc="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
                        trendText="Active Preparations"
                        trendType="live"
                      />
                      <MetricCard
                        title="Returned for Revision"
                        value={officerRevisions.length}
                        iconSrc="/animated-icons/wired-outline-1459-signboard-retro-in-reveal.webp"
                        trendText={officerRevisions.length > 0 ? 'Supervisor Notes to Address' : 'Zero Revision Requests'}
                        trendType={officerRevisions.length > 0 ? 'alert' : 'up'}
                      />
                      <MetricCard
                        title="Dispatched &amp; Cleared"
                        value={officerCompleted.length}
                        iconSrc="/animated-icons/wired-outline-37-check-in-reveal.webp"
                        trendText="Official Department Records"
                        trendType="up"
                      />
                    </>
                  )}

                  {activeRole === 'System Admin' && (
                    <>
                      <MetricCard
                        title="Registered Personnel"
                        value={allStaffUsers.length}
                        iconSrc="/animated-icons/wired-outline-63-home-in-reveal.webp"
                        trendText="Active User Accounts"
                        trendType="up"
                      />
                      <MetricCard
                        title="Technological Directorates"
                        value={directories.length}
                        iconSrc="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                        trendText="All 9 Online"
                        trendType="up"
                      />
                      <MetricCard
                        title="Cryptographic Records"
                        value={allLetters.length}
                        iconSrc="/animated-icons/wired-outline-3235-badge-ribbon-in-reveal.webp"
                        trendText="SHA-256 Verified"
                        trendType="live"
                      />
                      <MetricCard
                        title="Audit Events Logged"
                        value={allLetters.length * 3 + 12}
                        iconSrc="/animated-icons/wired-outline-12-layers-in-reveal.webp"
                        trendText="Immutable Trail"
                        trendType="up"
                      />
                    </>
                  )}
                </div>

                {/* =============================================================
                    ROLE 1 DECKS: DEPARTMENT HEAD (Dr. Bezabih Alemu - Level 3)
                    ============================================================= */}
                {activeRole === 'Department Head' && (
                  <>
                    {/* Deck 1: Executive Endorsement & Legal Seal Deck */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-3235-badge-ribbon-in-reveal.webp"
                              alt="Seal"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              Executive Endorsement &amp; Legal Seal Deck
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              {awaitingEndorsement.length} Pending Approval
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Outgoing letters approved by Directory Leads awaiting final executive digital signature, legal seal, and cryptographic dispatch.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {awaitingEndorsement.length === 0 ? (
                          <div className="p-12 text-center space-y-2">
                            <Image
                              src="/animated-icons/wired-outline-37-check-in-reveal.webp"
                              alt="Endorsed"
                              width={48}
                              height={48}
                              className="mx-auto"
                              unoptimized
                            />
                            <h4 className="text-sm font-bold text-slate-900">All Submissions Fully Endorsed</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              No letters currently require executive clearance. Dispatched correspondence is safely archived in the departmental records.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                  <th className="px-6 min-w-[190px] whitespace-nowrap">Status</th>
                                  <th className="px-6 min-w-[160px] whitespace-nowrap">Reference ID</th>
                                  <th className="px-6 min-w-[180px] whitespace-nowrap">Drafting Officer</th>
                                  <th className="px-6 min-w-[280px] whitespace-nowrap">Subject &amp; Summary</th>
                                  <th className="px-6 min-w-[100px] whitespace-nowrap">Priority</th>
                                  <th className="px-6 text-right min-w-[160px] whitespace-nowrap">Executive Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {awaitingEndorsement.map((l) => (
                                  <tr
                                    key={l.id}
                                    onClick={() => setSelectedLetterId(l.id)}
                                    className="h-16 hover:bg-slate-50 cursor-pointer transition"
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <StatusPill status={l.status} />
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-900">
                                      {l.reference_no}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="font-semibold text-slate-900">{l.sender_name}</div>
                                      <div className="text-[10px] text-slate-400">{l.sender_dir_name || 'HZSITD'}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <LetterSubjectCell
                                        letter={l}
                                        onOpenPdf={(id) => {
                                          setFullDocTab('pdf');
                                          setFullDocLetterId(id);
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-3">
                                      <PriorityBadge priority={l.priority} />
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setFullDocLetterId(l.id)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                        >
                                          Inspect
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAction(
                                              l.id,
                                              'return_for_revision',
                                              'Returned for revisions by Department Head.'
                                            )
                                          }
                                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition border border-red-200"
                                        >
                                          Return
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAction(
                                              l.id,
                                              'endorse_and_sign',
                                              'Officially signed and cryptographically sealed by Dr. Bezabih Alemu.'
                                            )
                                          }
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                          <span>Endorse &amp; Sign</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Deck 2: Ministerial Inbound Triage Deck */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp"
                              alt="Inbound"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              Federal &amp; Regional Ministerial Inbound Directives
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {incomingMinisterial.length} Inbound
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Correspondence arriving from federal ministries and regional bureaus. Minute and assign to Directory Leads with one click without rewriting.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {incomingMinisterial.length === 0 ? (
                          <div className="p-12 text-center space-y-2">
                            <Image
                              src="/animated-icons/wired-outline-3090-mail-open-document-in-reveal.webp"
                              alt="Empty"
                              width={48}
                              height={48}
                              className="mx-auto"
                              unoptimized
                            />
                            <h4 className="text-sm font-bold text-slate-900">No Pending Ministerial Inbound Directives</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              All ministerial correspondence has been routed and assigned to departmental directorates.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                  <th className="px-6 min-w-[190px] whitespace-nowrap">Status</th>
                                  <th className="px-6 min-w-[160px] whitespace-nowrap">Tracking Ref</th>
                                  <th className="px-6 min-w-[200px] whitespace-nowrap">Sending Entity</th>
                                  <th className="px-6 min-w-[280px] whitespace-nowrap">Subject &amp; Directives</th>
                                  <th className="px-6 min-w-[100px] whitespace-nowrap">Priority</th>
                                  <th className="px-6 text-right min-w-[160px] whitespace-nowrap">Executive Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {incomingMinisterial.map((l) => (
                                  <tr
                                    key={l.id}
                                    onClick={() => setSelectedLetterId(l.id)}
                                    className="h-16 hover:bg-slate-50 cursor-pointer transition"
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <StatusPill status={l.status} />
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-900">
                                      {l.reference_no}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="font-semibold text-slate-900">
                                        {l.external_sender_org || 'Federal Ministry'}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {l.external_sender_name || 'Official Sender'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 max-w-sm">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-slate-900 truncate" title={l.subject}>
                                          {l.subject}
                                        </span>
                                        {Boolean(l.has_pdf) && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setFullDocTab('pdf');
                                              setFullDocLetterId(l.id);
                                            }}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition flex-shrink-0"
                                            title="Open Scanned PDF Original"
                                          >
                                            <FileText className="w-2.5 h-2.5" />
                                            PDF
                                          </button>
                                        )}
                                        {Boolean(l.attachment_count && Number(l.attachment_count) > 0) && (
                                          <span
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 flex-shrink-0"
                                            title={`${l.attachment_count} attachment(s)`}
                                          >
                                            <Paperclip className="w-2.5 h-2.5" />
                                            {l.attachment_count}
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                          l.recipient_dir_name
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {l.recipient_dir_name
                                          ? `Assigned: ${l.recipient_dir_name}`
                                          : 'Pending Directorate Assignment'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3">
                                      <PriorityBadge priority={l.priority} />
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setFullDocLetterId(l.id)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAssignModalLetter(l);
                                            setAssignModalMode('assign_directory');
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 transition shadow-sm"
                                        >
                                          <Share2 className="w-3.5 h-3.5" />
                                          <span>Minute &amp; Assign</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Deck 3: 9-Directory Operations Radar */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                              alt="Radar"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              HZSITD 9-Directory Infrastructure &amp; Operations Radar
                            </h2>
                          </div>
                          <p className="text-xs text-slate-500">
                            Real-time readiness status across all 9 specialized zonal technological directorates.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {directories.map((d) => (
                          <div
                            key={d.id}
                            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Folder className="w-5 h-5 text-slate-500" />
                                  <span className="font-mono font-bold text-xs text-slate-900">{d.code}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              </div>
                              <h3 className="font-bold text-sm text-slate-900 leading-snug">{d.name}</h3>
                              <p className="text-xs text-slate-400 mt-1">{d.amharic_name || ''}</p>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-medium">Infrastructure Online</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentNav('directory');
                                  setSelectedDirId(d.id);
                                }}
                                className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition"
                              >
                                <span>Open Directory</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Deck 4: Department-Wide Ledger */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Department Official Correspondence Ledger</h2>
                          <p className="text-xs text-slate-500">
                            Comprehensive ledger across all directorates with audit timelines and cryptographic signatures.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
                            {allLetters.length} Records
                          </span>
                        </div>
                      </div>

                      <LetterTable
                        letters={allLetters}
                        isLoading={isLettersLoading}
                        onSelectLetter={(id) => setSelectedLetterId(id)}
                      />
                    </section>
                  </>
                )}

                {/* =============================================================
                    ROLE 2 DECKS: DIRECTORY LEAD (Eng. Yohannes Haile - Level 2)
                    ============================================================= */}
                {activeRole === 'Directory Lead' && (
                  <>
                    {/* Deck 1: Subordinate Officer Review Queue */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-1933-hand-voting-in-reveal.webp"
                              alt="Review"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              Subordinate Officer Review &amp; Quality Clearance Queue
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {subordinateQueue.length} Awaiting Supervisory Review
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Draft correspondence prepared by operational officers within your directorate. Review, request revisions, or clear and advance to the Department Head.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {subordinateQueue.length === 0 ? (
                          <div className="p-12 text-center space-y-2">
                            <Image
                              src="/animated-icons/wired-outline-37-check-in-reveal.webp"
                              alt="Clear"
                              width={48}
                              height={48}
                              className="mx-auto"
                              unoptimized
                            />
                            <h4 className="text-sm font-bold text-slate-900">Supervisory Review Queue Clear</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              No officer drafts currently require your review. All prepared submissions have been advanced to executive endorsement.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                  <th className="px-6 min-w-[190px] whitespace-nowrap">Status</th>
                                  <th className="px-6 min-w-[160px] whitespace-nowrap">Reference ID</th>
                                  <th className="px-6 min-w-[180px] whitespace-nowrap">Drafting Officer</th>
                                  <th className="px-6 min-w-[280px] whitespace-nowrap">Subject &amp; Body</th>
                                  <th className="px-6 min-w-[100px] whitespace-nowrap">Priority</th>
                                  <th className="px-6 text-right min-w-[180px] whitespace-nowrap">Supervisory Clearance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {subordinateQueue.map((l) => (
                                  <tr
                                    key={l.id}
                                    onClick={() => setSelectedLetterId(l.id)}
                                    className="h-16 hover:bg-slate-50 cursor-pointer transition"
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <StatusPill status={l.status} />
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-900">
                                      {l.reference_no}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="font-semibold text-slate-900">{l.sender_name}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {l.sender_title || 'Operational Officer'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <LetterSubjectCell
                                        letter={l}
                                        onOpenPdf={(id) => {
                                          setFullDocTab('pdf');
                                          setFullDocLetterId(id);
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-3">
                                      <PriorityBadge priority={l.priority} />
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setFullDocLetterId(l.id)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                        >
                                          Inspect
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAction(
                                              l.id,
                                              'return_for_revision',
                                              'Returned by Directory Lead with feedback notes.'
                                            )
                                          }
                                          className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition border border-red-200"
                                        >
                                          Return
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAction(
                                              l.id,
                                              'approve_to_head',
                                              'Reviewed and cleared by Directory Lead Eng. Yohannes Haile. Forwarded to Head for executive endorsement.'
                                            )
                                          }
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Clear &amp; Advance</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Deck 2: Inbound Directives to Delegate */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                              alt="Delegate"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              Inbound Directives from Executive Office to Delegate
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {leadDirectivesToDelegate.length} Directives
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Ministerial correspondence routed to your directory. With one click, delegate directly to an officer with operational instructions without rewriting.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {leadDirectivesToDelegate.length === 0 ? (
                          <div className="p-12 text-center space-y-2">
                            <Image
                              src="/animated-icons/wired-outline-37-check-in-reveal.webp"
                              alt="All delegated"
                              width={48}
                              height={48}
                              className="mx-auto"
                              unoptimized
                            />
                            <h4 className="text-sm font-bold text-slate-900">All Inbound Directives Delegated</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              Every assigned letter has been delegated to an operational officer for technical execution.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                  <th className="px-6 min-w-[190px] whitespace-nowrap">Status</th>
                                  <th className="px-6 min-w-[160px] whitespace-nowrap">Tracking Ref</th>
                                  <th className="px-6 min-w-[200px] whitespace-nowrap">Originating Authority</th>
                                  <th className="px-6 min-w-[280px] whitespace-nowrap">Mandate &amp; Subject</th>
                                  <th className="px-6 min-w-[100px] whitespace-nowrap">Priority</th>
                                  <th className="px-6 text-right min-w-[160px] whitespace-nowrap">Delegation Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {leadDirectivesToDelegate.map((l) => (
                                  <tr
                                    key={l.id}
                                    onClick={() => setSelectedLetterId(l.id)}
                                    className="h-16 hover:bg-slate-50 cursor-pointer transition"
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <StatusPill status={l.status} />
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-900">
                                      {l.reference_no}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="font-semibold text-slate-900">
                                        {l.external_sender_org || 'Executive Office'}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {l.external_sender_name || 'Official Sender'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <LetterSubjectCell
                                        letter={l}
                                        onOpenPdf={(id) => {
                                          setFullDocTab('pdf');
                                          setFullDocLetterId(id);
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-3">
                                      <PriorityBadge priority={l.priority} />
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setFullDocLetterId(l.id)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAssignModalLetter(l);
                                            setAssignModalMode('delegate_officer');
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
                                        >
                                          <UserCheck className="w-3.5 h-3.5" />
                                          <span>Delegate to Officer</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Deck 3: Directorate Staff & Officer Roster */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-700" />
                            <h2 className="text-base font-bold text-slate-900">
                              Directorate Operational Officers &amp; Staff Roster
                            </h2>
                          </div>
                          <p className="text-xs text-slate-500">
                            Operational staff assigned to {currentUser?.directory_name || 'this Directorate'}.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {directoryOfficers.map((officer) => (
                          <div
                            key={officer.id}
                            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition"
                          >
                            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
                              {officer.full_name.charAt(0)}
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-slate-900">{officer.full_name}</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Operational
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{officer.position_title}</p>
                              <p className="text-[11px] font-mono text-slate-400">{officer.email}</p>
                              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Active Tasks:</span>
                                <span className="font-bold text-slate-800">
                                  {allLetters.filter((l) => l.assigned_officer_id === officer.id).length}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Deck 4: Directorate Correspondence Ledger */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Directory Correspondence Ledger</h2>
                          <p className="text-xs text-slate-500">
                            Letters originating from or assigned to {currentUser?.directory_name || 'this Directorate'}.
                          </p>
                        </div>
                      </div>

                      <LetterTable
                        letters={allLetters.filter(
                          (l) =>
                            l.sender_directory_id === currentUser?.directory_id ||
                            l.recipient_directory_id === currentUser?.directory_id
                        )}
                        isLoading={isLettersLoading}
                        onSelectLetter={(id) => setSelectedLetterId(id)}
                      />
                    </section>
                  </>
                )}

                {/* =============================================================
                    ROLE 3 DECKS: OFFICER (Almaz Tesfaye - Level 1)
                    ============================================================= */}
                {activeRole === 'Officer' && (
                  <>
                    {/* Deck 1: My Assigned Directives & Action Tasks */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-120-folder-in-reveal.webp"
                              alt="Directives"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              My Assigned Directives &amp; Action Tasks
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {assignedDirectives.length} Mandates
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Directives assigned to your operational workbench by Directorate Leads and Executive Office. Click &ldquo;Draft Official Response&rdquo; to begin a response without retyping.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {assignedDirectives.length === 0 ? (
                          <div className="p-12 text-center space-y-2">
                            <Image
                              src="/animated-icons/wired-outline-37-check-in-reveal.webp"
                              alt="Empty"
                              width={48}
                              height={48}
                              className="mx-auto"
                              unoptimized
                            />
                            <h4 className="text-sm font-bold text-slate-900">No Pending Directives Assigned</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              You have no pending directives assigned to your workbench. You can draft new correspondence using the &ldquo;New Letter&rdquo; button.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                  <th className="px-6 min-w-[190px] whitespace-nowrap">Status</th>
                                  <th className="px-6 min-w-[160px] whitespace-nowrap">Reference ID</th>
                                  <th className="px-6 min-w-[200px] whitespace-nowrap">Mandate Origin</th>
                                  <th className="px-6 min-w-[280px] whitespace-nowrap">Subject &amp; Executive Minute</th>
                                  <th className="px-6 min-w-[100px] whitespace-nowrap">Priority</th>
                                  <th className="px-6 text-right min-w-[160px] whitespace-nowrap">Operational Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {assignedDirectives.map((l) => (
                                  <tr
                                    key={l.id}
                                    onClick={() => setSelectedLetterId(l.id)}
                                    className="h-16 hover:bg-slate-50 cursor-pointer transition"
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <StatusPill status={l.status} />
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-900">
                                      {l.reference_no}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="font-semibold text-slate-900">
                                        {l.external_sender_org || 'Department Head'}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {l.external_sender_name || 'Executive Directive'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <LetterSubjectCell
                                        letter={l}
                                        onOpenPdf={(id) => {
                                          setFullDocTab('pdf');
                                          setFullDocLetterId(id);
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-3">
                                      <PriorityBadge priority={l.priority} />
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setFullDocLetterId(l.id)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                        >
                                          View
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setComposeInitialSubject(`RE: ${l.subject} [${l.reference_no}]`);
                                            setIsComposeOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs"
                                        >
                                          <FileEdit className="w-3.5 h-3.5 text-white" />
                                          <span>Draft Response</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Deck 2: Drafts Workbench & Supervisor Revision Queue */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Image
                              src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
                              alt="Drafts"
                              width={22}
                              height={22}
                              unoptimized
                            />
                            <h2 className="text-base font-bold text-slate-900">
                              Drafts Workbench &amp; Supervisory Revisions
                            </h2>
                            {officerRevisions.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                {officerRevisions.length} Returned for Corrections
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Letters you are currently drafting. Letters returned by your supervisor display feedback notes so you can refine and resubmit.
                          </p>
                        </div>
                      </div>

                      {/* Warning Callout if revisions exist */}
                      {officerRevisions.length > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-semibold shadow-sm">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Supervisory Feedback Required:</span> Eng. Yohannes Haile returned draft letters with revision notes. Click &ldquo;Inspect&rdquo; to review notes and resubmit for clearance.
                          </div>
                        </div>
                      )}

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {officerDrafts.length === 0 ? (
                          <div className="p-12 text-center space-y-2">
                            <Image
                              src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
                              alt="Empty"
                              width={48}
                              height={48}
                              className="mx-auto"
                              unoptimized
                            />
                            <h4 className="text-sm font-bold text-slate-900">No Drafts in Progress</h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                              Start composing a new draft letter or respond to an assigned directive above.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 h-12 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                  <th className="px-6 min-w-[190px] whitespace-nowrap">Status</th>
                                  <th className="px-6 min-w-[160px] whitespace-nowrap">Reference ID</th>
                                  <th className="px-6 min-w-[200px] whitespace-nowrap">Target Directory</th>
                                  <th className="px-6 min-w-[280px] whitespace-nowrap">Subject &amp; Body</th>
                                  <th className="px-6 min-w-[100px] whitespace-nowrap">Priority</th>
                                  <th className="px-6 text-right min-w-[160px] whitespace-nowrap">Workbench Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {officerDrafts.map((l) => (
                                  <tr
                                    key={l.id}
                                    onClick={() => setSelectedLetterId(l.id)}
                                    className={`h-16 hover:bg-slate-50 cursor-pointer transition ${
                                      l.status === 'Returned for Revision' ? 'bg-amber-50/40' : ''
                                    }`}
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap">
                                      <StatusPill status={l.status} />
                                    </td>
                                    <td className="px-6 py-3 font-mono font-bold text-slate-900">
                                      {l.reference_no}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div className="font-semibold text-slate-900">
                                        {l.recipient_dir_name || 'HZSITD Directory'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3">
                                      <LetterSubjectCell
                                        letter={l}
                                        onOpenPdf={(id) => {
                                          setFullDocTab('pdf');
                                          setFullDocLetterId(id);
                                        }}
                                      />
                                    </td>
                                    <td className="px-6 py-3">
                                      <PriorityBadge priority={l.priority} />
                                    </td>
                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setFullDocLetterId(l.id)}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 transition"
                                        >
                                          Inspect
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleQuickAction(
                                              l.id,
                                              'submit_to_lead',
                                              'Draft finalized by Almaz Tesfaye and submitted for supervisory clearance.'
                                            )
                                          }
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs"
                                        >
                                          <Send className="w-3.5 h-3.5 text-white" />
                                          <span>Submit for Clearance</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Deck 3: My Completed Submissions */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">My Endorsed &amp; Dispatched Records</h2>
                          <p className="text-xs text-slate-500">
                            Correspondence you authored that has advanced through supervisory review to executive endorsement.
                          </p>
                        </div>
                      </div>

                      <LetterTable
                        letters={officerCompleted}
                        isLoading={isLettersLoading}
                        onSelectLetter={(id) => setSelectedLetterId(id)}
                      />
                    </section>
                  </>
                )}

                {/* =============================================================
                    ROLE 4 DECKS: SYSTEM ADMIN (Solomon Bekele - Level 4)
                    ============================================================= */}
                {activeRole === 'System Admin' && (
                  <>
                    {/* Deck 1: Staff Directory & Access Control */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-700" />
                            <h2 className="text-base font-bold text-slate-900">
                              Staff Accounts &amp; Cryptographic Clearance Roles
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                              {allStaffUsers.length} Officers
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Registered personnel, cryptographic signing rights, and zonal directorate assignments.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allStaffUsers.map((user) => (
                          <div
                            key={user.id}
                            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition"
                          >
                            <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                              {user.full_name.charAt(0)}
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-slate-900">{user.full_name}</h4>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    user.role === 'Department Head'
                                      ? 'bg-red-100 text-red-800'
                                      : user.role === 'Directory Lead'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {user.role}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{user.position_title}</p>
                              <p className="text-[11px] font-mono text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Deck 2: Cryptographic Audit Stream */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Real-Time Cryptographic Audit Stream</h2>
                          <p className="text-xs text-slate-500">
                            Immutable log of all document approvals, signature events, and digital legal seals.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="space-y-3">
                          {allLetters.slice(0, 8).map((l, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                            >
                              <div className="flex items-center gap-3">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <div>
                                  <span className="font-mono font-bold text-xs text-slate-900">
                                    {l.reference_no}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-2">{l.subject}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="font-bold text-slate-700">{l.approval_stage}</span>
                                <span>·</span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  SHA256: {l.id}f89...2e
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                    {/* Deck 3: Department Cryptographic Parameters */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">System Cryptographic Parameters</h2>
                          <p className="text-xs text-slate-500">
                            Public key infrastructure, legal sealing configuration, and document numbering sequences.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Hashing Standard</span>
                          <p className="font-bold text-slate-900">SHA-256 Public Verification</p>
                          <p className="text-[11px] text-slate-500">FIPS 180-4 Government Compliant</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Reference Template</span>
                          <p className="font-mono font-bold text-slate-900">HZSITD/OUT/{'{YEAR}'}/{'{SEQ}'}</p>
                          <p className="text-[11px] text-slate-500">Auto-incrementing zonal sequence</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Socket Health</span>
                          <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Real-Time Invalidation Nominal</span>
                          </p>
                          <p className="text-[11px] text-slate-500">Port 8000 Event Pipeline</p>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </>
            )}

            {/* =============================================================
                VIEW B: DEDICATED SUB-PAGE (Inbox, Sent, Drafts, Archives,
                Endorsements, Supervisor Clearance, Directives, or Directory)
                ============================================================= */}
            {currentNav !== 'dashboard' && currentNav !== 'users' && currentNav !== 'audit' && currentNav !== 'settings' && (
              <div className="space-y-6">
                {/* Sub-page Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white p-6 rounded-2xl border shadow-sm">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentNav('dashboard');
                        setSelectedDirId(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard Overview</span>
                    </button>
                    <h1 className="font-serif-executive text-2xl sm:text-3xl font-normal text-slate-900 tracking-tight">
                      {pageTitle}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">{pageSubtitle}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                      {viewLetters.length} {viewLetters.length === 1 ? 'Record' : 'Records'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsComposeOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Compose Letter</span>
                    </button>
                  </div>
                </div>

                {/* Sub-page Letter Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-2">
                  <LetterTable
                    letters={viewLetters}
                    isLoading={isLettersLoading}
                    onSelectLetter={(id) => setSelectedLetterId(id)}
                  />
                </div>
              </div>
            )}

            {/* =============================================================
                VIEW C: STAFF ACCOUNTS & ROLES (System Governance)
                ============================================================= */}
            {currentNav === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 bg-white p-6 rounded-2xl border shadow-sm">
                  <div>
                    <button
                      type="button"
                      onClick={() => setCurrentNav('dashboard')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard Overview</span>
                    </button>
                    <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900">
                      Staff Accounts &amp; Cryptographic Roles
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Personnel directory with role-based clearance permissions across HZSITD.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                    {allStaffUsers.length} Officers Registered
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allStaffUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-4 hover:border-slate-300 transition"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                        {user.full_name.charAt(0)}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900">{user.full_name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.role === 'Department Head'
                                ? 'bg-red-100 text-red-800'
                                : user.role === 'Directory Lead'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{user.position_title}</p>
                        <p className="text-[11px] font-mono text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =============================================================
                VIEW D: AUDIT TRAIL LOGS (System Governance)
                ============================================================= */}
            {currentNav === 'audit' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 bg-white p-6 rounded-2xl border shadow-sm">
                  <div>
                    <button
                      type="button"
                      onClick={() => setCurrentNav('dashboard')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard Overview</span>
                    </button>
                    <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900">
                      System-Wide Cryptographic Audit Trail
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Immutable record of all digital signatures, stage transitions, and minute entries.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="space-y-4">
                    {allLetters.slice(0, 15).map((l, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 font-mono">
                              {l.reference_no} — {l.subject}
                            </span>
                            <span className="text-[10px] text-slate-400">{l.created_at}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span>Stage: <strong className="text-slate-800">{l.approval_stage}</strong></span>
                            <span>·</span>
                            <span>Status: <strong className="text-emerald-700">{l.status}</strong></span>
                            <span>·</span>
                            <span>Officer: {l.sender_name || 'Staff'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================
                VIEW E: SYSTEM SETTINGS (System Governance)
                ============================================================= */}
            {currentNav === 'settings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 bg-white p-6 rounded-2xl border shadow-sm">
                  <div>
                    <button
                      type="button"
                      onClick={() => setCurrentNav('dashboard')}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard Overview</span>
                    </button>
                    <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900">
                      System Governance &amp; Configuration
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Zonal parameters, cryptographic key rotation, and document numbering sequences.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 max-w-3xl">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Department Name (English)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Hadiya Zone Science & Information Technology Department"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Department Name (Amharic)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="በኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ የሀዲያ ዞን አስተዳደር"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Document Reference Numbering Prefix
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="HZSITD/{DIRECTION}/{YEAR}/{SEQUENCE}"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Cryptographic Hashing Algorithm
                      </label>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>SHA-256 Public Verification Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Slide-out Details Sheet (with "Full Document View" and "Minute & Dispatch Down" buttons) */}
      <LetterDetailsSheet
        letterId={selectedLetterId}
        onClose={() => setSelectedLetterId(null)}
        onOpenFullDocument={(id, tab = 'document') => {
          setFullDocTab(tab);
          setFullDocLetterId(id);
        }}
        onMinuteAndAssign={(letter) => {
          setAssignModalLetter(letter);
          setAssignModalMode(activeRole === 'Directory Lead' ? 'delegate_officer' : 'assign_directory');
        }}
      />

      {/* The Official Government Letterhead Full Document Modal */}
      <FullDocumentModal
        letterId={fullDocLetterId}
        isOpen={fullDocLetterId !== null}
        initialTab={fullDocTab}
        onClose={() => setFullDocLetterId(null)}
      />

      {/* New Letter Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        initialSubject={composeInitialSubject}
        onClose={() => {
          setIsComposeOpen(false);
          setComposeInitialSubject('');
        }}
      />

      {/* One-Click Minute & Assign / Delegate Modal */}
      <AssignMinuteModal
        letter={assignModalLetter}
        isOpen={assignModalLetter !== null}
        mode={assignModalMode}
        directories={directories}
        officers={allStaffUsers.filter((u) => u.role === 'Officer')}
        onClose={() => setAssignModalLetter(null)}
      />
    </div>
  );
};
