/**
 * pages/admin/ActivityLogsPage.tsx
 * Halaman Log Aktivitas Sistem (Admin).
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { logsApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { History, Search, Filter, Clock, User, Shield, Info, Database } from 'lucide-react';
import type { ActivityLog } from '@/lib/types';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await logsApi.list();
      const rawData = res.data.data;
      setLogs(Array.isArray(rawData) ? rawData : (rawData as any).data || []);
    } catch (err) {
      showToast('Gagal memuat log aktivitas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Log Aktivitas" subtitle="Pantau seluruh jejak aksi pengguna dalam sistem" />

      <div className="page-container py-6">
        
        {/* ── Action Bar ── */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari aktivitas..." className="form-input pl-14 py-4 rounded-2xl bg-white border-slate-100 shadow-sm" />
          </div>
          <button className="btn btn-secondary w-full sm:w-auto px-6 py-4 rounded-2xl flex items-center justify-center gap-2">
            <Filter size={18} /> Filter Lanjut
          </button>
        </div>

        {/* ── Timeline ── */}
        {loading ? <SkeletonList count={8} /> : (
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100 hidden md:block" />

            <div className="space-y-6">
              {logs.length > 0 ? logs.map((log, idx) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative pl-0 md:pl-20"
                >
                  {/* Timeline Node */}
                  <div className="absolute left-6 top-6 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-md z-10 hidden md:block" />
                  
                  <div className="card hover:border-blue-200 transition-all group p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <History size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-lg leading-snug mb-1">{log.description}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1.5"><User size={14} className="text-slate-300"/> {log.user?.name || 'System'}</span>
                            <span className="flex items-center gap-1.5"><Shield size={14} className="text-slate-300"/> {log.user?.role || 'Guest'}</span>
                            {log.subject_type && <span className="flex items-center gap-1.5"><Database size={14} className="text-slate-300"/> {log.subject_type.split('\\').pop()} #{log.subject_id}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="md:text-right flex items-center md:items-end flex-row md:flex-col gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock size={12} /> {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {log.properties && Object.keys(log.properties).length > 0 && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-x-auto">
                        <pre className="text-[10px] text-slate-600 font-mono leading-relaxed">
                          {JSON.stringify(log.properties, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )) : (
                <div className="py-32 text-center card border-dashed border-slate-200">
                  <Info size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-medium">Belum ada jejak aktivitas yang tercatat.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
