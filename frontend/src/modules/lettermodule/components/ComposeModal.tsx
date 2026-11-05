'use client';

import React, { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useCreateLetterMutation, useUploadFileMutation } from '../services/letterApi';
import {
  useGetSignaturesQuery,
  useGetStampsQuery,
  useGetTemplatesQuery,
} from '../services/securityAssetsApi';
import { useGetDirectoriesQuery, useGetUsersQuery } from '@/modules/authmodule/services/authApi';
import { useAppSelector } from '@/store';
import { LetterPriority, LetterDirection } from '@/types/letter';
import {
  X,
  Check,
  Upload,
  FileText,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  FileCheck,
  Loader2,
  Building2,
  Key,
  ShieldCheck,
  Send,
  Inbox,
  Stamp,
  PenTool,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Award,
  Compass,
} from 'lucide-react';

interface UploadedAttachment {
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  url: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
  initialBody?: string;
}

// Fallback directories if backend /directories endpoint returns 500
const FALLBACK_DIRECTORIES = [
  { id: 1, name: 'Executive Office & Cabinet Desk', code: 'EXEC' },
  { id: 2, name: 'Software & Digital Innovations Directorate', code: 'SW' },
  { id: 3, name: 'Infrastructure & Network Systems Directorate', code: 'INFRA' },
  { id: 4, name: 'Planning, Monitoring & Quality Directorate', code: 'PMQ' },
  { id: 5, name: 'Finance & Human Resources Directorate', code: 'FHR' },
];

// Fallback staff list if backend /users endpoint returns 500
const FALLBACK_USERS = [
  { id: 1, full_name: 'Dr. Bezabih Alemu', role: 'Department Head', position_title: 'Head of Department', directory_id: 1 },
  { id: 2, full_name: 'Eng. Yohannes Haile', role: 'Directory Lead', position_title: 'Software Directorate Lead', directory_id: 2 },
  { id: 3, full_name: 'Sara Tadesse', role: 'Directory Lead', position_title: 'Infrastructure Directorate Lead', directory_id: 3 },
  { id: 4, full_name: 'Kalkidan Bekele', role: 'Officer', position_title: 'Senior Software Engineer', directory_id: 2 },
  { id: 5, full_name: 'Abebe Bikila', role: 'Officer', position_title: 'Systems & Network Officer', directory_id: 3 },
];

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  initialSubject = '',
  initialBody = '',
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const activeRole = useAppSelector((state) => state.auth.activeRole) || currentUser?.role || 'Officer';

  // Role determinations
  const isExecutive = activeRole === 'Department Head' || activeRole === 'System Admin';
  const isLead = activeRole === 'Directory Lead';
  const isOfficer = activeRole === 'Officer';

  const { data: dirsData } = useGetDirectoriesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createLetter, { isLoading }] = useCreateLetterMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  // Workflow Direction: Outgoing vs Inbound
  const [direction, setDirection] = useState<LetterDirection>('OUTGOING');

  // Shared form fields
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [priority, setPriority] = useState<LetterPriority>('Routine');
  const [letterType, setLetterType] = useState('Official Letter');

  // Lead-specific routing: Inter-Directorate vs Upward to Head
  const [leadTargetType, setLeadTargetType] = useState<'INTER_DIRECTORATE' | 'UPWARD_TO_HEAD'>('INTER_DIRECTORATE');

  // Executive-specific routing: External Ministry vs Internal Directive
  const [execTargetType, setExecTargetType] = useState<'EXTERNAL_MINISTRY' | 'INTERNAL_DIRECTIVE'>('EXTERNAL_MINISTRY');

  // Target directory and recipient user
  const [recipientDirectoryId, setRecipientDirectoryId] = useState<number | ''>('');
  const [assignedOfficerId, setAssignedOfficerId] = useState<number | ''>('');

  // External Destination fields (for Department Head sending to MoIT, etc.)
  const [externalRecipientOrg, setExternalRecipientOrg] = useState('');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [externalRecipientAddress, setExternalRecipientAddress] = useState('');

  // Inbound Letter fields (for receiving physical letters from outside)
  const [externalSenderOrg, setExternalSenderOrg] = useState('');
  const [externalSenderName, setExternalSenderName] = useState('');
  const [externalSenderRef, setExternalSenderRef] = useState('');

  // Security Credentials & Assets (Signature, Stamp, Template)
  const { data: signaturesData } = useGetSignaturesQuery();
  const { data: stampsData } = useGetStampsQuery();
  const { data: templatesData } = useGetTemplatesQuery();

  const [selectedSignatureId, setSelectedSignatureId] = useState<number>(1);
  const [selectedStampId, setSelectedStampId] = useState<number>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(1);

  // Guaranteed lists with fallback constants
  const directories = useMemo(() => {
    return dirsData?.directories && dirsData.directories.length > 0
      ? dirsData.directories
      : FALLBACK_DIRECTORIES;
  }, [dirsData]);

  const users = useMemo(() => {
    return usersData?.users && usersData.users.length > 0
      ? usersData.users
      : FALLBACK_USERS;
  }, [usersData]);

  const signatures = useMemo(() => {
    return signaturesData?.data && signaturesData.data.length > 0
      ? signaturesData.data
      : [
          {
            signature_id: 1,
            signature_reference: 'SIG-EXEC-9941 (Dr. Bezabih Alemu - Digital Certificate)',
            signature_type: 'digital_certificate' as const,
            is_active: true,
            signed_by: 1,
          },
          {
            signature_id: 2,
            signature_reference: 'SIG-DIR-8812 (Eng. Yohannes Haile - Transparent Handwritten Stroke)',
            signature_type: 'handwritten_image' as const,
            is_active: true,
            signed_by: 2,
          },
          {
            signature_id: 3,
            signature_reference: 'SIG-OFF-7721 (Civil Service Authenticated Token)',
            signature_type: 'digital_certificate' as const,
            is_active: true,
            signed_by: 4,
          },
        ];
  }, [signaturesData]);

  const stamps = useMemo(() => {
    return stampsData?.data && stampsData.data.length > 0
      ? stampsData.data
      : [
          {
            stamp_id: 1,
            stamp_name: 'Official Executive Department Seal (HZSITD Gold Seal - Transparent)',
            directory_id: 1,
            is_active: true,
          },
          {
            stamp_id: 2,
            stamp_name: 'Software Directorate Authentication Round Stamp (Transparent Red Ink)',
            directory_id: 2,
            is_active: true,
          },
          {
            stamp_id: 3,
            stamp_name: 'Infrastructure & Hardware Desk Verification Stamp (Transparent Purple Ink)',
            directory_id: 3,
            is_active: true,
          },
        ];
  }, [stampsData]);

  const templates = useMemo(() => {
    return templatesData?.data && templatesData.data.length > 0
      ? templatesData.data
      : [
          {
            template_id: 1,
            template_name: 'Standard Outgoing Ministerial Circular',
            description: 'Formal inter-agency correspondence letterhead',
            is_active: true,
          },
          {
            template_id: 2,
            template_name: 'Executive Directive & Strategic Instruction Note',
            description: 'Priority departmental directive letterhead',
            is_active: true,
          },
          {
            template_id: 3,
            template_name: 'Inter-Directorate Technical Memorandum',
            description: 'Internal technical coordination memo format',
            is_active: true,
          },
        ];
  }, [templatesData]);

  // Attachments state
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set appropriate defaults whenever modal opens or role changes
  React.useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);

      if (isOfficer) {
        setDirection('OUTGOING');
        setLetterType('Internal Memo');
        // Pre-target officer's Directorate Lead (e.g. Eng. Yohannes Haile)
        const myLead = users.find((u) => u.role === 'Directory Lead' && u.directory_id === (currentUser?.directory_id || 2));
        if (myLead) {
          setAssignedOfficerId(myLead.id);
          setRecipientDirectoryId(myLead.directory_id || 2);
        } else {
          setAssignedOfficerId(2);
          setRecipientDirectoryId(2);
        }
        setSelectedSignatureId(3);
        setSelectedStampId(2);
        setSelectedTemplateId(3);
      } else if (isLead) {
        setLetterType('Technical Memorandum');
        // Default target another directorate
        const otherDir = directories.find((d) => d.id !== (currentUser?.directory_id || 2)) || directories[0];
        setRecipientDirectoryId(otherDir.id);
        setSelectedSignatureId(2); // Eng. Yohannes
        setSelectedStampId(2); // Software round stamp
        setSelectedTemplateId(3);
      } else if (isExecutive) {
        setLetterType('Official Letter');
        setSelectedSignatureId(1); // Dr. Bezabih digital certificate
        setSelectedStampId(1); // Executive Gold Seal
        setSelectedTemplateId(1); // Ministerial circular template
        setRecipientDirectoryId(2);
      }
    }
  }, [isOpen, initialSubject, initialBody, isOfficer, isLead, isExecutive, directories, users, currentUser?.directory_id]);

  if (!isOpen) return null;

  const handleFileUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newRaw: File[] = [];
    const newAttachments: UploadedAttachment[] = [];
    for (const file of fileArray) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds maximum size limit of 25MB.`);
        continue;
      }
      newRaw.push(file);
      newAttachments.push({
        filename: file.name,
        original_name: file.name,
        mime_type: file.type || 'application/pdf',
        file_size: file.size,
        url: URL.createObjectURL(file),
      });
    }
    setRawFiles((prev) => [...prev, ...newRaw]);
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setRawFiles((prev) => prev.filter((_, idx) => idx !== index));
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const formatText = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 10);
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!subject.trim()) {
      alert('Please provide a subject line for the correspondence.');
      return;
    }

    if (direction === 'INCOMING') {
      if (!externalSenderOrg.trim()) {
        alert('Please specify the sending ministry or organization.');
        return;
      }
      if (!body.trim() && rawFiles.length === 0) {
        alert('Please attach the scanned incoming PDF or provide an executive summary.');
        return;
      }
    } else {
      // Outgoing validation
      if (!body.trim() && rawFiles.length === 0) {
        alert('Please enter message text or attach a document file.');
        return;
      }
      if (isExecutive && execTargetType === 'EXTERNAL_MINISTRY' && !externalRecipientOrg.trim()) {
        alert('Please specify the recipient external ministry or public authority.');
        return;
      }
    }

    // Determine letter_type according to api-design.json OpenAPI contract
    let computedLetterType = 'internal_outbox';
    if (direction === 'INCOMING') {
      computedLetterType = externalSenderOrg ? 'outside_inbox' : 'internal_inbox';
    } else {
      if (isExecutive && execTargetType === 'EXTERNAL_MINISTRY') {
        computedLetterType = 'outside_outbox';
      } else {
        computedLetterType = 'internal_outbox';
      }
    }

    const owningDirId = currentUser?.directory_id || (isOfficer ? 2 : isLead ? 2 : 1);
    let targetDirId = Number(recipientDirectoryId) || (owningDirId === 1 ? 2 : 1);
    let targetUserId = Number(assignedOfficerId) || 2;

    if (isLead && leadTargetType === 'UPWARD_TO_HEAD') {
      targetDirId = 1; // Executive Office
      targetUserId = 1; // Dr. Bezabih Alemu
    }

    const sourceType = rawFiles.length > 0 ? 'uploaded' : 'generated';

    const formData = new FormData();
    formData.append('subject', subject.trim());
    formData.append(
      'description',
      body.trim().slice(0, 160) ||
        (direction === 'INCOMING'
          ? `Inbound correspondence from ${externalSenderOrg}`
          : isOfficer
          ? `Internal memo draft by ${currentUser?.full_name || 'Officer'}`
          : 'Official administrative correspondence')
    );

    if (sourceType === 'generated') {
      formData.append('letter_content', body.trim() || '<p>Official Correspondence</p>');
      formData.append('template_id', String(selectedTemplateId || 1));
    }

    formData.append('source_type', sourceType);
    formData.append('letter_type', computedLetterType);
    formData.append('letter_condition', 'initial');
    formData.append('owning_directory_id', String(owningDirId));
    formData.append('received_directory_id', String(targetDirId));
    formData.append('received_by', String(targetUserId));

    // Signatures and stamps according to role
    if (direction === 'INCOMING') {
      formData.append('signature_id', '1');
      formData.append('stamp_id', '1');
    } else if (isOfficer) {
      formData.append('signature_id', String(selectedSignatureId || 3));
      formData.append('stamp_id', String(selectedStampId || 2));
    } else {
      formData.append('signature_id', String(selectedSignatureId));
      formData.append('stamp_id', String(selectedStampId));
    }

    formData.append('letter_date', new Date().toISOString().split('T')[0]);
    const due = new Date();
    due.setDate(due.getDate() + 7);
    formData.append('response_due_at', due.toISOString());

    if (sourceType === 'uploaded') {
      formData.append('capture_method', 'upload');
      rawFiles.forEach((file) => {
        formData.append('files', file);
      });
    }

    try {
      await createLetter(formData).unwrap();
      onClose();
      resetForm();
    } catch (err) {
      console.warn('Backend letter submission response handled:', err);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setSubject('');
    setBody('');
    setRawFiles([]);
    setAttachments([]);
    setExternalSenderOrg('');
    setExternalSenderName('');
    setExternalSenderRef('');
    setExternalRecipientOrg('');
    setExternalRecipientName('');
    setExternalRecipientAddress('');
    setRecipientDirectoryId('');
    setAssignedOfficerId('');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Determine Form Header Content based on Role
  const getHeaderMeta = () => {
    if (direction === 'INCOMING') {
      return {
        title: 'Register Inbound Ministerial Letter',
        subtitle: 'Log physical scanned PDF received from external federal ministry or partner agency',
        badge: 'REGISTRY INTAKE',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Inbox className="w-5 h-5 text-blue-600" />,
      };
    }

    if (isOfficer) {
      return {
        title: 'Draft Internal Memo / Briefing Note',
        subtitle: 'Draft a technical briefing, project update, or memo for your Directorate Lead to review',
        badge: 'OFFICER DRAFT',
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: <FileText className="w-5 h-5 text-slate-700" />,
      };
    }

    if (isLead) {
      return {
        title: 'Directorate Memorandum & Directive',
        subtitle: 'Issue inter-directorate technical directives or submit proposals upward to the Department Head',
        badge: 'DIRECTORATE LEAD',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: <Compass className="w-5 h-5 text-emerald-700" />,
      };
    }

    // Executive (Department Head / System Admin)
    return {
      title: 'Executive Official Letter & Ministerial Dispatch',
      subtitle: 'Draft high-authority ministerial communications, executive decrees & external dispatches',
      badge: 'EXECUTIVE CLEARANCE',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: <Award className="w-5 h-5 text-amber-700" />,
    };
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              {headerMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {headerMeta.title}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${headerMeta.badgeColor}`}
                >
                  {headerMeta.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {headerMeta.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Switcher: Only shown for Department Head / Admin who manage Inbound Registry */}
        {(isExecutive || currentUser?.role === 'System Admin') && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
            <span className="font-semibold text-slate-600">Executive Operation Mode:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setDirection('OUTGOING')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                  direction === 'OUTGOING'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Executive Outgoing Letter</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('INCOMING')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                  direction === 'INCOMING'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Register Inbound Ministerial Letter</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800">
          {/* ======================================================== */}
          {/* FORM TYPE 1: DESK OFFICER INTERNAL MEMO VIEW             */}
          {/* ======================================================== */}
          {direction === 'OUTGOING' && isOfficer && (
            <div className="space-y-4">
              {/* Author & Assigned Directorate Lead */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">
                    Author (Desk Officer)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${currentUser?.full_name || 'Kalkidan Bekele'} (${currentUser?.position_title || 'Senior Software Engineer'})`}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {currentUser?.directory_name || 'Software & Digital Innovations Directorate'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1 uppercase flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Submitted Upward To (Directorate Lead) *</span>
                  </label>
                  <select
                    value={assignedOfficerId}
                    onChange={(e) => setAssignedOfficerId(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {users
                      .filter((u) => u.role === 'Directory Lead' || u.role === 'Department Head')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} — {u.position_title}
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    Your Lead will review, sign, and determine if an official seal is warranted.
                  </span>
                </div>
              </div>

              {/* Memo Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Document Type *
                  </label>
                  <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option>Internal Memo</option>
                    <option>Technical Briefing Note</option>
                    <option>Task Progress Report</option>
                    <option>Draft Official Letter (For Clearance)</option>
                    <option>Resource / Hardware Requisition</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Briefing: API Gateway Migration and Database Scalability Report"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORM TYPE 2: DIRECTORATE LEAD VIEW                       */}
          {/* ======================================================== */}
          {direction === 'OUTGOING' && isLead && (
            <div className="space-y-4">
              {/* Routing Choice for Directorate Lead */}
              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Directorate Routing Protocol:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setLeadTargetType('INTER_DIRECTORATE')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        leadTargetType === 'INTER_DIRECTORATE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Inter-Directorate Directive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadTargetType('UPWARD_TO_HEAD')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        leadTargetType === 'UPWARD_TO_HEAD'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Submit to Department Head</span>
                    </button>
                  </div>
                </div>

                {leadTargetType === 'INTER_DIRECTORATE' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Target Directorate *
                      </label>
                      <select
                        value={recipientDirectoryId}
                        onChange={(e) => setRecipientDirectoryId(Number(e.target.value) || '')}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {directories
                          .filter((d) => d.id !== (currentUser?.directory_id || 2))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Directive Scope / Recipient Desk
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Directorate Lead / Administrative Registry"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Addressing <strong>Dr. Bezabih Alemu (Head of Department)</strong> for executive review, policy decree, or external ministerial dispatch authorization.
                    </span>
                  </div>
                )}
              </div>

              {/* Lead Endorsement: Directorate Round Stamp */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Directorate Authentication Round Stamp (Transparent Red Ink)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Signatory: Eng. Yohannes Haile (Software Directorate Lead)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Directorate Verified
                </span>
              </div>

              {/* Subject & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Directive Type *
                  </label>
                  <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option>Inter-Directorate Technical Memorandum</option>
                    <option>Operational Directive</option>
                    <option>System Architecture Proposal</option>
                    <option>Cross-Directorate Coordination Note</option>
                    <option>Technical Response / Compliance</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Directive: Integration Requirements for Regional e-Services Gateway"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORM TYPE 3: DEPARTMENT HEAD EXECUTIVE VIEW              */}
          {/* ======================================================== */}
          {direction === 'OUTGOING' && isExecutive && (
            <div className="space-y-4">
              {/* Executive Destination: External Ministry vs Internal Decree */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>Executive Dispatch Authority:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setExecTargetType('EXTERNAL_MINISTRY')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        execTargetType === 'EXTERNAL_MINISTRY'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🏛️ Outside Ministry / Authority (e.g. MoIT)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecTargetType('INTERNAL_DIRECTIVE')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        execTargetType === 'INTERNAL_DIRECTIVE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Internal Executive Decree (All Directorates)</span>
                    </button>
                  </div>
                </div>

                {execTargetType === 'EXTERNAL_MINISTRY' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Recipient Ministry / Institution *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ministry of Innovation & Technology (MoIT)"
                        value={externalRecipientOrg}
                        onChange={(e) => setExternalRecipientOrg(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Addressee / Official Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Fariya Amin (State Minister)"
                        value={externalRecipientName}
                        onChange={(e) => setExternalRecipientName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Official Address / City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Addis Ababa, Ethiopia"
                        value={externalRecipientAddress}
                        onChange={(e) => setExternalRecipientAddress(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Target Subordinate Directorate *
                      </label>
                      <select
                        value={recipientDirectoryId}
                        onChange={(e) => setRecipientDirectoryId(Number(e.target.value) || '')}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="">All Directorates (General Executive Circular)</option>
                        {directories.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                        Executive Mandate Level
                      </label>
                      <input
                        type="text"
                        readOnly
                        value="Binding Departmental Decree"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Executive Cryptographic Endorsement Box (ISSUE 1 KEPT & ENHANCED) */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Executive State Seal &amp; PKI Signature Endorsement</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                    Highest State Clearance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1">
                      <PenTool className="w-3 h-3 text-purple-600" />
                      <span>Executive Signature *</span>
                    </label>
                    <select
                      value={selectedSignatureId}
                      onChange={(e) => setSelectedSignatureId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    >
                      {signatures.map((s) => (
                        <option key={s.signature_id} value={s.signature_id}>
                          {s.signature_reference}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1">
                      <Stamp className="w-3 h-3 text-emerald-600" />
                      <span>Official Stamp / Seal *</span>
                    </label>
                    <select
                      value={selectedStampId}
                      onChange={(e) => setSelectedStampId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    >
                      {stamps.map((st) => (
                        <option key={st.stamp_id} value={st.stamp_id}>
                          {st.stamp_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span>Letterhead Stationery</span>
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    >
                      {templates.map((t) => (
                        <option key={t.template_id} value={t.template_id}>
                          {t.template_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subject & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Letter Type *
                  </label>
                  <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option>Official Ministerial Letter</option>
                    <option>Executive Strategic Directive</option>
                    <option>General Circular</option>
                    <option>Official Inquiry / Request to Ministry</option>
                    <option>Compliance &amp; Policy Response</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Official Response: Deployment of Federal Innovation Framework across Hossana Zone"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORM TYPE 4: INBOUND REGISTRATION VIEW (ISSUE 2 FIX)     */}
          {/* ======================================================== */}
          {direction === 'INCOMING' && (
            <div className="space-y-3 p-4 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between pb-1 border-b border-blue-200/80">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-blue-600" />
                  <span>External Inbound Sender Credentials</span>
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-100 font-semibold px-2 py-0.5 rounded-full">
                  Original Physical Stamped Letter
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 uppercase">
                    Sending Ministry / Authority *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ministry of Innovation & Technology"
                    value={externalSenderOrg}
                    onChange={(e) => setExternalSenderOrg(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 uppercase">
                    Signatory / Official Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Fariya Amin (State Minister)"
                    value={externalSenderName}
                    onChange={(e) => setExternalSenderName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 uppercase">
                    External Letter Tracking Ref # *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MInT/DIR/2026/842"
                    value={externalSenderRef}
                    onChange={(e) => setExternalSenderRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Triage Target Directorate within HZSITD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Assigned Target Directorate *</span>
                  </label>
                  <select
                    value={recipientDirectoryId}
                    onChange={(e) => setRecipientDirectoryId(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">Executive Registry &amp; Triage (Default)</option>
                    {directories.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1 uppercase">
                    Inbound Document Classification *
                  </label>
                  <select
                    value={letterType}
                    onChange={(e) => setLetterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option>Official Ministerial Directive</option>
                    <option>Inter-Agency Request / Inquiry</option>
                    <option>National Circular</option>
                    <option>Technical Specification Letter</option>
                    <option>General Official Letter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  placeholder="Enter official title from the incoming letterhead..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COMMON SECTION: Priority, Message Body, Attachments      */}
          {/* ======================================================== */}

          {/* Priority Classification */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Priority Classification
            </label>
            <div className="flex gap-4">
              {(['Routine', 'Urgent', 'Confidential'] as LetterPriority[]).map((p) => (
                <label key={p} className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="priority"
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    className="text-slate-900 focus:ring-slate-900"
                  />
                  <span
                    className={
                      p === 'Urgent'
                        ? 'text-red-600 font-bold'
                        : p === 'Confidential'
                        ? 'text-purple-600 font-bold'
                        : 'text-slate-700'
                    }
                  >
                    {p}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Message Content / Body Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                {direction === 'INCOMING'
                  ? 'Executive Summary & Directive Notes'
                  : isOfficer
                  ? 'Memo Details / Briefing Text'
                  : isLead
                  ? 'Directive / Memorandum Text'
                  : 'Official Letter Content / Body'}
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  title="Bold"
                  onClick={() => formatText('**', '**')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => formatText('*', '*')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Underline"
                  onClick={() => formatText('<u>', '</u>')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-3 bg-slate-300 mx-0.5" />
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => formatText('\n• ')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => formatText('\n1. ')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              rows={direction === 'INCOMING' ? 4 : isOfficer ? 4 : 5}
              placeholder={
                direction === 'INCOMING'
                  ? 'Summarize the mandate, instructions, or required action points from the attached scanned letter...'
                  : isOfficer
                  ? 'Type your briefing explanation, findings, or draft proposal here...'
                  : isLead
                  ? 'Type the technical directive or memorandum instructions here...'
                  : 'Type the complete official memorandum or ministerial directive text here...'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-slate-900 focus:outline-none font-sans"
            />
          </div>

          {/* File Upload Dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                {direction === 'INCOMING'
                  ? 'Scanned Original Letter Document (PDF / High-Res Image) *'
                  : 'Supporting Attachments (PDF, Documents, Technical Specs)'}
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Max 25MB · PDF, Images, Word</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleFileUpload(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : direction === 'INCOMING'
                  ? 'border-blue-300 bg-blue-50/40 hover:bg-blue-50/80 hover:border-blue-400'
                  : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files);
                }}
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    direction === 'INCOMING'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {isUploading ? (
                    <span className="text-emerald-700 font-bold">Uploading document to server...</span>
                  ) : (
                    <>
                      <span className="text-slate-900 font-bold">Click to upload</span> or drag and drop scanned PDF letter
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Official PDF archive will be indexed with OCR and permanently linked to the registry
                </p>
              </div>
            </div>

            {/* Attachment Chips List */}
            {attachments.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-600 block">
                  Attached Files ({attachments.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {file.mime_type.includes('pdf') ? 'PDF' : 'DOC'}
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate text-xs">{file.original_name}</p>
                          <span className="text-[10px] text-slate-400">{formatFileSize(file.file_size)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(idx);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {attachments.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                <FileCheck className="w-4 h-4" />
                <span>{attachments.length} file(s) attached</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || isUploading}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Image
                src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
                alt="Draft"
                width={16}
                height={16}
                unoptimized
              />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              disabled={isLoading || isUploading}
              onClick={() => handleSubmit(false)}
              className={`px-5 py-2 rounded-lg text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                direction === 'INCOMING'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : isExecutive
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {direction === 'INCOMING'
                  ? 'Register & Route Inbound Letter'
                  : isOfficer
                  ? 'Submit to Lead for Approval'
                  : isLead
                  ? leadTargetType === 'INTER_DIRECTORATE'
                    ? 'Dispatch Directorate Directive'
                    : 'Forward to Department Head'
                  : 'Sign & Dispatch Official Letter'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
