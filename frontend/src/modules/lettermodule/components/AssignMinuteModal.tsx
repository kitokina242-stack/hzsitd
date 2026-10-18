'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Letter } from '@/types/letter';
import { Directory, User } from '@/types/auth';
import { useExecuteLetterActionMutation } from '../services/letterApi';
import { X, Send, Share2, UserCheck, Shield } from 'lucide-react';

interface AssignMinuteModalProps {
  letter: Letter | null;
  isOpen: boolean;
  mode: 'assign_directory' | 'delegate_officer';
  directories: Directory[];
  officers: User[];
  onClose: () => void;
}

export const AssignMinuteModal: React.FC<AssignMinuteModalProps> = ({
  letter,
  isOpen,
  mode,
  directories,
  officers,
  onClose,
}) => {
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<number | ''>('');
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | ''>('');
  const [minuteText, setMinuteText] = useState('');
  const [executeAction, { isLoading }] = useExecuteLetterActionMutation();

  if (!isOpen || !letter) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'assign_directory') {
        if (!selectedDirectoryId) return;
        await executeAction({
          id: letter.id,
          action: 'assign_to_directory',
          recipient_directory_id: Number(selectedDirectoryId),
          notes: minuteText.trim() || 'Assigned to directory for action.',
        }).unwrap();
      } else {
        if (!selectedOfficerId) return;
        await executeAction({
          id: letter.id,
          action: 'delegate_to_officer',
          assigned_officer_id: Number(selectedOfficerId),
          notes: minuteText.trim() || 'Delegated to officer for action.',
        }).unwrap();
      }
      onClose();
      setMinuteText('');
    } catch (err) {
      console.error('Failed to assign/delegate letter:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/25 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
              {mode === 'assign_directory' ? (
                <Share2 className="w-4 h-4 text-white" />
              ) : (
                <UserCheck className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'assign_directory'
                  ? 'Minute & Assign to Directorate'
                  : 'Delegate Directive to Officer'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">{letter.reference_no}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document Subject Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Official Subject
            </span>
            <p className="font-semibold text-slate-900 line-clamp-2">{letter.subject}</p>
            <span className="text-[11px] text-slate-500">
              Sender: {letter.external_sender_org || letter.sender_name || 'Government Office'}
            </span>
          </div>

          {/* Target Selection */}
          {mode === 'assign_directory' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Directorate *
              </label>
              <select
                required
                value={selectedDirectoryId}
                onChange={(e) => setSelectedDirectoryId(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="" disabled>
                  Select Directorate
                </option>
                {directories.map((dir) => (
                  <option key={dir.id} value={dir.id}>
                    {dir.name} ({dir.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assign to Officer *
              </label>
              <select
                required
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="" disabled>
                  Select Responsible Officer
                </option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.full_name} — {officer.position_title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Minute / Instruction Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Official Minute / Executive Instruction Note *
            </label>
            <textarea
              required
              rows={4}
              value={minuteText}
              onChange={(e) => setMinuteText(e.target.value)}
              placeholder={
                mode === 'assign_directory'
                  ? 'e.g. Eng. Yohannes, please assess feasibility and prepare formal recommendation by Friday...'
                  : 'e.g. Almaz, please conduct site survey and prepare draft technical response letter...'
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              This note will be permanently stamped into the document&apos;s cryptographic audit timeline.
            </p>
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Routing...' : mode === 'assign_directory' ? 'Assign Down' : 'Delegate Directive'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
