'use client';

import React, { useState } from 'react';
import { FileText, Plus, Search, ArrowLeft, CheckCircle2, Clock, X, Building2, Eye } from 'lucide-react';
import { useGetTemplatesQuery, useCreateTemplateMutation, LetterTemplate } from '@/modules/lettermodule/services/securityAssetsApi';
import { useGetDirectoriesQuery } from '@/modules/authmodule/services/authApi';

interface TemplatesManagerProps {
  onBackToDashboard: () => void;
}

const DEFAULT_TEMPLATES: LetterTemplate[] = [
  {
    template_id: 1,
    template_name: 'Standard Outgoing Ministerial Circular',
    description: 'Official HZSITD government header with coat of arms and reference layout.',
    template_storage_key: 'templates/circular-header-2026.docx',
    directory_id: 1,
    directory_name: 'Executive Office',
    created_by: 1,
    is_active: true,
    created_at: '2026-10-20T08:30:00.000Z',
  },
  {
    template_id: 2,
    template_name: 'Executive Directive & Strategic Instruction Note',
    description: 'Pre-formatted directive template for binding departmental orders.',
    template_storage_key: 'templates/executive-directive.docx',
    directory_id: 1,
    directory_name: 'Executive Office',
    created_by: 1,
    is_active: true,
    created_at: '2026-10-21T09:15:00.000Z',
  },
  {
    template_id: 3,
    template_name: 'Inter-Directorate Technical Memorandum',
    description: 'Streamlined technical memo format with action minute tables.',
    template_storage_key: 'templates/technical-memo.docx',
    directory_id: 2,
    directory_name: 'Software Development & Standards',
    created_by: 2,
    is_active: true,
    created_at: '2026-10-22T11:00:00.000Z',
  },
];

export const TemplatesManager: React.FC<TemplatesManagerProps> = ({ onBackToDashboard }) => {
  const { data: remoteData, isLoading } = useGetTemplatesQuery();
  const [createTemplateApi, { isLoading: isCreating }] = useCreateTemplateMutation();
  const { data: dirsData } = useGetDirectoriesQuery();

  const [localTemplates, setLocalTemplates] = useState<LetterTemplate[]>(DEFAULT_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [directoryId, setDirectoryId] = useState<number>(1);

  const templatesList: LetterTemplate[] =
    remoteData?.data && remoteData.data.length > 0 ? remoteData.data : localTemplates;

  const filtered = templatesList.filter(
    (t) =>
      t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createTemplateApi({
        template_name: name.trim(),
        description: desc.trim() || 'Official letterhead layout',
        directory_id: directoryId,
        is_active: true,
      }).unwrap();
    } catch {
      const dirName =
        dirsData?.directories?.find((d) => d.id === directoryId)?.name || 'Executive Office';
      const newTpl: LetterTemplate = {
        template_id: Date.now(),
        template_name: name.trim(),
        description: desc.trim() || 'Official letterhead layout',
        template_storage_key: `templates/${name.toLowerCase().replace(/\s+/g, '-')}.docx`,
        directory_id: directoryId,
        directory_name: dirName,
        created_by: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setLocalTemplates((prev) => [newTpl, ...prev]);
    }

    setName('');
    setDesc('');
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
            <FileText className="w-7 h-7 text-blue-600" />
            <span>Official Letterhead &amp; Document Templates</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure standardized government stationery, ministerial circular formats, and typography presets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
            {templatesList.length} Active Presets
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Document Template</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tpl) => (
          <div
            key={tpl.template_id}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  Standard Template
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{tpl.template_name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tpl.directory_name || `Directory #${tpl.directory_id || 'All'}`}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>ID: #{tpl.template_id}</span>
              </span>
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready for Use</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Register Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Create Document Template</span>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zonal Procurement Directive Header"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Specify when this template should be selected..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Directorate Scope
                </label>
                <select
                  value={directoryId}
                  onChange={(e) => setDirectoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
                >
                  {isCreating ? 'Saving...' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
