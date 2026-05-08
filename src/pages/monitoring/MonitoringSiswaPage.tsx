/**
 * pages/monitoring/MonitoringSiswaPage.tsx
 * Monitoring Siswa + Portofolio (foto, CV, surat) — Guru & Pembimbing.
 * Tab: Monitor | Portofolio
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { monitoringApi } from '@/lib/api';
import { useTahunAjar } from '@/lib/TahunAjarContext';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import type { MonitoringSiswa, SiswaPortofolio } from '@/lib/types';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  Users, Search, Building, ChevronRight, GraduationCap,
  ClipboardCheck, Clock, FileBadge, ImageIcon,
  Download, X, BookOpen, FileText, Calendar,
} from 'lucide-react';

type ActiveTab = 'monitor' | 'portofolio';

export default function MonitoringSiswaPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('monitor');
  const { toast, showToast } = useToast();
  const { activeTahunAjar, allTahunAjar } = useTahunAjar();

  // Monitor state
  const [siswa, setSiswa] = useState<MonitoringSiswa[]>([]);
  const [loadingMonitor, setLoadingMonitor] = useState(true);
  const [search, setSearch] = useState('');

  // Portofolio state
  const [portofolio, setPortofolio] = useState<SiswaPortofolio[]>([]);
  const [loadingPortofolio, setLoadingPortofolio] = useState(false);
  const [filterTaId, setFilterTaId] = useState<number | undefined>(activeTahunAjar?.id);
  const [selectedSiswa, setSelectedSiswa] = useState<SiswaPortofolio | null>(null);
  const [searchPorto, setSearchPorto] = useState('');

  // Fetch monitor data
  const fetchSiswa = useCallback(async () => {
    setLoadingMonitor(true);
    try {
      const res = await monitoringApi.siswa();
      setSiswa(Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []);
    } catch {
      showToast('Gagal memuat data bimbingan.', 'error');
    } finally {
      setLoadingMonitor(false);
    }
  }, [showToast]);

  // Fetch portofolio
  const fetchPortofolio = useCallback(async () => {
    setLoadingPortofolio(true);
    try {
      const res = await monitoringApi.portofolio(filterTaId);
      setPortofolio(Array.isArray(res.data.data) ? res.data.data : (res.data.data as any).data || []);
    } catch {
      showToast('Gagal memuat portofolio siswa.', 'error');
    } finally {
      setLoadingPortofolio(false);
    }
  }, [filterTaId, showToast]);

  useEffect(() => { fetchSiswa(); }, [fetchSiswa]);
  useEffect(() => {
    if (activeTab === 'portofolio') fetchPortofolio();
  }, [activeTab, fetchPortofolio]);

  useEffect(() => {
    if (activeTahunAjar && !filterTaId) setFilterTaId(activeTahunAjar.id);
  }, [activeTahunAjar]);

  const filteredSiswa = siswa.filter(s =>
    [s.nama, s.nisn, s.kelas, s.industri].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPorto = portofolio.filter(s =>
    [s.nama, s.nisn, s.kelas, s.jurusan].some(v => v.toLowerCase().includes(searchPorto.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Monitoring" subtitle="Pantau siswa bimbingan" />

      <div className="page-container py-5">

        {/* ── Tab Bar ── */}
        <div className="tab-bar mb-6">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`tab-item ${activeTab === 'monitor' ? 'active' : ''}`}
          >
            <Users size={15}/> <span>Monitor Siswa</span>
          </button>
          <button
            onClick={() => setActiveTab('portofolio')}
            className={`tab-item ${activeTab === 'portofolio' ? 'active' : ''}`}
          >
            <FileBadge size={15}/> <span>Portofolio</span>
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════ TAB MONITOR ══════════ */}
          {activeTab === 'monitor' && (
            <motion.div key="monitor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <StatCard label="Total" value={siswa.length} color="bg-indigo-100 text-indigo-600" icon={<Users size={18}/>} />
                <StatCard label="Terverifikasi" value={siswa.reduce((a, s) => a + s.jurnal_verified, 0)}
                  color="bg-emerald-100 text-emerald-600" icon={<ClipboardCheck size={18}/>} />
                <StatCard label="Pending" value={siswa.reduce((a, s) => a + s.jurnal_pending, 0)}
                  color="bg-amber-100 text-amber-600" icon={<Clock size={18}/>} />
              </div>

              {/* Search */}
              <div className="relative mb-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input
                  type="text"
                  placeholder="Cari nama, NISN, kelas..."
                  className="form-input pl-11"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* List */}
              {loadingMonitor ? <SkeletonList count={4}/> : (
                <div className="space-y-3">
                  {filteredSiswa.length > 0 ? filteredSiswa.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg flex-shrink-0">
                          {s.nama.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{s.nama}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <GraduationCap size={11}/> {s.nisn} • {s.kelas}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Building size={11}/> {s.industri}
                            </span>
                          </div>
                        </div>

                        {/* Journal stats */}
                        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                          <JurnalChip count={s.jurnal_verified} color="text-emerald-600 bg-emerald-50" label="V"/>
                          <JurnalChip count={s.jurnal_pending} color="text-amber-600 bg-amber-50" label="P"/>
                          <JurnalChip count={s.jurnal_revision} color="text-red-500 bg-red-50" label="R"/>
                        </div>
                      </div>

                      {/* Mobile stats */}
                      <div className="sm:hidden flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                        <JurnalChip count={s.jurnal_verified} color="text-emerald-600 bg-emerald-50" label="Verified"/>
                        <JurnalChip count={s.jurnal_pending} color="text-amber-600 bg-amber-50" label="Pending"/>
                        <JurnalChip count={s.jurnal_revision} color="text-red-500 bg-red-50" label="Revisi"/>
                      </div>
                    </motion.div>
                  )) : (
                    <EmptyState icon={<Users size={40}/>} message="Tidak ada siswa ditemukan" desc="Coba ubah kata kunci pencarian." />
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════ TAB PORTOFOLIO ══════════ */}
          {activeTab === 'portofolio' && (
            <motion.div key="portofolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

              {/* Info banner */}
              <div className="card bg-indigo-50 border-indigo-100 p-4 mb-5">
                <p className="text-sm font-semibold text-indigo-800 mb-0.5">📂 Portofolio Siswa Bimbingan</p>
                <p className="text-xs text-indigo-700/80">Lihat foto, CV, dan surat pernyataan siswa sebagai bahan pertimbangan rekrutmen. Filter berdasarkan tahun ajaran.</p>
              </div>

              {/* Filter + Search */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input
                    type="text"
                    placeholder="Cari nama, NISN, kelas..."
                    className="form-input pl-11"
                    value={searchPorto}
                    onChange={e => setSearchPorto(e.target.value)}
                  />
                </div>
                {allTahunAjar.length > 0 && (
                  <div className="w-full sm:w-64 flex-shrink-0">
                    <SearchableSelect 
                      placeholder="Pilih Tahun Ajaran..."
                      options={allTahunAjar.map(t => ({ value: t.id, label: `TA ${t.tahun_ajaran} (${t.semester})` }))}
                      value={filterTaId ? { 
                        value: filterTaId, 
                        label: allTahunAjar.find(t => t.id === filterTaId) ? `TA ${allTahunAjar.find(t => t.id === filterTaId)?.tahun_ajaran} (${allTahunAjar.find(t => t.id === filterTaId)?.semester})` : 'Pilih Tahun'
                      } : null}
                      onChange={(opt: any) => setFilterTaId(opt?.value)}
                    />
                  </div>
                )}
              </div>

              {/* Grid Portofolio */}
              {loadingPortofolio ? <SkeletonList count={4}/> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPorto.length > 0 ? filteredPorto.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => setSelectedSiswa(s)}
                      className="card cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      {/* Photo */}
                      <div className="relative mb-4">
                        {s.foto_url ? (
                          <img src={s.foto_url} alt={s.nama}
                            className="w-full h-40 object-cover rounded-xl ring-1 ring-slate-200" />
                        ) : (
                          <div className="w-full h-40 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-300 gap-2">
                            <ImageIcon size={32}/>
                            <span className="text-xs font-semibold">Belum ada foto</span>
                          </div>
                        )}
                        {/* Doc badges */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <DocBadge ok={s.has_foto} label="F"/>
                          <DocBadge ok={s.has_cv} label="CV"/>
                          <DocBadge ok={s.has_surat} label="S"/>
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-800 text-sm truncate">{s.nama}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <GraduationCap size={11}/> {s.kelas} — {s.jurusan}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building size={11}/> {s.industri}
                      </p>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                          ${s.has_cv && s.has_foto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {s.has_cv && s.has_foto ? '✓ Lengkap' : '⚠ Belum Lengkap'}
                        </span>
                        <span className="text-xs text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
                          Detail <ChevronRight size={12}/>
                        </span>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-full">
                      <EmptyState icon={<FileBadge size={40}/>} message="Tidak ada data portofolio"
                        desc="Siswa belum mengunggah dokumen atau belum ada siswa bimbingan untuk tahun ajaran ini." />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal Detail Portofolio ── */}
      <AnimatePresence>
        {selectedSiswa && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setSelectedSiswa(null)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90dvh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
                <h3 className="font-black text-slate-800">Detail Portofolio</h3>
                <button onClick={() => setSelectedSiswa(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X size={16}/>
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {/* Profile Header Section */}
                <div className="relative pt-8 pb-6 px-5 flex flex-col items-center text-center">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-indigo-50 to-white -z-10" />
                  
                  {/* Avatar/Photo */}
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden ring-4 ring-white shadow-xl bg-white">
                      {selectedSiswa.foto_url ? (
                        <img src={selectedSiswa.foto_url} alt={selectedSiswa.nama}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-300">
                          <Users size={48}/>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-xl font-black text-slate-800">{selectedSiswa.nama}</h4>
                    <p className="text-sm font-bold text-indigo-600 mt-1">{selectedSiswa.nisn} • {selectedSiswa.kelas}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                          ${selectedSiswa.has_cv && selectedSiswa.has_foto ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {selectedSiswa.has_cv && selectedSiswa.has_foto ? '✓ Dokumen Lengkap' : '⚠ Dokumen Belum Lengkap'}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 pt-0 space-y-4">

                  <div className="grid grid-cols-2 gap-3">
                    <InfoChip icon={<BookOpen size={13}/>} label="Jurusan" value={selectedSiswa.jurusan}/>
                    <InfoChip icon={<Building size={13}/>} label="Industri" value={selectedSiswa.industri}/>
                    <InfoChip icon={<Calendar size={13}/>} label="Tahun Ajaran" value={`${selectedSiswa.tahun_ajaran} (${selectedSiswa.semester})`}/>
                    <InfoChip icon={<GraduationCap size={13}/>} label="Status"
                      value={selectedSiswa.status === 'sudah_ditempatkan' ? 'Aktif PKL' : selectedSiswa.status === 'selesai_pkl' ? 'Selesai' : 'Belum PKL'}/>
                  </div>

                  {/* Documents */}
                  <div>
                    <p className="section-title">Dokumen</p>
                    <div className="space-y-2">
                      <DocRow
                        label="Curriculum Vitae (CV)"
                        icon={<FileBadge size={16}/>}
                        url={selectedSiswa.cv_url}
                        available={selectedSiswa.has_cv}
                      />
                      <DocRow
                        label="Surat Pernyataan"
                        icon={<FileText size={16}/>}
                        url={selectedSiswa.surat_url}
                        available={selectedSiswa.has_surat}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-2xl font-black text-slate-800 stat-number">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
    </div>
  );
}

function JurnalChip({ count, color, label }: { count: number; color: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${color}`}>
      {count} <span className="text-[10px] opacity-70">{label}</span>
    </span>
  );
}

function DocBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${ok ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
      {label}
    </span>
  );
}

function DocRow({ label, icon, url, available }: { label: string; icon: React.ReactNode; url: string | null; available: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${available ? 'bg-slate-50 border border-slate-200' : 'bg-slate-50/50 border border-dashed border-slate-200'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${available ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 truncate">{label}</p>
        {available
          ? <p className="text-[10px] text-emerald-600 font-semibold">✓ Tersedia</p>
          : <p className="text-[10px] text-slate-400">Belum diunggah</p>
        }
      </div>
      {available && url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="btn btn-sm btn-primary gap-1 flex-shrink-0">
          <Download size={12}/> Unduh
        </a>
      )}
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">{icon}{label}</p>
      <p className="text-xs font-bold text-slate-700 leading-tight">{value}</p>
    </div>
  );
}

function EmptyState({ icon, message, desc }: { icon: React.ReactNode; message: string; desc: string }) {
  return (
    <div className="empty-state">
      <div className="text-slate-200 mb-4">{icon}</div>
      <p className="font-bold text-slate-600 mb-1">{message}</p>
      <p className="text-sm text-slate-400 max-w-xs">{desc}</p>
    </div>
  );
}
