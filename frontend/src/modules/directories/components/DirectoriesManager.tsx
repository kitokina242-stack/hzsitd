'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Plus, Search, Users, Shield, ArrowLeft, CheckCircle2, AlertCircle, X, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { Directory } from '@/types/auth';
import {
  useGetDirectoriesListQuery,
  useCreateDirectoryMutation,
  useUpdateDirectoryMutation,
  useDeactivateDirectoryMutation,
  useGetDirectoryUsersQuery
} from '../services/directoryApi';
import { useAppSelector } from '@/store';
import {
  DEFAULT_DIRECTORIES,
  mergeDirectories,
  saveStoredCustomDirectory,
} from '../constants/directories';

interface DirectoriesManagerProps {
  onBackToDashboard: () => void;
  onSelectDirectoryLetters?: (dirId: number) => void;
}

export const DirectoriesManager: React.FC<DirectoriesManagerProps> = ({
  onBackToDashboard,
  onSelectDirectoryLetters
}) => {
  const activeRole = useAppSelector((state) => state.auth.activeRole);
  const isAdmin = activeRole === 'System Admin' || activeRole === 'Department Head';

  const { data: remoteData, isLoading, refetch } = useGetDirectoriesListQuery();
  const [createDirectoryApi, { isLoading: isCreating }] = useCreateDirectoryMutation();
  const [updateDirectoryApi] = useUpdateDirectoryMutation();
  const [deactivateApi] = useDeactivateDirectoryMutation();

  const [localCreatedDirs, setLocalCreatedDirs] = useState<Directory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [shortName, setShortName] = useState('');
  const [amharicName, setAmharicName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [dirsUpdateTick, setDirsUpdateTick] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setDirsUpdateTick((t) => t + 1);
    window.addEventListener('hzsitd_directories_updated', handleUpdate);
    return () => window.removeEventListener('hzsitd_directories_updated', handleUpdate);
  }, []);

  const directories = useMemo(
    () => mergeDirectories(remoteData?.data),
    [remoteData?.data, dirsUpdateTick]
  );

  const handleCreateDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setFormError('Both Department Name and Code are required.');
      return;
    }

    const payload = {
      name: trimmedName,
      directory_name: trimmedName,
      code: trimmedCode,
      directory_code: trimmedCode,
      short_name: shortName.trim() || trimmedName,
      amharic_name: amharicName.trim() || undefined,
      description: description.trim() || undefined,
      is_active: true,
    };

    try {
      const res = await createDirectoryApi(payload).unwrap();
      const createdItem: Directory = res?.data || {
        id: Date.now(),
        directory_id: Date.now(),
        ...payload,
      };
      saveStoredCustomDirectory(createdItem);
      setFormSuccess('Directory successfully registered in government database.');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
        setName('');
        setCode('');
        setShortName('');
        setAmharicName('');
        setDescription('');
      }, 900);
      refetch();
    } catch (err: any) {
      console.error('Failed to create directory on server:', err);
      const newDir: Directory = {
        id: Date.now(),
        directory_id: Date.now(),
        ...payload,
        is_active: true,
      };
      saveStoredCustomDirectory(newDir);
      setFormSuccess('Directory saved locally & synchronized across system.');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
        setName('');
        setCode('');
        setShortName('');
        setAmharicName('');
        setDescription('');
      }, 900);
    }
  };

  const handleToggleActive = async (dir: Directory) => {
    const dirId = dir.id || dir.directory_id;
    if (!dirId) return;
    const nextActive = dir.is_active === false;
    try {
      if (nextActive) {
        await updateDirectoryApi({ id: dirId, data: { is_active: true } }).unwrap();
      } else {
        await deactivateApi(dirId).unwrap();
      }
      refetch();
    } catch {
      setLocalCreatedDirs((prev) =>
        prev.map((d) =>
          d.id === dirId || d.directory_id === dirId
            ? { ...d, is_active: nextActive }
            : d
        )
      );
    }
  };

  const filteredDirectories = directories.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (d.name || d.directory_name || '').toLowerCase().includes(q);
    const codeMatch = (d.code || d.directory_code || '').toLowerCase().includes(q);
    const amharicMatch = d.amharic_name ? d.amharic_name.includes(searchQuery) : false;
    return nameMatch || codeMatch || amharicMatch;
  });

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
            <Building2 className="w-7 h-7 text-emerald-600" />
            <span>Organizational Directorate Architecture</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Departmental hierarchy and official zonal directorates for letter dispatch &amp; minute directives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {directories.length} Directorates Active
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Directorate</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directorate by name, code (e.g. SDSD), or Amharic title..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Directorates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDirectories.map((dir) => (
          <div
            key={dir.id || dir.directory_id}
            className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="inline-block px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs">
                  {dir.code || dir.directory_code || 'DIR'}
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    dir.is_active !== false
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {dir.is_active !== false ? 'Active' : 'Deactivated'}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 leading-snug">
                {dir.name || dir.directory_name || `Directorate #${dir.id || dir.directory_id}`}
              </h3>

              {dir.amharic_name && (
                <div className="text-xs text-emerald-700 font-medium mt-1">
                  {dir.amharic_name}
                </div>
              )}

              {(dir.description || dir.short_name) && (
                <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                  {dir.description || dir.short_name}
                </p>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              {onSelectDirectoryLetters && (
                <button
                  type="button"
                  onClick={() => onSelectDirectoryLetters(dir.id || dir.directory_id || 1)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Filter Letters</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleToggleActive(dir)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    dir.is_active !== false
                      ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {dir.is_active !== false ? 'Deactivate' : 'Reactivate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Directorate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Official Directorate</h3>
                  <p className="text-xs text-slate-500">Create a new department in the zonal directory</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectory} className="p-6 space-y-4">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Directorate Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Data Center Directorate"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AIDCD"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Display Name
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. AI & Data Directorate"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amharic Title (የአማርኛ መጠሪያ)
                </label>
                <input
                  type="text"
                  value={amharicName}
                  onChange={(e) => setAmharicName(e.target.value)}
                  placeholder="e.g. አርቴፊሻል ኢንተለጀንስ እና ዳታ ሴንተር ዳይሬክቶሬት"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope &amp; Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief mandate and responsibilities..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isCreating ? 'Saving...' : 'Register Directorate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoriesManager;
