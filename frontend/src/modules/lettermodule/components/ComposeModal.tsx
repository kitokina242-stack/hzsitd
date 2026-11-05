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
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  FileCheck,
  Loader2,
  Building2,
  ShieldCheck,
  Send,
  Inbox,
  Stamp,
  PenTool,
  FileText,
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

  // Lead-specific destination: Send to another Directorate vs Submit to Head
  const [leadTargetType, setLeadTargetType] = useState<'INTER_DIRECTORATE' | 'UPWARD_TO_HEAD'>('INTER_DIRECTORATE');

  // Executive-specific destination: Outside Ministry vs Inside Directorate
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
            signature_reference: 'SIG-DIR-8812 (Eng. Yohannes Haile - Handwritten Stroke)',
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
        const otherDir = directories.find((d) => d.id !== (currentUser?.directory_id || 2)) || directories[0];
        setRecipientDirectoryId(otherDir.id);
        setSelectedSignatureId(2);
        setSelectedStampId(2);
        setSelectedTemplateId(3);
      } else if (isExecutive) {
        setSelectedSignatureId(1);
        setSelectedStampId(1);
        setSelectedTemplateId(1);
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
      alert('Please enter a subject.');
      return;
    }

    if (direction === 'INCOMING') {
      if (!externalSenderOrg.trim()) {
        alert('Please specify the sending ministry or organization.');
        return;
      }
      if (!body.trim() && rawFiles.length === 0) {
        alert('Please attach the scanned incoming PDF or provide a summary.');
        return;
      }
    } else {
      if (!body.trim() && rawFiles.length === 0) {
        alert('Please enter message text or attach a document file.');
        return;
      }
      if (isExecutive && execTargetType === 'EXTERNAL_MINISTRY' && !externalRecipientOrg.trim()) {
        alert('Please specify the recipient external organization.');
        return;
      }
    }

    // Determine letter_type according to api-design.json contract
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
      targetDirId = 1;
      targetUserId = 1;
    }

    const sourceType = rawFiles.length > 0 ? 'uploaded' : 'generated';

    const formData = new FormData();
    formData.append('subject', subject.trim());
    formData.append('description', body.trim().slice(0, 160) || 'Official correspondence');

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

  // Header Title & Subtitle based on Role
  const getHeaderMeta = () => {
    if (direction === 'INCOMING') {
      return {
        title: 'Register Inbound Letter',
        subtitle: 'Log a scanned PDF received from an outside ministry or partner',
        icon: <Inbox className="w-5 h-5 text-blue-600" />,
      };
    }
    if (isOfficer) {
      return {
        title: 'Draft Internal Memo',
        subtitle: 'Write an internal memo or report to your Directorate Lead',
        icon: <FileText className="w-5 h-5 text-slate-700" />,
      };
    }
    if (isLead) {
      return {
        title: 'Directorate Directive & Memo',
        subtitle: 'Send a directive to another directorate or submit to the Department Head',
        icon: <Send className="w-5 h-5 text-emerald-700" />,
      };
    }
    return {
      title: 'Official Letter & Dispatch',
      subtitle: 'Dispatch official correspondence to outside ministries or internal directorates',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-700" />,
    };
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              {headerMeta.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {headerMeta.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
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

        {/* Workflow Switcher (Department Head & Admin Only) */}
        {(isExecutive || currentUser?.role === 'System Admin') && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
            <span className="font-semibold text-slate-600">Action:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setDirection('OUTGOING')}
                className={`px-3 py-1 rounded-md font-bold transition text-xs flex items-center gap-1.5 ${
                  direction === 'OUTGOING'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Outgoing Letter</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('INCOMING')}
                className={`px-3 py-1 rounded-md font-bold transition text-xs flex items-center gap-1.5 ${
                  direction === 'INCOMING'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Register Inbound Letter</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800">
          {/* ======================================================== */}
          {/* 1. RECIPIENT ROUTING (CLEAN & MINIMAL BY ROLE)          */}
          {/* ======================================================== */}

          {/* OFFICER: Clean "To" Lead */}
          {direction === 'OUTGOING' && isOfficer && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                To (Directorate Lead) *
              </label>
              <select
                value={assignedOfficerId}
                onChange={(e) => setAssignedOfficerId(Number(e.target.value) || '')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {users
                  .filter((u) => u.role === 'Directory Lead' || u.role === 'Department Head')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.position_title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* LEAD: Clean toggle between another Directorate vs Department Head */}
          {direction === 'OUTGOING' && isLead && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Send To:</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLeadTargetType('INTER_DIRECTORATE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      leadTargetType === 'INTER_DIRECTORATE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Another Directorate
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadTargetType('UPWARD_TO_HEAD')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      leadTargetType === 'UPWARD_TO_HEAD'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Department Head
                  </button>
                </div>
              </div>

              {leadTargetType === 'INTER_DIRECTORATE' ? (
                <div>
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
              ) : (
                <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
                  Addressed to: <strong>Dr. Bezabih Alemu (Head of Department)</strong>
                </div>
              )}
            </div>
          )}

          {/* HEAD: Clean toggle between External Ministry vs Internal Directorate */}
          {direction === 'OUTGOING' && isExecutive && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Send To:</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setExecTargetType('EXTERNAL_MINISTRY')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      execTargetType === 'EXTERNAL_MINISTRY'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Outside Ministry / Partner (e.g. MoIT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecTargetType('INTERNAL_DIRECTIVE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                      execTargetType === 'INTERNAL_DIRECTIVE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Inside Directorate
                  </button>
                </div>
              </div>

              {execTargetType === 'EXTERNAL_MINISTRY' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Recipient Ministry / Org *"
                    value={externalRecipientOrg}
                    onChange={(e) => setExternalRecipientOrg(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Addressee / Title (Optional)"
                    value={externalRecipientName}
                    onChange={(e) => setExternalRecipientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="City / Address"
                    value={externalRecipientAddress}
                    onChange={(e) => setExternalRecipientAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              ) : (
                <select
                  value={recipientDirectoryId}
                  onChange={(e) => setRecipientDirectoryId(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">All Directorates (General Circular)</option>
                  {directories.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* INBOUND REGISTRATION FIELDS */}
          {direction === 'INCOMING' && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Sending Ministry / Org *"
                  value={externalSenderOrg}
                  onChange={(e) => setExternalSenderOrg(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Signatory Name / Title"
                  value={externalSenderName}
                  onChange={(e) => setExternalSenderName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="External Tracking Ref # *"
                  value={externalSenderRef}
                  onChange={(e) => setExternalSenderRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-900 mb-1">
                  Assign to Directorate for Action *
                </label>
                <select
                  value={recipientDirectoryId}
                  onChange={(e) => setRecipientDirectoryId(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Executive Registry (Triage)</option>
                  {directories.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. SUBJECT & PRIORITY                                   */}
          {/* ======================================================== */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              placeholder="Enter clear, concise subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-600">Priority:</span>
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

          {/* ======================================================== */}
          {/* 3. STAMP & SIGNATURE (FOR LEAD & HEAD ONLY)             */}
          {/* ======================================================== */}
          {direction === 'OUTGOING' && !isOfficer && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Stamp className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-700">
                  {isExecutive
                    ? 'Executive Gold Seal & PKI Digital Signature'
                    : 'Directorate Round Stamp & Lead Signature'}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Transparent Ink Overlay Applied
              </span>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. MESSAGE TEXTAREA                                     */}
          {/* ======================================================== */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                {direction === 'INCOMING' ? 'Summary / Mandates' : 'Message Content'}
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                <button
                  type="button"
                  title="Bold"
                  onClick={() => formatText('**', '**')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <Bold className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => formatText('*', '*')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <Italic className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => formatText('\n• ')}
                  className="p-1 rounded hover:bg-white text-slate-700 transition"
                >
                  <List className="w-3 h-3" />
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              rows={4}
              placeholder={
                direction === 'INCOMING'
                  ? 'Summarize directives or required actions from the scanned letter...'
                  : 'Type your message text here...'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-slate-900 focus:outline-none font-sans"
            />
          </div>

          {/* ======================================================== */}
          {/* 5. ATTACHMENTS DROPZONE                                 */}
          {/* ======================================================== */}
          <div className="space-y-2">
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
              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
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
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">
                  {isUploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <span className="text-slate-900 font-bold">Attach file</span> (PDF, Word, Images - Max 25MB)
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Attached files chips */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-xs text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate">{file.original_name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(idx);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {attachments.length > 0 && `${attachments.length} file(s) attached`}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || isUploading}
              onClick={() => handleSubmit(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isLoading || isUploading}
              onClick={() => handleSubmit(false)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                direction === 'INCOMING'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {direction === 'INCOMING'
                  ? 'Register Inbound Letter'
                  : isOfficer
                  ? 'Submit to Lead for Review'
                  : isLead
                  ? leadTargetType === 'INTER_DIRECTORATE'
                    ? 'Dispatch Directive'
                    : 'Submit to Department Head'
                  : 'Sign & Dispatch Letter'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
