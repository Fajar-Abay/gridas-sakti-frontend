import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { jurnalApi, kategoriJurnalApi, monitoringApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import Badge, { getJurnalBadgeVariant, getJurnalStatusLabel } from '@/components/ui/Badge';
import {
  BookOpen, Plus, Search, Calendar, MapPin,
  AlertTriangle, X, Camera,
  Send, Pencil, Trash2, Tag,
  Wrench, MessageSquare, CheckCircle2,
} from 'lucide-react';
import type { Jurnal, KategoriJurnal } from '@/lib/types';
import SearchableSelect from '@/components/ui/SearchableSelect';
import GPSMap, { type LokasiPKL } from '@/components/ui/GPSMap';

type FilterStatus = 'all' | 'verified' | 'pending' | 'revision' | 'draft';

export default function JurnalPage() {
  const [user, setUser] = useState(getUser());
  const isPlaced = user?.siswa?.status === 'sudah_ditempatkan' || user?.siswa?.status === 'selesai_pkl';

  const [jurnals, setJurnals] = useState<Jurnal[]>([]);
  const [kategoris, setKategoris] = useState<KategoriJurnal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Jurnal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const { toast, showToast } = useToast();

  const [lokasiData, setLokasiData] = useState<LokasiPKL | null>(null);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [inArea, setInArea] = useState(true);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  // Stabilkan callback untuk mencegah looping GPS
  const handlePositionUpdate = useCallback((pos: { lat: number; lon: number } | null) => {
    setLiveCoords(pos);
  }, []);

  const handleStatusChange = useCallback((inArea: boolean, dist: number | null) => {
    setInArea(inArea);
    setCurrentDistance(dist);
  }, []);

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';

  const [form, setForm] = useState({
    judul_kegiatan: '',
    deskripsi_pekerjaan: '',
    alat_bahan: '',
    kategori_jurnal_id: 1,
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const fetchJurnals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jurnalApi.list();
      const rawData = res.data.data;
      setJurnals(Array.isArray(rawData) ? rawData : (rawData as any).data || []);
    } catch {
      showToast('Gagal memuat jurnal.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const checkTodaySubmission = useCallback((data: Jurnal[]) => {
    const today = new Date().toISOString().split('T')[0];
    const exists = data.some(j => j.created_at.split('T')[0] === today);
    setHasSubmittedToday(exists);
  }, []);

  const fetchKategoris = useCallback(async () => {
    try {
      const res = await kategoriJurnalApi.list();
      setKategoris(res.data.data);
    } catch {}
  }, []);

  const fetchLokasi = useCallback(async () => {
    try {
      const res = await monitoringApi.lokasiPKL();
      setLokasiData(res.data.data);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch lokasi:', err);
    }
  }, []);

  useEffect(() => {
    if (isPlaced) {
      fetchJurnals();
      fetchKategoris();
      fetchLokasi();
    }
    const interval = setInterval(() => {
      const latest = getUser();
      if (JSON.stringify(latest) !== JSON.stringify(user)) setUser(latest);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaced, fetchJurnals, fetchKategoris, fetchLokasi, user]);

  useEffect(() => {
    checkTodaySubmission(jurnals);
  }, [jurnals, checkTodaySubmission]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran foto maksimal 5MB.', 'error');
        return;
      }
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitJurnal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul_kegiatan || !form.deskripsi_pekerjaan) {
      showToast('Judul dan deskripsi wajib diisi.', 'error'); return;
    }

    // Check GPS for non-WFH categories
    const selectedKategori = kategoris.find(k => k.id === form.kategori_jurnal_id);
    const isExempt = selectedKategori?.nama_kategori?.toLowerCase().match(/wfh|home|ijin|sakit|kunjungan|studi/);

    if (!isExempt && lokasiData?.has_gps && !inArea) {
      showToast(`Anda berada di luar area industri (${currentDistance}m). Gunakan kategori WFH jika diizinkan.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('judul_kegiatan', form.judul_kegiatan);
      fd.append('deskripsi_pekerjaan', form.deskripsi_pekerjaan);
      fd.append('alat_bahan', form.alat_bahan);
      fd.append('kategori_jurnal_id', String(form.kategori_jurnal_id));
      if (user?.siswa?.id) fd.append('siswa_id', String(user.siswa.id));
      if (!editItem) fd.append('status', 'pending');
      if (fotoFile) fd.append('foto_kegiatan', fotoFile);
      
      // Gunakan live coords dari map jika tersedia
      if (liveCoords) {
        fd.append('latitude', String(liveCoords.lat));
        fd.append('longitude', String(liveCoords.lon));
      }

      if (editItem) { await jurnalApi.update(editItem.id, fd); showToast('Jurnal diperbarui!', 'success'); }
      else { await jurnalApi.create(fd); showToast('Jurnal berhasil dikirim!', 'success'); }

      resetForm(); fetchJurnals();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan jurnal.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ judul_kegiatan: '', deskripsi_pekerjaan: '', alat_bahan: '', kategori_jurnal_id: 1 });
    setFotoFile(null); setFotoPreview(null); setEditItem(null); setIsModalOpen(false);
  };

  const openEditModal = (item: Jurnal) => {
    setEditItem(item);
    setForm({
      judul_kegiatan: item.judul_kegiatan,
      deskripsi_pekerjaan: item.deskripsi_pekerjaan,
      alat_bahan: item.alat_bahan || '',
      kategori_jurnal_id: item.kategori_jurnal_id,
    });
    setFotoPreview(item.foto_kegiatan || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus jurnal ini?')) return;
    try { await jurnalApi.delete(id); showToast('Jurnal dihapus.', 'success'); fetchJurnals(); }
    catch { showToast('Gagal menghapus jurnal.', 'error'); }
  };

  const getImgUrl = (path: string) =>
    path?.startsWith('http') ? path : `${BASE_URL}/storage/${path}`;

  const filteredJurnals = jurnals
    .filter(j => filterStatus === 'all' || j.status === filterStatus)
    .filter(j => !search || j.judul_kegiatan.toLowerCase().includes(search.toLowerCase()));

  if (!isPlaced) {
    return (
      <div className="min-h-screen">
        {toast}
        <TopBar title="Jurnal Harian" subtitle="Akses dibatasi" />
        <div className="page-container py-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-6 border border-amber-100">
            <AlertTriangle size={36}/>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Belum Aktif PKL</h2>
          <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
            Jurnal hanya dapat diisi setelah Anda mendapatkan penempatan PKL. Lakukan pengajuan terlebih dahulu.
          </p>
          <Link to="/pengajuan-pkl" className="btn btn-primary gap-2">
            <Send size={16}/> Ke Pengajuan PKL
          </Link>
        </div>
      </div>
    );
  }

  const statFilters: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'Semua', count: jurnals.length, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'verified', label: 'Disetujui', count: jurnals.filter(j => j.status === 'verified').length, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'pending', label: 'Menunggu', count: jurnals.filter(j => j.status === 'pending').length, color: 'text-amber-600 bg-amber-50' },
    { key: 'revision', label: 'Revisi', count: jurnals.filter(j => j.status === 'revision').length, color: 'text-red-600 bg-red-50' },
    { key: 'draft', label: 'Draft', count: jurnals.filter(j => j.status === 'draft').length, color: 'text-slate-500 bg-slate-100' },
  ];

  const selectedKategori = kategoris.find(k => k.id === form.kategori_jurnal_id);
  const isGpsExempt = selectedKategori?.nama_kategori?.toLowerCase().match(/wfh|home|ijin|sakit|kunjungan|studi/);

  // Perbaikan Logika Submit (Soft Validation)
  const canSubmit = () => {
    if (submitting) return false;
    // Jika kategori WFH/Ijin, bebas kirim
    if (isGpsExempt) return true;
    // Jika GPS berhasil (ada koordinat) tapi di luar area, BARU kita blokir
    if (lokasiData?.has_gps && liveCoords && !inArea) return false;
    // Selain itu (GPS loading, GPS error, atau GPS OK & in area), izinkan kirim
    return true;
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Jurnal Harian PKL | GRIDAS SAKTI</title>
        <meta name="description" content="Catat dan kelola aktivitas harian Praktek Kerja Lapangan (PKL) dengan verifikasi GPS di SMKN 2 Sumedang." />
      </Helmet>
      {toast}
      <TopBar
        title="Jurnal Harian"
        subtitle="Catat aktivitas PKL setiap hari"
        rightAction={
          <button
            onClick={() => {
              if (hasSubmittedToday) {
                showToast('Anda sudah mengirim jurnal untuk hari ini.', 'warning');
                return;
              }
              setIsModalOpen(true);
            }}
            disabled={hasSubmittedToday}
            className={`btn btn-sm gap-1 ${hasSubmittedToday ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'btn-primary'}`}
          >
            <Plus size={15}/> <span className="hidden sm:inline">{hasSubmittedToday ? 'Sudah Diisi' : 'Buat Jurnal'}</span>
          </button>
        }
      />

      <div className="page-container py-5">

        {/* Stat cards horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
          {statFilters.map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all ${
                filterStatus === s.key
                  ? `border-current ${s.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              <span className={`text-2xl font-black leading-none ${filterStatus === s.key ? '' : 'text-slate-700'}`}>{s.count}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            type="text"
            placeholder="Cari judul kegiatan..."
            className="form-input pl-11"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? <SkeletonList count={4}/> : (
          <div className="space-y-3">
            {filteredJurnals.length > 0 ? filteredJurnals.map((j, idx) => (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card group"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0 overflow-hidden">
                    {j.foto_kegiatan
                      ? <img src={getImgUrl(j.foto_kegiatan)} alt="Foto" className="w-full h-full object-cover"/>
                      : <BookOpen size={22}/>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate mb-0.5">{j.judul_kegiatan}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{j.deskripsi_pekerjaan}</p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getJurnalBadgeVariant(j.status)}>{getJurnalStatusLabel(j.status)}</Badge>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={10}/>
                        {new Date(j.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {j.latitude && (
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                          <MapPin size={10}/> GPS
                        </span>
                      )}
                      {j.kategori && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Tag size={10}/> {j.kategori.nama_kategori}
                        </span>
                      )}
                    </div>

                    {/* Revision notes */}
                    {(j.catatan_pembimbing || j.catatan_guru) && (
                      <div className="mt-2 space-y-1.5">
                        {j.catatan_pembimbing && (
                          <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-1.5">
                            <MessageSquare size={11} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                            <p className="text-[11px] text-amber-800 leading-snug">
                              <span className="font-bold">Pembimbing:</span> {j.catatan_pembimbing}
                            </p>
                          </div>
                        )}
                        {j.catatan_guru && (
                          <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-1.5">
                            <MessageSquare size={11} className="text-indigo-500 flex-shrink-0 mt-0.5"/>
                            <p className="text-[11px] text-indigo-800 leading-snug">
                              <span className="font-bold">Guru:</span> {j.catatan_guru}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {(j.status === 'draft' || j.status === 'revision' || j.status === 'pending') && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(j)}
                        className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                      >
                        <Pencil size={14}/>
                      </button>
                      <button
                        onClick={() => handleDelete(j.id)}
                        className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )) : (
              <div className="card border-dashed text-center py-12">
                <BookOpen size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="font-semibold text-slate-500 mb-4">
                  {search ? 'Tidak ada jurnal yang cocok' : 'Belum ada catatan jurnal'}
                </p>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm gap-1">
                  <Plus size={14}/> Buat Jurnal Pertama
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Buat/Edit Jurnal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={resetForm}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-white w-full sm:max-w-4xl rounded-t-[32px] sm:rounded-[32px] overflow-hidden max-h-[96dvh] flex flex-col shadow-2xl"
            >
              {/* Modal Header (Minimalist) */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white flex-shrink-0">
                    <BookOpen size={24}/>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{editItem ? 'EDIT JURNAL' : 'LOG AKTIVITAS'}</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Sistem Verifikasi Lokasi v2.0</p>
                  </div>
                </div>
                <button onClick={resetForm}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300">
                  <X size={20}/>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col md:flex-row h-full divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  
                  {/* Left Column: Technical Context (Map & Rules) */}
                  <div className="w-full md:w-[380px] p-8 bg-slate-50/80 flex-shrink-0 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Verification Map</h4>
                      <div className="rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                        {lokasiData ? (
                          <GPSMap 
                            lokasiPKL={lokasiData} 
                            onPositionUpdate={handlePositionUpdate}
                            onStatusChange={handleStatusChange}
                          />
                        ) : (
                          <div className="h-48 bg-slate-200 animate-pulse flex items-center justify-center text-slate-400 text-xs font-bold tracking-widest">
                            INITIALIZING...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Protocol</h4>
                      <div className="p-5 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <MapPin size={14}/>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                            Verifikasi GPS dilakukan secara real-time. Pastikan Anda berada dalam radius <span className="text-slate-900 font-bold">150m</span>.
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <CheckCircle2 size={14}/>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                            Jurnal dengan status <span className="text-emerald-600 font-bold">Terverifikasi</span> akan diprioritaskan oleh pembimbing.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Form Action */}
                  <div className="flex-1 p-8 space-y-6">
                    <form onSubmit={handleSubmitJurnal} id="jurnal-form" className="space-y-6">
                      <div className="grid grid-cols-1 gap-6">
                        {/* Kategori */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Category</label>
                          <SearchableSelect
                            placeholder="Select Category..."
                            options={kategoris.map(k => ({ value: k.id, label: k.nama_kategori }))}
                            value={form.kategori_jurnal_id ? { 
                              value: form.kategori_jurnal_id, 
                              label: kategoris.find(k => k.id === form.kategori_jurnal_id)?.nama_kategori || 'Select Category'
                            } : null}
                            onChange={(opt: any) => setForm({ ...form, kategori_jurnal_id: opt?.value })}
                          />
                        </div>

                        {/* Judul */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Title</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Infrastructure Deployment"
                            className="form-input !bg-slate-50 !border-transparent focus:!bg-white focus:!border-indigo-500 py-3 px-4 font-bold text-slate-800 placeholder:font-normal"
                            value={form.judul_kegiatan}
                            onChange={e => setForm({ ...form, judul_kegiatan: e.target.value })}
                          />
                        </div>

                        {/* Deskripsi */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Execution Details</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Describe your technical steps..."
                            className="form-input !bg-slate-50 !border-transparent focus:!bg-white focus:!border-indigo-500 py-3 px-4 resize-none leading-relaxed"
                            value={form.deskripsi_pekerjaan}
                            onChange={e => setForm({ ...form, deskripsi_pekerjaan: e.target.value })}
                          />
                        </div>

                        {/* Row: Alat & Bahan + Foto */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resources Used</label>
                            <input
                              type="text"
                              placeholder="e.g. VS Code, Server"
                              className="form-input !bg-slate-50 !border-transparent py-3 px-4 text-xs font-medium"
                              value={form.alat_bahan}
                              onChange={e => setForm({ ...form, alat_bahan: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visual Evidence</label>
                            {fotoPreview ? (
                              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100 group">
                                <img
                                  src={fotoPreview.startsWith('blob') ? fotoPreview : getImgUrl(fotoPreview)}
                                  alt="Preview"
                                  className="w-full h-24 object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                                  className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                            ) : (
                              <label className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                                <Camera size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors"/>
                                <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 mt-2 tracking-widest uppercase">UPLOAD PHOTO</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFotoChange}/>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Action Bar) */}
              <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 bg-white flex-shrink-0">
                <div className="hidden sm:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submission Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${!canSubmit() ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}/>
                    <p className="text-xs font-bold text-slate-700">{!canSubmit() ? 'OUTSIDE RADIUS' : 'READY TO SUBMIT'}</p>
                  </div>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                  <button type="button" onClick={resetForm} className="btn !bg-slate-100 !text-slate-600 border-none px-8">CANCEL</button>
                  <button
                    type="submit"
                    form="jurnal-form"
                    disabled={!canSubmit()}
                    className={`btn !bg-slate-900 !text-white px-10 shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] ${!canSubmit() ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  >
                    {submitting
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> WORKING...</>
                      : <><Send size={15} className="mr-1"/> {editItem ? 'UPDATE LOG' : 'SUBMIT JURNAL'}</>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
