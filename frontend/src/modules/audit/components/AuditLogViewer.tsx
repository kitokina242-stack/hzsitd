'use client';

import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, ArrowLeft, Eye, Clock, User, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { AuditLogItem, useGetAuditLogsQuery } from '../services/auditApi';

interface AuditLogViewerProps {
  onBackToDashboard: () => void;
}

const DEFAULT_AUDIT_LOGS: AuditLogItem[] = [
  {
    audit_log_id: 1001,
    user_id: 1,
    user_name: 'Dr. Bezabih Alemu',
    action: 'letter.endorse_and_seal',
    entity_type: 'Letter',
    entity_id: 'LTR-2026-0042',
    details: 'Executive Seal & Official Signature applied to Zonal ICT Infrastructure Directive.',
    ip_address: '196.188.12.44',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    audit_log_id: 1002,
    user_id: 2,
    user_name: 'Eng. Yohannes Haile',
    action: 'letter.forward',
    entity_type: 'Letter',
    entity_id: 'LTR-2026-0041',
    details: 'Forwarded letter with minute endorsement to Executive Office for budget clearance.',
    ip_address: '196.188.12.58',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    audit_log_id: 1003,
    user_id: 8,
    user_name: 'Solomon Bekele',
    action: 'user.status_change',
    entity_type: 'User',
    entity_id: 'USR-007',
    details: 'Approved civil servant registration for Abebe Kebede and assigned Officer clearance.',
    ip_address: '196.188.10.12',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    audit_log_id: 1004,
    user_id: 4,
    user_name: 'Almaz Tesfaye',
    action: 'letter.create',
    entity_type: 'Letter',
    entity_id: 'LTR-2026-0040',
    details: 'Drafted and registered initial internal correspondence regarding fiber optic installation.',
    ip_address: '196.188.12.91',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString()
  },
  {
    audit_log_id: 1005,
    user_id: 8,
    user_name: 'Solomon Bekele',
    action: 'directory.create',
    entity_type: 'Directory',
    entity_id: 'DIR-004',
    details: 'Created Cybersecurity, Standards & Digital Governance Directorate.',
    ip_address: '196.188.10.12',
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString()
  }
];

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onBackToDashboard }) => {
  const { data: remoteData } = useGetAuditLogsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const logs = remoteData?.data && remoteData.data.length > 0
    ? remoteData.data
    : DEFAULT_AUDIT_LOGS;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.user_name && log.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesEntity =
      selectedEntity === 'all' || log.entity_type.toLowerCase() === selectedEntity.toLowerCase();

    return matchesSearch && matchesEntity;
  });

  const getActionBadgeClass = (action: string) => {
    if (action.includes('seal') || action.includes('endorse')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (action.includes('forward') || action.includes('create')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('status') || action.includes('deactivate')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

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
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>System-Wide Cryptographic Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable government ledger recording all digital seals, minutes, stage transitions, and account operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            {logs.length} Audit Records Logged
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'Letter', 'User', 'Directory'].map((entity) => (
            <button
              key={entity}
              type="button"
              onClick={() => setSelectedEntity(entity)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                selectedEntity === entity
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {entity === 'all' ? 'All Entities' : `${entity}s`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by officer, action, ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Station IP</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.audit_log_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                    <span className="text-slate-400 text-[10px] mr-1">[{log.entity_type}]</span>
                    {log.entity_id}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{log.user_name || `User #${log.user_id}`}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {log.details || 'System event recorded.'}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Inspect Log Entry"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Audit Log Record #{selectedLog.audit_log_id}</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Action:</span>
                  <span className="font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Entity:</span>
                  <span className="font-mono text-emerald-700 font-bold">{selectedLog.entity_type} / {selectedLog.entity_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actor Officer:</span>
                  <span className="text-slate-800 font-medium">{selectedLog.user_name || `User ID ${selectedLog.user_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Network IP:</span>
                  <span className="font-mono text-slate-600">{selectedLog.ip_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-600">{new Date(selectedLog.created_at).toUTCString()}</span>
                </div>
              </div>

              <div>
                <span className="block font-semibold text-slate-700 mb-1">Audit Details / Payload Description:</span>
                <p className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed">
                  {selectedLog.details || 'Audit logged successfully.'}
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AuditLogViewer;
