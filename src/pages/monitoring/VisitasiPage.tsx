/**
 * pages/monitoring/VisitasiPage.tsx
 * Halaman Monitoring Visitasi (Guru & Admin).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { visitasiApi, userApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { 
  MapPin, Calendar, Plus, Search, Camera, X, Save, 
  Trash2, Edit2, User, FileText, ChevronRight, Building, AlertCircle
} from 'lucide-react';
import type { Visitasi, User as UserType, Industri } from '@/lib/types';
import { getUser } from '@/lib/auth';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { industriApi } from '@/lib/api';

export default function VisitasiPage() {
  const currentUser = useMemo(() => getUser(), []);
  const [visitasis, setVisitasis] = useState<Visitasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage] = useState(10);

  // Form State
  const [editItem, setEditItem] = useState<Visitasi | null>(null);
  const [industris, setIndustris] = useState<Industri[]>([]);
  const [allGurus, setAllGurus] = useState<UserType[]>([]);
  const [form, setForm] = useState({
    industri_id: '',
    guru_id: '',
    tanggal_visitasi: new Date().toISOString().split('T')[0],
    catatan: '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const fetchVisitasis = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await visitasiApi.list({
        page,
        per_page: perPage,
        search: search
      });
      const paginatedData = res.data.data as any;
      setVisitasis(paginatedData.data || []);
      setCurrentPage(paginatedData.current_page || 1);
      setLastPage(paginatedData.last_page || 1);
      setTotalData(paginatedData.total || 0);
    } catch (err) {
      showToast('Gagal memuat data visitasi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, perPage, search]);

  const fetchIndustris = useCallback(async () => {
    try {
      const res = await industriApi.list();
      const raw = res.data.data;
      setIndustris(Array.isArray(raw) ? raw : (raw as any).data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch industris');
    }
  }, []);

  const fetchGurus = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await userApi.list({ per_page: 1000 });
      const raw = res.data.data;
      const users = Array.isArray(raw) ? raw : (raw as any).data || [];
      setAllGurus(users.filter((u: UserType) => u.role === 'guru' && u.guru));
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch gurus');
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisitasis(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchIndustris();
    fetchGurus();
  }, [fetchIndustris, fetchGurus]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob')) return path;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/storage/${path}`;
  };

  const resetForm = () => {
    setForm({
      industri_id: '',
      guru_id: '',
      tanggal_visitasi: new Date().toISOString().split('T')[0],
      catatan: '',
    });
    setFotoFile(null);
    setFotoPreview(null);
    setEditItem(null);
    setIsModalOpen(false);
  };

  const openEditModal = (item: Visitasi) => {
    setEditItem(item);
    setForm({
      industri_id: String(item.industri_id),
      guru_id: String(item.guru_id),
      tanggal_visitasi: item.tanggal_visitasi,
      catatan: item.catatan,
    });
    setFotoPreview(item.dokumentasi_foto || null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.industri_id) {
      showToast('Harap pilih industri.', 'warning');
      return;
    }
    
    const finalGuruId = currentUser?.role === 'admin' ? form.guru_id : currentUser?.guru?.id;
    if (!finalGuruId) {
      showToast('Harap pilih guru pembimbing.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('industri_id', form.industri_id);
      formData.append('guru_id', String(finalGuruId));
      formData.append('tanggal_visitasi', form.tanggal_visitasi);
      formData.append('catatan', form.catatan);
      if (fotoFile) formData.append('dokumentasi_foto', fotoFile);

      if (editItem) {
        await visitasiApi.update(editItem.id, formData);
        showToast('Data visitasi diperbarui.', 'success');
      } else {
        await visitasiApi.create(formData);
        showToast('Visitasi berhasil dicatat.', 'success');
      }
      resetForm();
      fetchVisitasis(currentPage);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan visitasi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus data visitasi ini?')) return;
    try {
      await visitasiApi.delete(id);
      showToast('Data visitasi telah dihapus.', 'success');
      fetchVisitasis(currentPage);
    } catch {
      showToast('Gagal menghapus data.', 'error');
    }
  };

  const filteredVisitasis = visitasis;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {toast}
      <TopBar title="Monitoring Visitasi" subtitle="Kelola catatan kunjungan guru pembimbing ke lokasi PKL" />

      <div className="page-container py-6">
        
        {/* ── Action Bar ── */}
        <div className="flex flex-col md:flex-row gap-5 justify-between items-center mb-10">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Cari industri, guru, atau isi catatan..." 
              className="form-input pl-16 py-5 rounded-3xl bg-white border-slate-100 shadow-xl shadow-slate-200/20 text-lg focus:ring-blue-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(currentUser?.role === 'admin' || currentUser?.role === 'guru') && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary w-full md:w-auto py-5 px-10 rounded-3xl shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3 font-black text-lg"
            >
              <Plus size={24} /> Catat Kunjungan
            </button>
          )}
        </div>

        {/* ── Visitasi List ── */}
        {loading ? <SkeletonList count={4} /> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredVisitasis.length > 0 ? filteredVisitasis.map((v, idx) => (
              <motion.div 
                key={v.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card group hover:border-blue-400 transition-all p-0 overflow-hidden bg-white shadow-xl shadow-slate-200/30 flex flex-col sm:flex-row h-full"
              >
                <div className="w-full sm:w-48 lg:w-56 bg-slate-100 relative overflow-hidden flex-shrink-0">
                  {v.dokumentasi_foto ? (
                    <img src={getImageUrl(v.dokumentasi_foto)} alt="Visitasi" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Camera size={48} className="mb-2 opacity-50" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-slate-800 shadow-sm flex items-center gap-1">
                    <Calendar size={12} className="text-blue-600" />
                    {new Date(v.tanggal_visitasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                
                <div className="flex-1 p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-800 text-xl leading-tight truncate mb-2">{v.industri?.nama_industri || 'Industri'}</h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                          <User size={14} className="text-blue-500" />
                          <span>Pembimbing: <span className="text-slate-600">{v.guru?.name || '-'}</span></span>
                        </div>
                        {v.industri?.alamat_lengkap && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <MapPin size={14} className="text-amber-500" />
                            <span className="truncate">Lokasi: <span className="text-slate-600">{v.industri?.alamat_lengkap}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'guru') && (
                      <div className="flex gap-2 ml-4">
                        <button onClick={() => openEditModal(v)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(v.id)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"><Trash2 size={18} /></button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                        "{v.catatan}"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-32 text-center card border-dashed border-slate-200">
                <MapPin size={64} className="mx-auto text-slate-100 mb-6" />
                <h3 className="text-xl font-black text-slate-800 mb-2">Belum ada data visitasi</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto">Mulai catat hasil kunjungan monitoring Anda ke lokasi PKL siswa.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && lastPage > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
            <p className="text-xs font-bold text-slate-400">
              Hal <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{lastPage}</span> 
              <span className="mx-2">•</span> 
              Total <span className="text-indigo-600">{totalData}</span> Kunjungan
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => fetchVisitasis(currentPage - 1)}
                className="btn btn-secondary btn-sm px-3 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button 
                disabled={currentPage === lastPage}
                onClick={() => fetchVisitasis(currentPage + 1)}
                className="btn btn-primary btn-sm px-3 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Visitasi ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={resetForm} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl p-10 md:p-12 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[24px] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
                    <Camera size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editItem ? 'Edit' : 'Catat'} Visitasi</h3>
                    <p className="text-slate-500 font-medium">Lengkapi laporan kunjungan industri Anda.</p>
                  </div>
                </div>
                <button onClick={resetForm} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"><X size={28} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className={currentUser?.role === 'admin' ? 'md:col-span-2' : ''}>
                    <SearchableSelect 
                      label="Industri yang Dikunjungi"
                      placeholder="Pilih Industri..."
                      options={industris.map(i => ({ value: i.id, label: i.nama_industri }))}
                      value={form.industri_id ? { 
                        value: form.industri_id, 
                        label: industris.find(i => i.id === Number(form.industri_id))?.nama_industri 
                      } : null}
                      onChange={(opt: any) => setForm({...form, industri_id: opt?.value})}
                    />
                  </div>
                  {currentUser?.role === 'admin' && (
                    <div className="md:col-span-2">
                      <SearchableSelect 
                        label="Guru Pembimbing *"
                        placeholder="Pilih Guru..."
                        options={allGurus.map(g => ({ value: g.guru?.id, label: g.name }))}
                        value={form.guru_id ? { 
                          value: form.guru_id, 
                          label: allGurus.find(g => g.guru?.id === Number(form.guru_id))?.name 
                        } : null}
                        onChange={(opt: any) => setForm({...form, guru_id: opt?.value})}
                      />
                    </div>
                  )}
                  <div className={currentUser?.role === 'admin' ? 'md:col-span-2' : ''}>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Tanggal Kunjungan</label>
                    <input type="date" required value={form.tanggal_visitasi} onChange={e => setForm({...form, tanggal_visitasi: e.target.value})} className="form-input py-4 rounded-2xl bg-slate-50 border-slate-100" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Hasil Monitoring / Catatan</label>
                  <textarea 
                    required 
                    rows={4} 
                    placeholder="Tuliskan temuan atau hasil diskusi saat kunjungan industri..." 
                    className="form-input py-5 px-6 rounded-[24px] bg-slate-50 border-slate-100 resize-none text-sm font-medium leading-relaxed"
                    value={form.catatan}
                    onChange={e => setForm({...form, catatan: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Dokumentasi Foto</label>
                  {fotoPreview ? (
                    <div className="relative rounded-[32px] overflow-hidden group border-4 border-slate-50 shadow-inner">
                      <img src={getImageUrl(fotoPreview)} alt="Preview" className="w-full h-56 object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                        className="absolute top-5 right-5 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                      <Camera size={48} className="text-slate-200 mb-4 group-hover:text-blue-400 transition-colors" />
                      <span className="text-sm font-black text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest">Unggah Dokumentasi</span>
                      <span className="text-xs text-slate-300 mt-2">Format JPG, PNG — Maks 5MB</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFotoChange} />
                    </label>
                  )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-slate-100">
                  <button type="button" onClick={resetForm} className="flex-1 btn btn-secondary py-5 rounded-[24px] font-black text-sm uppercase tracking-widest">Batal</button>
                  <button type="submit" disabled={submitting} className="flex-[2] btn btn-primary py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/20 flex items-center justify-center gap-3">
                    {submitting ? (
                      <span className="animate-pulse">Menyimpan...</span>
                    ) : (
                      <><Save size={20} /> Simpan Catatan</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
