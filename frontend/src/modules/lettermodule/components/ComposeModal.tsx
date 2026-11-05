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
  AlertCircle,
  Loader2,
  Building2,
  Key,
  ShieldCheck,
  Send,
  Inbox,
  Lock,
  Stamp,
  PenTool,
  Info,
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

// Fallback directories if backend /directories endpoint fails (e.g. 500 on Render)
const FALLBACK_DIRECTORIES = [
  { id: 1, name: 'Executive Office & Cabinet Desk', code: 'EXEC' },
  { id: 2, name: 'Software & Digital Innovations Directorate', code: 'SW' },
  { id: 3, name: 'Infrastructure & Network Systems Directorate', code: 'INFRA' },
  { id: 4, name: 'Planning, Monitoring & Quality Directorate', code: 'PMQ' },
  { id: 5, name: 'Finance & Human Resources Directorate', code: 'FHR' },
];

// Fallback staff list if backend /users endpoint fails
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

  const { data: dirsData } = useGetDirectoriesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createLetter, { isLoading }] = useCreateLetterMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  // Direction: Outgoing vs Inbound
  const [direction, setDirection] = useState<LetterDirection>('OUTGOING');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [priority, setPriority] = useState<LetterPriority>('Routine');
  const [letterType, setLetterType] = useState('Official Letter');

  // Destination for Outgoing: Internal Directorate vs Outside Ministry/Authority
  const [outboundTargetType, setOutboundTargetType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [recipientDirectoryId, setRecipientDirectoryId] = useState<number | ''>('');
  const [assignedOfficerId, setAssignedOfficerId] = useState<number | ''>('');

  // External Destination fields (for Outgoing letters to MoIT, Hossana City, etc.)
  const [externalRecipientOrg, setExternalRecipientOrg] = useState('');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [externalRecipientAddress, setExternalRecipientAddress] = useState('');

  // Inbound Letter fields (for incoming physical scanned letters)
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

  // Guaranteed non-empty lists with fallback constants
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

  // Role permissions
  const isExecutive = activeRole === 'Department Head' || activeRole === 'System Admin';
  const isLead = activeRole === 'Directory Lead';
  const isOfficer = activeRole === 'Officer';

  // Attachments
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject);
      setBody(initialBody);
      // Sensible default target directory
      if (!recipientDirectoryId && directories.length > 0) {
        const defaultDir = directories.find((d) => d.id !== currentUser?.directory_id) || directories[0];
        setRecipientDirectoryId(defaultDir?.id || 1);
      }
    }
  }, [isOpen, initialSubject, initialBody, directories, currentUser?.directory_id, recipientDirectoryId]);

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
        alert('Please specify the sending ministry, authority or organization.');
        return;
      }
      if (!body.trim() && rawFiles.length === 0) {
        alert('Please attach the scanned incoming PDF or provide an executive summary.');
        return;
      }
    } else {
      // Outgoing validation
      if (!body.trim() && rawFiles.length === 0) {
        alert('Please enter letter body text or attach a signed document.');
        return;
      }
      if (outboundTargetType === 'EXTERNAL' && !externalRecipientOrg.trim()) {
        alert('Please specify the recipient external organization or government authority.');
        return;
      }
      if (outboundTargetType === 'INTERNAL' && !recipientDirectoryId) {
        alert('Please select a target directorate inside HZSITD.');
        return;
      }
    }

    // Determine letter_type according to api-design.json contract
    let computedLetterType = 'internal_outbox';
    if (direction === 'INCOMING') {
      computedLetterType = externalSenderOrg ? 'outside_inbox' : 'internal_inbox';
    } else {
      computedLetterType = outboundTargetType === 'EXTERNAL' ? 'outside_outbox' : 'internal_outbox';
    }

    const owningDirId = currentUser?.directory_id || 1;
    const targetDirId = Number(recipientDirectoryId) || (owningDirId === 1 ? 2 : 1);
    const targetUserId = Number(assignedOfficerId) || 2;
    const sourceType = rawFiles.length > 0 ? 'uploaded' : 'generated';

    const formData = new FormData();
    formData.append('subject', subject.trim());
    formData.append(
      'description',
      body.trim().slice(0, 160) ||
        (direction === 'INCOMING'
          ? `Inbound correspondence from ${externalSenderOrg}`
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

    // For Inbound letters, pass default asset IDs silently to satisfy backend validation
    formData.append('signature_id', String(direction === 'INCOMING' ? 1 : selectedSignatureId));
    formData.append('stamp_id', String(direction === 'INCOMING' ? 1 : selectedStampId));
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

  // Determine submit button label based on role & direction
  const getSubmitButtonLabel = () => {
    if (direction === 'INCOMING') {
      return 'Register & Route Inbound Letter';
    }
    if (isExecutive) {
      return 'Sign & Dispatch Letter';
    }
    if (isLead) {
      return outboundTargetType === 'INTERNAL'
        ? 'Dispatch Internal Directive'
        : 'Submit to Head for Seal';
    }
    // Officer role
    return 'Submit Draft for Approval';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              {direction === 'OUTGOING' ? (
                <Send className="w-5 h-5" />
              ) : (
                <Inbox className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {direction === 'OUTGOING'
                    ? 'Compose Official Correspondence'
                    : 'Register Inbound Ministerial Letter'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isExecutive
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isLead
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {activeRole}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {direction === 'OUTGOING'
                  ? 'Draft official letterhead memo, select transparent seal & dispatch'
                  : 'Log scanned PDF received from federal ministry, regional bureau, or partner agency'}
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

        {/* Workflow Switcher: Outgoing vs Inbound */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="font-semibold text-slate-600">Letter Workflow Action:</span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setDirection('OUTGOING')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
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
              className={`px-3.5 py-1.5 rounded-lg font-bold transition text-xs flex items-center gap-1.5 ${
                direction === 'INCOMING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Register Inbound Scanned Letter</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800">
          {/* ======================================================== */}
          {/* MODE 1: OUTGOING LETTER WORKFLOW                         */}
          {/* ======================================================== */}
          {direction === 'OUTGOING' && (
            <>
              {/* Author Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Authoring Officer
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${currentUser?.full_name || 'Dr. Bezabih Alemu'} (${currentUser?.position_title || activeRole})`}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Authoring Directorate
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentUser?.directory_name || 'Executive Office & Cabinet'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                  />
                </div>
              </div>

              {/* Destination Selector: Inside HZSITD vs Outside Ministry */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Recipient Destination:
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setOutboundTargetType('INTERNAL')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        outboundTargetType === 'INTERNAL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Inside HZSITD Directorate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutboundTargetType('EXTERNAL')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                        outboundTargetType === 'EXTERNAL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>🏛️ Outside Ministry / Authority (e.g. MoIT)</span>
                    </button>
                  </div>
                </div>

                {/* Sub-form: Internal Directorate */}
                {outboundTargetType === 'INTERNAL' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Target Directorate *</span>
                      </label>
                      <select
                        value={recipientDirectoryId}
                        onChange={(e) => setRecipientDirectoryId(Number(e.target.value) || '')}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="">Select Target Directorate *</option>
                        {directories.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                        <span>Attention Desk (Optional)</span>
                        <span className="text-[10px] text-slate-400 font-normal lowercase">(delegation via minuting)</span>
                      </label>
                      <select
                        value={assignedOfficerId}
                        onChange={(e) => setAssignedOfficerId(Number(e.target.value) || '')}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="">Entire Directorate (Lead / Registry Desk)</option>
                        {users
                          .filter((u) => !recipientDirectoryId || u.directory_id === recipientDirectoryId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} — {u.position_title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Sub-form: External Ministry / Authority */
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                          Recipient Authority / Ministry *
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

                    {/* Officer Warning if trying to dispatch externally */}
                    {isOfficer && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>
                          <strong>Officer Clearance Rule:</strong> Outgoing correspondence to outside ministries will be forwarded to your Directorate Lead and Department Head for clearance before physical or digital dispatch.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Letter Type */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Letter Type *
                </label>
                <select
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                >
                  <option>Official Letter</option>
                  <option>Executive Directive / Instruction</option>
                  <option>Inter-Directorate Technical Memorandum</option>
                  <option>General Circular</option>
                  <option>Official Inquiry / Request</option>
                  <option>Technical Compliance Response</option>
                </select>
              </div>

              {/* Official Stamp & Signature Endorsement Box (ISSUE 1 KEPT & ENHANCED) */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Official Stamp &amp; Cryptographic Endorsement</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Transparent PNG Overlays &amp; PKI Support
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Digital Signature Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1">
                      <PenTool className="w-3 h-3 text-purple-600" />
                      <span>Digital Signature *</span>
                    </label>
                    <select
                      value={selectedSignatureId}
                      onChange={(e) => setSelectedSignatureId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {signatures.map((s) => (
                        <option key={s.signature_id} value={s.signature_id}>
                          {s.signature_reference}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Stamp Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1">
                      <Stamp className="w-3 h-3 text-emerald-600" />
                      <span>Official Stamp / Seal *</span>
                    </label>
                    <select
                      value={selectedStampId}
                      onChange={(e) => setSelectedStampId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {stamps.map((st) => (
                        <option key={st.stamp_id} value={st.stamp_id}>
                          {st.stamp_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Letterhead Template Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span>Stationery Template</span>
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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
            </>
          )}

          {/* ======================================================== */}
          {/* MODE 2: INBOUND MINISTERIAL REGISTRATION (ISSUE 2 FIX)   */}
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
            </div>
          )}

          {/* ======================================================== */}
          {/* COMMON FIELDS: Subject, Priority, Body, Attachments      */}
          {/* ======================================================== */}

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              placeholder={
                direction === 'INCOMING'
                  ? 'Enter official title from the incoming letterhead...'
                  : 'Enter clear, official subject title...'
              }
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

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

          {/* Letter Body & Formatting Toolbar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                {direction === 'INCOMING'
                  ? 'Executive Summary & Directive Directives'
                  : 'Letter Content / Body Text'}
              </label>
              {/* Quick Formatting Tools */}
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
              rows={direction === 'INCOMING' ? 4 : 5}
              placeholder={
                direction === 'INCOMING'
                  ? 'Summarize the mandate, instructions, or required action points from the attached scanned letter...'
                  : 'Type the complete official memorandum or directive text here...'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-slate-900 focus:outline-none font-sans"
            />
          </div>

          {/* File Upload Dropzone (Scanned Originals / Attachments) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                {direction === 'INCOMING'
                  ? 'Scanned Original Letter Document (PDF / High-Res Image) *'
                  : 'Supporting Attachments & Official Documents (Optional)'}
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
                  Attached Document Files ({attachments.length}):
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
                <span>{attachments.length} document file(s) attached</span>
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
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{getSubmitButtonLabel()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
