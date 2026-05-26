/**
 * pages/monitoring/JurnalVerifikasiPage.tsx
 * Verifikasi Jurnal — Guru & Pembimbing. Redesign v2.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { jurnalApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import {
  ClipboardList, CheckCircle, RotateCcw, X,
  MapPin, Tag, Wrench,
} from 'lucide-react';
import type { Jurnal } from '@/lib/types';
import Badge, { getJurnalBadgeVariant, getJurnalStatusLabel } from '@/components/ui/Badge';

type FilterStatus = 'all' | 'pending' | 'verified' | 'revision';

export default function JurnalVerifikasiPage() {
  const user = getUser();
  const [jurnals, setJurnals] = useState<Jurnal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJurnal, setSelectedJurnal] = useState<Jurnal | null>(null);
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const { toast, showToast } = useToast();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage] = useState(15);

  // Stats state
  const [stats, setStats] = useState({
    all: 0,
    pending: 0,
    verified: 0,
    revision: 0
  });

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';

  const fetchJurnals = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await jurnalApi.list({
        page,
        per_page: perPage,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });
      const paginatedData = res.data.data as any;
      setJurnals(paginatedData.data || []);
      setCurrentPage(paginatedData.current_page || 1);
      setLastPage(paginatedData.last_page || 1);
      setTotalData(paginatedData.total || 0);
    } catch {
      showToast('Gagal memuat data jurnal.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, perPage, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await jurnalApi.list({ per_page: 10000 });
      const rawData = res.data.data;
      const allList = ((Array.isArray(rawData) ? rawData : (rawData as any).data || []) as Jurnal[]);
      setStats({
        all: allList.length,
        pending: allList.filter(j => j.status === 'pending').length,
        verified: allList.filter(j => j.status === 'verified').length,
        revision: allList.filter(j => j.status === 'revision').length
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchJurnals(1);
  }, [filterStatus]);

  const handleVerify = async (id: number) => {
    setSubmitting(true);
    try {
      await jurnalApi.verify(id, catatan);
      showToast('Jurnal berhasil diverifikasi!', 'success');
      setSelectedJurnal(null); setCatatan(''); fetchJurnals(currentPage); fetchStats();
    } catch {
      showToast('Gagal memproses verifikasi.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleRevision = async (id: number) => {
    if (!catatan) { showToast('Mohon berikan catatan revisi.', 'error'); return; }
    setSubmitting(true);
    try {
      await jurnalApi.revision(id, catatan);
      showToast('Catatan revisi berhasil dikirim.', 'success');
      setSelectedJurnal(null); setCatatan(''); fetchJurnals(currentPage); fetchStats();
    } catch {
      showToast('Gagal memproses revisi.', 'error');
    } finally { setSubmitting(false); }
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Pending' },
    { key: 'verified', label: 'Terverifikasi' },
    { key: 'revision', label: 'Revisi' },
  ];

  const filtered = jurnals;

  const getImgUrl = (path: string) =>
    path?.startsWith('http') ? path : `${BASE_URL}/storage/${path}`;

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Verifikasi Jurnal" subtitle="Review aktivitas harian siswa" />

      <div className="page-container py-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MiniStat label="Total" value={stats.all} color="text-indigo-600 bg-indigo-50"/>
          <MiniStat label="Pending" value={stats.pending} color="text-amber-600 bg-amber-50"/>
          <MiniStat label="Verified" value={stats.verified} color="text-emerald-600 bg-emerald-50"/>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`filter-chip flex-shrink-0 ${filterStatus === f.key ? 'active' : ''}`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="text-[10px] font-black">
                  ({f.key === 'pending' ? stats.pending : f.key === 'verified' ? stats.verified : stats.revision})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? <SkeletonList count={4}/> : (
          <div className="space-y-3">
            {filtered.length > 0 ? filtered.map((j, idx) => (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card cursor-pointer hover:border-indigo-200 transition-all group"
                onClick={() => { setSelectedJurnal(j); setCatatan(''); }}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 overflow-hidden">
                    {j.foto_kegiatan
                      ? <img src={getImgUrl(j.foto_kegiatan)} alt="Foto" className="w-full h-full object-cover"/>
                      : <ClipboardList size={22}/>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate mb-0.5">{j.judul_kegiatan}</h4>
                    <p className="text-xs text-slate-500 mb-2">
                      {(j.siswa as any)?.user?.name || (j.siswa as any)?.name || '-'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {j.status === 'pending' ? (
                        <>
                          {user?.role === 'pembimbing' && j.is_verified_pembimbing ? (
                            <Badge variant="info">Sudah Anda Verifikasi (Menunggu Guru)</Badge>
                          ) : user?.role === 'guru' && j.is_verified_guru ? (
                            <Badge variant="info">Sudah Anda Verifikasi (Menunggu Pembimbing)</Badge>
                          ) : (
                            <Badge variant="warning">Menunggu Verifikasi</Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant={getJurnalBadgeVariant(j.status)}>{getJurnalStatusLabel(j.status)}</Badge>
                      )}
                      
                      {j.kategori && (
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <Tag size={10}/> {j.kategori.nama_kategori}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold text-slate-400">
                      {new Date(j.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="card border-dashed text-center py-12">
                <ClipboardList size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="font-semibold text-slate-500">Tidak ada jurnal {filterStatus !== 'all' ? `dengan status ${filterStatus}` : ''}</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && lastPage > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
            <p className="text-xs font-bold text-slate-400">
              Halaman <span className="text-slate-800">{currentPage}</span> dari <span className="text-slate-800">{lastPage}</span> 
              <span className="mx-2">•</span> 
              Total <span className="text-indigo-600">{totalData}</span> Jurnal
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => fetchJurnals(currentPage - 1)}
                className="btn btn-secondary btn-sm px-4 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button 
                disabled={currentPage === lastPage}
                onClick={() => fetchJurnals(currentPage + 1)}
                className="btn btn-primary btn-sm px-4 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Detail ── */}
      <AnimatePresence>
        {selectedJurnal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedJurnal(null)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 35 }}
              className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92dvh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
                <div>
                  <Badge variant={getJurnalBadgeVariant(selectedJurnal.status)} className="mb-1">
                    {getJurnalStatusLabel(selectedJurnal.status)}
                  </Badge>
                  <h3 className="font-black text-slate-800 text-base">{selectedJurnal.judul_kegiatan}</h3>
                </div>
                <button onClick={() => setSelectedJurnal(null)}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 flex-shrink-0">
                  <X size={16}/>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Siswa info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black flex-shrink-0">
                    {((selectedJurnal.siswa as any)?.user?.name || 'S').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {(selectedJurnal.siswa as any)?.user?.name || (selectedJurnal.siswa as any)?.name || '-'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(selectedJurnal.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>

                {/* Meta tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedJurnal.kategori && (
                    <span className="filter-chip text-xs">
                      <Tag size={12}/> {selectedJurnal.kategori.nama_kategori}
                    </span>
                  )}
                  {selectedJurnal.alat_bahan && (
                    <span className="filter-chip text-xs">
                      <Wrench size={12}/> {selectedJurnal.alat_bahan}
                    </span>
                  )}
                  {selectedJurnal.latitude && (
                    <span className="filter-chip text-xs text-emerald-700 bg-emerald-50 border-emerald-200">
                      <MapPin size={12}/> Lokasi tercatat
                    </span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <p className="section-title">Deskripsi Kegiatan</p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed">
                    {selectedJurnal.deskripsi_pekerjaan}
                  </div>
                </div>

                {/* Photo */}
                {selectedJurnal.foto_kegiatan && (
                  <div>
                    <p className="section-title">Foto Bukti</p>
                    <div className="rounded-2xl overflow-hidden border border-slate-200">
                      <img src={getImgUrl(selectedJurnal.foto_kegiatan)} alt="Bukti" className="w-full object-cover max-h-64"/>
                    </div>
                  </div>
                )}

                {/* Previous notes */}
                {selectedJurnal.catatan_pembimbing && (
                  <div>
                    <p className="section-title">Catatan Sebelumnya</p>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
                      {selectedJurnal.catatan_pembimbing}
                    </div>
                  </div>
                )}

                {/* Verification form */}
                {selectedJurnal.status !== 'verified' && (
                  <div>
                    <p className="section-title">Catatan Verifikasi</p>
                    <textarea
                      rows={3}
                      placeholder="Tambahkan catatan atau alasan revisi (opsional untuk verifikasi, wajib untuk revisi)..."
                      className="form-input resize-none"
                      value={catatan}
                      onChange={e => setCatatan(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedJurnal.status !== 'verified' ? (
                <>
                  {((user?.role === 'pembimbing' && selectedJurnal.is_verified_pembimbing) ||
                    (user?.role === 'guru' && selectedJurnal.is_verified_guru)) ? (
                    <div className="p-5 border-t border-slate-100 flex-shrink-0">
                      <div className="p-4 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold flex items-center justify-center gap-2">
                        <CheckCircle size={18}/> Anda sudah memverifikasi jurnal ini.
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
                      <button
                        onClick={() => handleRevision(selectedJurnal.id)}
                        disabled={submitting}
                        className="btn btn-danger flex-1"
                      >
                        <RotateCcw size={16}/> {submitting ? '...' : 'Minta Revisi'}
                      </button>
                      <button
                        onClick={() => handleVerify(selectedJurnal.id)}
                        disabled={submitting}
                        className="btn btn-primary flex-[2]"
                      >
                        <CheckCircle size={16}/> {submitting ? 'Memproses...' : 'Verifikasi'}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`card p-3 text-center ${color}`}>
      <p className="text-2xl font-black stat-number">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}
