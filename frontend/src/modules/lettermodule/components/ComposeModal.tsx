'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useCreateLetterMutation, useUploadFileMutation } from '../services/letterApi';
import { useGetDirectoriesQuery, useGetUsersQuery } from '@/modules/authmodule/services/authApi';
import { useAppSelector } from '@/store';
import { LetterPriority, LetterDirection } from '@/types/letter';
import {
  X,
  Check,
  Upload,
  FileText,
  Trash2,
  Paperclip,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  FileCheck,
  AlertCircle,
  Loader2,
  UserCheck,
  Building2,
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

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  initialSubject = '',
  initialBody = '',
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: dirsData } = useGetDirectoriesQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createLetter, { isLoading }] = useCreateLetterMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  const [direction, setDirection] = useState<LetterDirection>('OUTGOING');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [priority, setPriority] = useState<LetterPriority>('Routine');
  const [letterType, setLetterType] = useState('Official Letter');
  const [recipientDirectoryId, setRecipientDirectoryId] = useState<number | ''>('');
  const [assignedOfficerId, setAssignedOfficerId] = useState<number | ''>('');

  // Outbound target type (External vs Internal Directive)
  const [outboundTargetType, setOutboundTargetType] = useState<'EXTERNAL' | 'INTERNAL_DIRECTIVE'>('EXTERNAL');
  const [externalRecipientOrg, setExternalRecipientOrg] = useState('');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [externalRecipientAddress, setExternalRecipientAddress] = useState('');

  // Inbound letter specific fields
  const [externalSenderOrg, setExternalSenderOrg] = useState('');
  const [externalSenderName, setExternalSenderName] = useState('');
  const [externalSenderRef, setExternalSenderRef] = useState('');

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
    }
  }, [isOpen, initialSubject, initialBody]);

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
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText ? selectedText.length : 4));
    }, 10);
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!subject.trim()) {
      alert('Please provide a subject line for the correspondence.');
      return;
    }
    if (!body.trim() && rawFiles.length === 0) {
      alert('Please provide letter content or attach a scanned PDF document.');
      return;
    }

    if (direction === 'OUTGOING' && !isDraft) {
      if (outboundTargetType === 'EXTERNAL' && !externalRecipientOrg.trim()) {
        alert('Please specify the recipient external organization or government authority.');
        return;
      }
      if (outboundTargetType === 'INTERNAL_DIRECTIVE' && !recipientDirectoryId && !assignedOfficerId) {
        alert('Please select a target directorate or specific personnel for this directive.');
        return;
      }
    }

    // Determine letter_type per api-design.json
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
    formData.append('description', body.trim().slice(0, 160) || 'Official administrative correspondence');
    if (sourceType === 'generated') {
      formData.append('letter_content', body.trim() || '<p>Official Correspondence</p>');
      formData.append('template_id', '1');
    }
    formData.append('source_type', sourceType);
    formData.append('letter_type', computedLetterType);
    formData.append('letter_condition', 'initial');
    formData.append('owning_directory_id', String(owningDirId));
    formData.append('received_directory_id', String(targetDirId));
    formData.append('received_by', String(targetUserId));
    formData.append('signature_id', '1');
    formData.append('stamp_id', '1');
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
    } catch (err) {
      console.warn('Backend letter submission error or offline fallback:', err);
      onClose();
      setSubject('');
      setBody('');
      setRawFiles([]);
      setAttachments([]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Image
              src="/animated-icons/wired-outline-245-file-pencil-in-reveal.webp"
              alt="Compose"
              width={26}
              height={26}
              unoptimized
            />
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {direction === 'INCOMING' ? 'Register Inbound Ministerial Letter' : 'Compose Official Correspondence'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {direction === 'INCOMING'
                  ? 'Attach scanned PDF directive and assign to department workflow'
                  : 'Draft digital correspondence with official letterhead & security seal'}
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

        {/* Direction Switcher Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="font-semibold text-slate-600">Correspondence Category:</span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setDirection('OUTGOING')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                direction === 'OUTGOING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Outgoing Department Letter
            </button>
            <button
              type="button"
              onClick={() => setDirection('INCOMING')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                direction === 'INCOMING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inbound Ministerial (PDF / Scanned)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800">
          {/* Metadata Row 1 */}
          {direction === 'OUTGOING' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Authoring Officer
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${currentUser?.full_name} (${currentUser?.position_title})`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Authoring Directorate
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentUser?.directory_name || 'Executive Office'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
              <div>
                <label className="block text-[11px] font-bold text-blue-900 mb-1 uppercase">
                  Sending Authority / Ministry *
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
                  External Tracking Ref #
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
          )}

          {/* Destination & Letter Type Section */}
          {direction === 'OUTGOING' ? (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Destination Protocol:
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOutboundTargetType('EXTERNAL');
                      setRecipientDirectoryId('');
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      outboundTargetType === 'EXTERNAL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    External Authority / Ministry
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOutboundTargetType('INTERNAL_DIRECTIVE');
                      setExternalRecipientOrg('');
                      setExternalRecipientName('');
                      setExternalRecipientAddress('');
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      outboundTargetType === 'INTERNAL_DIRECTIVE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Internal Directive to Subordinate Directorate
                  </button>
                </div>
              </div>

              {outboundTargetType === 'EXTERNAL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                      Recipient Authority / Institution *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hossana City Administration"
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
                      placeholder="e.g. Hon. Mayor Fikadu Ermias"
                      value={externalRecipientName}
                      onChange={(e) => setExternalRecipientName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                      Official Address / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mayor Office, Hossana City Hall"
                      value={externalRecipientAddress}
                      onChange={(e) => setExternalRecipientAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Target Directorate *</span>
                      </label>
                      <select
                        value={recipientDirectoryId}
                        onChange={(e) => {
                          const dirId = e.target.value ? Number(e.target.value) : '';
                          setRecipientDirectoryId(dirId);
                          if (dirId && assignedOfficerId) {
                            const selUser = usersData?.users?.find((u) => u.id === assignedOfficerId);
                            if (selUser && selUser.directory_id !== dirId) {
                              setAssignedOfficerId('');
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="">Select Target Directorate</option>
                        {dirsData?.directories
                          ?.filter((d) => currentUser?.role === 'Department Head' || currentUser?.role === 'System Admin' || d.id !== currentUser?.directory_id)
                          ?.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Direct Attention To</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal lowercase">(specific officer / lead)</span>
                      </label>
                      <select
                        value={assignedOfficerId}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : '';
                          setAssignedOfficerId(val);
                          if (val) {
                            const selUser = usersData?.users?.find((u) => u.id === val);
                            if (selUser?.directory_id && !recipientDirectoryId) {
                              setRecipientDirectoryId(selUser.directory_id);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="">Entire Directorate (Lead / Registry Desk)</option>
                        {usersData?.users
                          ?.filter((u) => {
                            if (u.id === currentUser?.id) return false;
                            if (recipientDirectoryId) return u.directory_id === recipientDirectoryId;
                            return true;
                          })
                          ?.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} — {u.role === 'Directory Lead' ? `Lead (${u.directory_name || 'Directorate'})` : `${u.role} (${u.position_title})`}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {assignedOfficerId && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-900 rounded-lg text-xs border border-emerald-200">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>
                        Directed specifically to{' '}
                        <strong>
                          {usersData?.users?.find((u) => u.id === assignedOfficerId)?.full_name}
                        </strong>{' '}
                        ({usersData?.users?.find((u) => u.id === assignedOfficerId)?.role} —{' '}
                        {usersData?.users?.find((u) => u.id === assignedOfficerId)?.position_title}).
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Assigned Target Directorate</span>
                  </label>
                  <select
                    value={recipientDirectoryId}
                    onChange={(e) => {
                      const dirId = e.target.value ? Number(e.target.value) : '';
                      setRecipientDirectoryId(dirId);
                      if (dirId && assignedOfficerId) {
                        const selUser = usersData?.users?.find((u) => u.id === assignedOfficerId);
                        if (selUser && selUser.directory_id !== dirId) {
                          setAssignedOfficerId('');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">Executive Triage (Unassigned)</option>
                    {dirsData?.directories?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Direct Attention To</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(specific officer / lead)</span>
                  </label>
                  <select
                    value={assignedOfficerId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : '';
                      setAssignedOfficerId(val);
                      if (val) {
                        const selUser = usersData?.users?.find((u) => u.id === val);
                        if (selUser?.directory_id && !recipientDirectoryId) {
                          setRecipientDirectoryId(selUser.directory_id);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">Entire Directorate (Lead / Desk)</option>
                    {usersData?.users
                      ?.filter((u) => {
                        if (recipientDirectoryId) return u.directory_id === recipientDirectoryId;
                        return true;
                      })
                      ?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} — {u.role === 'Directory Lead' ? `Lead (${u.directory_name || 'Directorate'})` : `${u.role} (${u.position_title})`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {assignedOfficerId && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100/70 text-blue-900 rounded-lg text-xs border border-blue-200">
                  <FileCheck className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                  <span>
                    Inbound letter will be assigned directly to{' '}
                    <strong>
                      {usersData?.users?.find((u) => u.id === assignedOfficerId)?.full_name}
                    </strong>{' '}
                    ({usersData?.users?.find((u) => u.id === assignedOfficerId)?.role}).
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Letter Type *
                </label>
                <select
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option>Official Letter</option>
                  <option>Executive Directive / Instruction</option>
                  <option>Technical Memorandum</option>
                  <option>Circular</option>
                  <option>Official Request</option>
                  <option>Technical Response</option>
                </select>
              </div>
            </div>
          )}

          {/* Letter Type for Outgoing */}
          {direction === 'OUTGOING' && (
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
                <option>Technical Memorandum</option>
                <option>Circular</option>
                <option>Official Request</option>
                <option>Technical Response</option>
              </select>
            </div>
          )}

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              placeholder="Enter clear, official subject title..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Priority Radios */}
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
                Letter Content / Body Text {direction === 'INCOMING' && '(Executive Summary)'}
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
              rows={5}
              placeholder={
                direction === 'INCOMING'
                  ? 'Summarize the mandate, action directives, or key points from the attached scanned letter...'
                  : 'Type the complete official memorandum or directive text here...'
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
                Official Document Attachments (PDF / Scanned Originals)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Max 25MB · PDF, Images, Word</span>
            </div>

            {/* Dropzone Box */}
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
                <div className="w-9 h-9 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-700">
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
                  PDF format recommended for official e-Government verification and permanent archiving
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
                <span>{attachments.length} document(s) attached</span>
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
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{direction === 'INCOMING' ? 'Register & Route' : 'Submit for Clearance'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
