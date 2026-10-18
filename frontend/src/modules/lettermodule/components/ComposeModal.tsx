'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useCreateLetterMutation, useUploadFileMutation } from '../services/letterApi';
import { useGetDirectoriesQuery } from '@/modules/authmodule/services/authApi';
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
  const [createLetter, { isLoading }] = useCreateLetterMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  const [direction, setDirection] = useState<LetterDirection>('OUTGOING');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [priority, setPriority] = useState<LetterPriority>('Routine');
  const [letterType, setLetterType] = useState('Official Letter');
  const [recipientDirectoryId, setRecipientDirectoryId] = useState<number | ''>('');

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

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds maximum size limit of 25MB.`);
        continue;
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await uploadFile(formData).unwrap();
        if (res.success && res.file) {
          setAttachments((prev) => [...prev, res.file]);
        }
      } catch (err) {
        console.error('File upload failed:', err);
        alert(`Failed to upload ${file.name}. Ensure backend is running.`);
      }
    }
  };

  const removeAttachment = (index: number) => {
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
    if (!body.trim() && attachments.length === 0) {
      alert('Please provide letter content or attach a scanned PDF document.');
      return;
    }

    if (direction === 'OUTGOING' && !isDraft) {
      if (outboundTargetType === 'EXTERNAL' && !externalRecipientOrg.trim()) {
        alert('Please specify the recipient external organization or government authority.');
        return;
      }
      if (outboundTargetType === 'INTERNAL_DIRECTIVE' && !recipientDirectoryId) {
        alert('Please select a subordinate target directorate for this directive.');
        return;
      }
    }

    try {
      await createLetter({
        subject,
        body: body.trim() || 'Attached official document file.',
        priority,
        letter_type: letterType,
        direction,
        recipient_type: direction === 'INCOMING' ? 'INTERNAL' : outboundTargetType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
        recipient_directory_id: recipientDirectoryId ? Number(recipientDirectoryId) : undefined,
        external_recipient_org: direction === 'OUTGOING' && outboundTargetType === 'EXTERNAL' ? externalRecipientOrg.trim() : undefined,
        external_recipient_name: direction === 'OUTGOING' && outboundTargetType === 'EXTERNAL' ? externalRecipientName.trim() : undefined,
        external_recipient_address: direction === 'OUTGOING' && outboundTargetType === 'EXTERNAL' ? externalRecipientAddress.trim() : undefined,
        external_sender_org: direction === 'INCOMING' ? externalSenderOrg : undefined,
        external_sender_name: direction === 'INCOMING' ? externalSenderName : undefined,
        external_sender_ref: direction === 'INCOMING' ? externalSenderRef : undefined,
        is_draft: isDraft,
        attachments,
      }).unwrap();

      onClose();
      setSubject('');
      setBody('');
      setAttachments([]);
      setExternalSenderOrg('');
      setExternalSenderName('');
      setExternalSenderRef('');
      setExternalRecipientOrg('');
      setExternalRecipientName('');
      setExternalRecipientAddress('');
      setRecipientDirectoryId('');
    } catch (err) {
      console.error('Error creating letter:', err);
      alert('Failed to save correspondence. Check backend server.');
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
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                    Subordinate Target Directorate * (Excludes Own Office)
                  </label>
                  <select
                    value={recipientDirectoryId}
                    onChange={(e) => setRecipientDirectoryId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="">Select Target Directorate (Subordinates Only)</option>
                    {dirsData?.directories
                      ?.filter((d) => d.id !== currentUser?.directory_id)
                      ?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Assigned Target Directorate
                </label>
                <select
                  value={recipientDirectoryId}
                  onChange={(e) => setRecipientDirectoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
