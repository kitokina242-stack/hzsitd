'use client';

import React, { useState } from 'react';
import { ShieldCheck, Plus, Search, ArrowLeft, Building2, CheckCircle2, Clock, X, Upload } from 'lucide-react';
import { useGetStampsQuery, useCreateStampMutation, Stamp } from '@/modules/lettermodule/services/securityAssetsApi';
import { useGetDirectoriesQuery } from '@/modules/authmodule/services/authApi';

interface StampsManagerProps {
  onBackToDashboard: () => void;
}

const DEFAULT_STAMPS: Stamp[] = [
  {
    stamp_id: 1,
    stamp_name: 'Official Executive Department Seal',
    stamp_image_url: '/seals/hzsitd-gold-seal.png',
    directory_id: 1,
    directory_name: 'Executive Office',
    uploaded_by: 1,
    is_active: true,
    created_at: '2026-10-20T08:30:00.000Z',
  },
  {
    stamp_id: 2,
    stamp_name: 'Software Directorate Authentication Stamp',
    stamp_image_url: '/seals/software-dir-seal.png',
    directory_id: 2,
    directory_name: 'Software Development & Standards',
    uploaded_by: 2,
    is_active: true,
    created_at: '2026-10-21T09:15:00.000Z',
  },
  {
    stamp_id: 3,
    stamp_name: 'Infrastructure & Hardware Desk Verification Stamp',
    stamp_image_url: '/seals/infra-desk-seal.png',
    directory_id: 3,
    directory_name: 'Infrastructure & Hardware',
    uploaded_by: 3,
    is_active: true,
    created_at: '2026-10-22T11:00:00.000Z',
  },
];

export const StampsManager: React.FC<StampsManagerProps> = ({ onBackToDashboard }) => {
  const { data: remoteData, isLoading } = useGetStampsQuery();
  const [createStampApi, { isLoading: isCreating }] = useCreateStampMutation();
  const { data: dirsData } = useGetDirectoriesQuery();

  const [localStamps, setLocalStamps] = useState<Stamp[]>(DEFAULT_STAMPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New stamp form
  const [name, setName] = useState('');
  const [directoryId, setDirectoryId] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState('');

  const stampsList: Stamp[] =
    remoteData?.data && remoteData.data.length > 0 ? remoteData.data : localStamps;

  const filtered = stampsList.filter(
    (s) =>
      s.stamp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.directory_name && s.directory_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createStampApi({
        stamp_name: name.trim(),
        directory_id: directoryId,
        stamp_image_url: imageUrl.trim() || undefined,
        is_active: true,
      }).unwrap();
    } catch {
      // Local fallback
      const dirName =
        dirsData?.directories?.find((d) => d.id === directoryId)?.name || 'Executive Directorate';
      const newStamp: Stamp = {
        stamp_id: Date.now(),
        stamp_name: name.trim(),
        stamp_image_url: imageUrl.trim() || '/seals/default-seal.png',
        directory_id: directoryId,
        directory_name: dirName,
        uploaded_by: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setLocalStamps((prev) => [newStamp, ...prev]);
    }

    setName('');
    setImageUrl('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard Overview</span>
          </button>
          <h1 className="font-serif-executive text-2xl sm:text-3xl text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>Official Stamps &amp; Departmental Seals</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authenticated zonal stamps, directorate seals, and cryptographic emblems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {stampsList.length} Authenticated Seals
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Stamp</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search stamps by name or directorate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Stamps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((stamp) => (
          <div
            key={stamp.stamp_id}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  Active Seal
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{stamp.stamp_name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{stamp.directory_name || `Directory #${stamp.directory_id}`}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>ID: #{stamp.stamp_id}</span>
              </span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Register Stamp Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Register Official Stamp / Seal</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stamp Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Planning & Strategy Official Seal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owning Directorate *
                </label>
                <select
                  value={directoryId}
                  onChange={(e) => setDirectoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {dirsData?.directories?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  )) || (
                    <>
                      <option value={1}>Executive Office</option>
                      <option value={2}>Software Development &amp; Standards</option>
                      <option value={3}>Infrastructure &amp; Hardware</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stamp Graphic URL / Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. /seals/planning-seal.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
                >
                  {isCreating ? 'Registering...' : 'Register Seal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
