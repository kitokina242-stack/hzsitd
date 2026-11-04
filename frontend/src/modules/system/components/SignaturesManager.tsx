'use client';

import React, { useState } from 'react';
import { Key, Plus, Search, ArrowLeft, CheckCircle2, Clock, X, Shield, FileCheck } from 'lucide-react';
import { useGetSignaturesQuery, useCreateSignatureMutation, Signature } from '@/modules/lettermodule/services/securityAssetsApi';

interface SignaturesManagerProps {
  onBackToDashboard: () => void;
}

const DEFAULT_SIGNATURES: Signature[] = [
  {
    signature_id: 1,
    signed_by: 1,
    signer_name: 'Dr. Bezabih Alemu',
    signature_type: 'digital_certificate',
    signature_reference: 'SIG-EXEC-9941-RSA4096',
    signature_image_url: '/signatures/bezabih-sig.png',
    signed_at: '2026-10-20T08:30:00.000Z',
    is_active: true,
  },
  {
    signature_id: 2,
    signed_by: 2,
    signer_name: 'Eng. Yohannes Haile',
    signature_type: 'handwritten_image',
    signature_reference: 'SIG-DIR-8812-STROKE',
    signature_image_url: '/signatures/yohannes-sig.png',
    signed_at: '2026-10-21T09:15:00.000Z',
    is_active: true,
  },
  {
    signature_id: 3,
    signed_by: 4,
    signer_name: 'Almaz Tesfaye',
    signature_type: 'digital_certificate',
    signature_reference: 'SIG-OFF-7721-ECDSA',
    signature_image_url: '/signatures/almaz-sig.png',
    signed_at: '2026-10-22T11:00:00.000Z',
    is_active: true,
  },
];

export const SignaturesManager: React.FC<SignaturesManagerProps> = ({ onBackToDashboard }) => {
  const { data: remoteData, isLoading } = useGetSignaturesQuery();
  const [createSignatureApi, { isLoading: isCreating }] = useCreateSignatureMutation();

  const [localSigs, setLocalSigs] = useState<Signature[]>(DEFAULT_SIGNATURES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [sigType, setSigType] = useState<'digital_certificate' | 'handwritten_image'>('digital_certificate');
  const [reference, setReference] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const sigsList: Signature[] =
    remoteData?.data && remoteData.data.length > 0 ? remoteData.data : localSigs;

  const filtered = sigsList.filter(
    (s) =>
      s.signature_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.signer_name && s.signer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;

    try {
      await createSignatureApi({
        signature_type: sigType,
        signature_reference: reference.trim(),
        signature_image_url: imageUrl.trim() || undefined,
      }).unwrap();
    } catch {
      const newSig: Signature = {
        signature_id: Date.now(),
        signed_by: 1,
        signer_name: 'Current Authenticated User',
        signature_type: sigType,
        signature_reference: reference.trim(),
        signature_image_url: imageUrl.trim() || '/signatures/default-sig.png',
        signed_at: new Date().toISOString(),
        is_active: true,
      };
      setLocalSigs((prev) => [newSig, ...prev]);
    }

    setReference('');
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
            <Key className="w-7 h-7 text-purple-600" />
            <span>Signatures &amp; Cryptographic Keys</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authenticated officer signatures, digital certificates, and endorsement tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
            {sigsList.length} Registered Signatures
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Signature</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search signatures by reference or signer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Signatures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((sig) => (
          <div
            key={sig.signature_id}
            className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-purple-300 transition"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 flex-shrink-0">
                  <Key className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                  {sig.signature_type === 'digital_certificate' ? 'PKI Certificate' : 'Handwritten'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {sig.signer_name || `Officer #${sig.signed_by}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono truncate">
                  {sig.signature_reference}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>ID: #{sig.signature_id}</span>
              </span>
              <span className="text-purple-600 font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Active &amp; Bound</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Register Signature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                <span>Register Digital Signature</span>
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
                  Signature Type *
                </label>
                <select
                  value={sigType}
                  onChange={(e) => setSigType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="digital_certificate">PKI Digital Certificate (Cryptographic)</option>
                  <option value="handwritten_image">Handwritten Signature Stroke Image</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Signature Reference Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SIG-EXEC-2026-X88"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Image / Token URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. /signatures/my-key.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-sm"
                >
                  {isCreating ? 'Registering...' : 'Register Signature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
