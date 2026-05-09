/**
 * pages/admin/PeriodePKLPage.tsx
 * Halaman Penempatan/Plotting Siswa PKL (Admin).
 * Fitur: List Penempatan, Plotting Baru, Edit & Hapus.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { periodePklApi, userApi, industriApi, tahunAjarApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import Badge from '@/components/ui/Badge';
import { Briefcase, Search, Plus, GraduationCap, Building, User, Calendar, Download, X, Save, Trash2, Edit2, CheckSquare, Square, Users } from 'lucide-react';
import type { PeriodePkl, User as UserType, Industri, TahunAjar } from '@/lib/types';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function PeriodePKLPage() {
  const [periodes, setPeriodes] = useState<PeriodePkl[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  // Reference Data
  const [siswas, setSiswas] = useState<UserType[]>([]);
  const [gurus, setGurus] = useState<UserType[]>([]);
  const [pembimbings, setPembimbings] = useState<UserType[]>([]);
  const [industris, setIndustris] = useState<Industri[]>([]);
  const [tahuns, setTahuns] = useState<TahunAjar[]>([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIndustriId, setFilterIndustriId] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PeriodePkl | null>(null);
  const [formData, setFormData] = useState<any>({ status: 'active' });
  
  // Bulk State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState<any>({});
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const fetchPeriodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await periodePklApi.list();

      const rawData = res.data.data as any;
      
      let items = [];
      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (rawData && Array.isArray(rawData.data)) {
        items = rawData.data;
      }
      
      setPeriodes(items);
    } catch (err) {
      showToast('Gagal memuat data penempatan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [uRes, iRes, tRes] = await Promise.all([
        userApi.list({ per_page: 1000 }),
        industriApi.list({ per_page: 1000 }),
        tahunAjarApi.list()
      ]);
      const allUsers = Array.isArray(uRes.data.data) ? uRes.data.data : (uRes.data.data as any).data || [];
      setSiswas(allUsers.filter((u: UserType) => u.role === 'siswa'));
      setGurus(allUsers.filter((u: UserType) => u.role === 'guru'));
      setPembimbings(allUsers.filter((u: UserType) => u.role === 'pembimbing'));
      setIndustris(Array.isArray(iRes.data.data) ? iRes.data.data : (iRes.data.data as any).data || []);
      setTahuns(Array.isArray(tRes.data.data) ? tRes.data.data : (tRes.data.data as any).data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch reference data');
    }
  }, []);

  useEffect(() => {
    fetchPeriodes();
    fetchReferenceData();
  }, [fetchPeriodes, fetchReferenceData]);

  const openModal = (item: PeriodePkl | null = null) => {
    setEditItem(item);
    if (item) {
      setFormData({
        siswa_id: item.siswa_id,
        industri_id: item.industri_id,
        guru_id: item.guru_id,
        tahun_ajaran_id: item.tahun_ajaran_id,
        pembimbing_id: item.pembimbing_id,
        tanggal_mulai: item.tanggal_mulai ? item.tanggal_mulai.split('T')[0].split(' ')[0] : '',
        tanggal_selesai: item.tanggal_selesai ? item.tanggal_selesai.split('T')[0].split(' ')[0] : '',
        status: item.status || 'active'
      });
    } else {
      let activeYearId = localStorage.getItem('active_tahun_ajaran_id');
      
      // Fallback: Cari tahun yang is_active === 1 dari daftar tahuns
      if (!activeYearId && tahuns.length > 0) {
        const activeTahun = tahuns.find(t => t.is_active === 1);
        if (activeTahun) activeYearId = activeTahun.id.toString();
      }

      setFormData({ 
        status: 'active', 
        tanggal_mulai: '', 
        tanggal_selesai: '', 
        siswa_id: '', 
        industri_id: '', 
        guru_id: '', 
        tahun_ajaran_id: activeYearId ? Number(activeYearId) : '', 
        pembimbing_id: '' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
    setFormData({ status: 'active' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tahun_ajaran_id) {
      showToast('Tahun Ajaran aktif tidak terdeteksi. Pastikan ada tahun ajaran yang aktif di sistem.', 'error');
      return;
    }
    try {
      if (editItem) {
        await periodePklApi.update(editItem.id, formData);
        showToast('Penempatan diperbarui.', 'success');
      } else {
        await periodePklApi.create(formData);
        showToast('Penempatan berhasil dibuat.', 'success');
      }
      closeModal();
      fetchPeriodes();
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstError = Object.values(errors)[0] as string[];
        showToast(firstError[0] || 'Validasi gagal.', 'error');
      } else {
        showToast(err?.response?.data?.message || 'Gagal menyimpan penempatan.', 'error');
      }
    }
  };



  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPeriodes.length && filteredPeriodes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPeriodes.map(p => p.id));
    }
  };

  const filteredPeriodes = periodes.filter(p => {
    const searchLower = searchQuery.trim().toLowerCase();
    const matchesSearch = !searchLower || 
      (p.siswa?.user?.name || '').toLowerCase().includes(searchLower) ||
      (p.industri?.nama_industri || '').toLowerCase().includes(searchLower) ||
      (p.siswa?.nisn || '').toLowerCase().includes(searchLower);
      
    const matchesIndustri = !filterIndustriId || p.industri_id?.toString() === filterIndustriId;
    return matchesSearch && matchesIndustri;
  });

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setSubmittingBulk(true);
    try {
      await periodePklApi.bulkUpdate(selectedIds, bulkData);
      showToast(`${selectedIds.length} penempatan berhasil diperbarui.`, 'success');
      setIsBulkModalOpen(false);
      setSelectedIds([]);
      setBulkData({});
      fetchPeriodes();
    } catch (err) {
      showToast('Gagal memperbarui data secara massal.', 'error');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus penempatan ini?')) return;
    try {
      await periodePklApi.delete(id);
      showToast('Penempatan dihapus.', 'success');
      fetchPeriodes();
    } catch (err) {
      showToast('Gagal menghapus data.', 'error');
    }
  };

  const handleExport = async () => {
    try {
      showToast('Menyiapkan file export...', 'info');
      const res = await periodePklApi.exportExcel();
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data_penempatan_pkl_${new Date().toLocaleDateString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Gagal mengekspor data.', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Penempatan PKL | GRIDAS SAKTI</title>
        <meta name="description" content="Kelola distribusi dan plotting siswa PKL ke berbagai industri mitra SMKN 2 Sumedang." />
      </Helmet>
      {toast}
      <TopBar title="Penempatan PKL" subtitle="Kelola distribusi siswa di berbagai industri" />

      <div className="page-container py-6">
        
        {/* ── Action Bar ── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-10">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari siswa atau industri..." 
              className="form-input pl-14 py-4 rounded-2xl bg-white border-slate-100 shadow-sm focus:ring-blue-100 w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="w-full sm:w-72">
              <SearchableSelect 
                placeholder="Semua Industri"
                options={[{ value: '', label: 'Semua Industri' }, ...industris.map(i => ({ value: i.id.toString(), label: i.nama_industri }))]}
                value={filterIndustriId ? { 
                  value: filterIndustriId, 
                  label: industris.find(i => i.id.toString() === filterIndustriId)?.nama_industri || 'Semua Industri'
                } : { value: '', label: 'Semua Industri' }}
                onChange={(opt: any) => setFilterIndustriId(opt?.value || '')}
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleExport}
                className="btn btn-secondary py-4 px-6 rounded-2xl flex items-center justify-center gap-2 flex-1 sm:flex-none"
              >
                <Download size={18} /> <span className="sm:hidden xl:inline">Export</span>
              </button>
              <button onClick={() => openModal()} className="btn btn-primary py-4 px-8 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-2 flex-[2] sm:flex-none whitespace-nowrap">
                <Plus size={20} /> Plotting Baru
              </button>
            </div>
          </div>
        </div>

        {/* ── Selection Control ── */}
        <div className="mb-4 flex items-center gap-4">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm"
          >
            {selectedIds.length === filteredPeriodes.length && filteredPeriodes.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
            {selectedIds.length === filteredPeriodes.length && filteredPeriodes.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua Terfilter'}
          </button>
          {selectedIds.length > 0 && (
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {selectedIds.length} terpilih
            </span>
          )}
        </div>

        {/* ── Bulk Action Bar ── */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-[28px] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center font-black">
                  {selectedIds.length}
                </div>
                <p className="text-sm font-bold">Siswa dipilih</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 text-sm font-black hover:text-blue-400 transition-colors">
                <Users size={18} /> Plotting Massal
              </button>
              <button onClick={() => setSelectedIds([])} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Batal
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Plotting List ── */}
        {loading ? <SkeletonList count={6} /> : (
          <div className="grid grid-cols-1 gap-4">
            {filteredPeriodes.length > 0 ? filteredPeriodes.map((p, idx) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="card flex flex-col md:flex-row gap-6 hover:border-blue-200 transition-all p-6 group"
              >
                {/* Selection Checkbox */}
                <div className="flex items-center md:pt-0 pt-2">
                  <button onClick={() => toggleSelect(p.id)} className={`p-2 rounded-xl transition-all ${selectedIds.includes(p.id) ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                    {selectedIds.includes(p.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                  </button>
                </div>

                {/* Siswa Info */}
                <div className="flex-1 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                    <GraduationCap size={28} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-lg leading-tight truncate">
                      {p.siswa?.user?.name || 'Siswa'}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">
                      NISN: {p.siswa?.nisn || '-'} • {p.siswa?.kelas?.nama_kelas || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Industri & Pembimbing */}
                <div className="flex-[1.5] grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <Building size={20} className="text-blue-500" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Industri</p>
                      <p className="text-sm font-bold truncate text-slate-700">{p.industri?.nama_industri || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <User size={20} className="text-emerald-500" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Pembimbing Sekolah</p>
                      <p className="text-sm font-bold truncate text-slate-700">{p.guru?.user?.name || 'Belum diatur'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <Building size={20} className="text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Pembimbing Industri</p>
                      <p className="text-sm font-bold truncate text-slate-700">{p.pembimbing?.user?.name || 'Belum diatur'}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 min-w-[120px]">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 justify-end">
                      <Calendar size={12}/> {new Date(p.tanggal_mulai).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </div>
                    <Badge variant={p.status === 'active' ? 'success' : 'gray'} className="px-3 py-1 text-[10px]">
                      {p.status === 'active' ? 'Aktif' : 'Selesai'}
                    </Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(p)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-32 text-center card border-dashed border-slate-200">
                <Briefcase size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Belum ada data penempatan siswa.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Plotting Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 md:p-10"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{editItem ? 'Edit' : 'Plotting'} Penempatan</h3>
                  <p className="text-slate-500 text-sm">Hubungkan siswa dengan industri dan pembimbing.</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SearchableSelect 
                      label="Siswa Peserta"
                      placeholder="Pilih atau cari siswa..."
                      isDisabled={!!editItem}
                      options={siswas
                        .filter(s => {
                          if (editItem && s.siswa?.id == editItem.siswa_id) return true;
                          return s.siswa?.status === 'belum_ditempatkan';
                        })
                        .map(s => ({ value: s.siswa?.id, label: `${s.name} (${s.siswa?.nisn})` }))
                      }
                      value={formData.siswa_id ? { 
                        value: formData.siswa_id, 
                        label: siswas.find(s => s.siswa?.id == formData.siswa_id)?.name 
                      } : null}
                      onChange={(opt: any) => setFormData({...formData, siswa_id: opt?.value})}
                    />
                    {editItem && <p className="text-[10px] text-slate-400 mt-1 font-medium">* Nama siswa tidak dapat diubah saat edit penempatan</p>}
                  </div>
                  <div>
                    <SearchableSelect 
                      label="Industri Tujuan"
                      placeholder="Pilih atau cari industri..."
                      options={industris.map(i => ({ value: i.id, label: i.nama_industri }))}
                      value={formData.industri_id ? { 
                        value: formData.industri_id, 
                        label: industris.find(i => i.id == formData.industri_id)?.nama_industri 
                      } : null}
                      onChange={(opt: any) => setFormData({...formData, industri_id: opt?.value, pembimbing_id: ''})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SearchableSelect 
                      label="Pembimbing Sekolah"
                      placeholder="Pilih atau cari guru..."
                      options={gurus.map(g => ({ value: g.guru?.id, label: g.name }))}
                      value={formData.guru_id ? { 
                        value: formData.guru_id, 
                        label: gurus.find(g => g.guru?.id == formData.guru_id)?.name 
                      } : null}
                      onChange={(opt: any) => setFormData({...formData, guru_id: opt?.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Tahun Ajaran</label>
                    <div className="form-input bg-slate-50 text-slate-500 flex items-center h-[46px] font-medium">
                      {tahuns.find(t => t.id == formData.tahun_ajaran_id)?.tahun_ajaran || 'Tahun Aktif'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SearchableSelect 
                      label="Pembimbing Industri"
                      placeholder={formData.industri_id ? "Pilih atau cari pembimbing..." : "Pilih industri terlebih dahulu"}
                      isDisabled={!formData.industri_id}
                      options={pembimbings
                        .filter(p => !formData.industri_id || p.pembimbing?.industri_id === Number(formData.industri_id))
                        .map(p => ({ value: p.pembimbing?.id, label: p.name }))
                      }
                      value={formData.pembimbing_id ? { 
                        value: formData.pembimbing_id, 
                        label: pembimbings.find(p => p.pembimbing?.id == formData.pembimbing_id)?.name 
                      } : null}
                      onChange={(opt: any) => setFormData({...formData, pembimbing_id: opt?.value})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="form-input">
                      <option value="active">Aktif</option>
                      <option value="finished">Selesai</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Tanggal Mulai</label>
                    <input type="date" required value={formData.tanggal_mulai || ''} onChange={e => setFormData({...formData, tanggal_mulai: e.target.value})} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Tanggal Selesai</label>
                    <input type="date" required value={formData.tanggal_selesai || ''} onChange={e => setFormData({...formData, tanggal_selesai: e.target.value})} className="form-input" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                  <button type="submit" className="flex-[2] btn btn-primary py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                    <Save size={20} /> Simpan Plotting
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Bulk Plotting Modal ── */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 md:p-10"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Plotting Massal</h3>
                  <p className="text-slate-500 text-sm">Update {selectedIds.length} siswa terpilih sekaligus.</p>
                </div>
                <button onClick={() => setIsBulkModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
              </div>

              <form onSubmit={handleBulkSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Pembimbing Sekolah</label>
                    <SearchableSelect
                      label="Pembimbing Sekolah"
                      placeholder="Jangan Ubah"
                      options={[{ value: '', label: 'Jangan Ubah' }, ...gurus.map(g => ({ value: g.guru?.id, label: g.name }))]}
                      value={bulkData.guru_id ? { value: bulkData.guru_id, label: gurus.find(g => g.guru?.id == bulkData.guru_id)?.name } : null}
                      onChange={(opt: any) => setBulkData({...bulkData, guru_id: opt?.value || ''})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Pembimbing Industri</label>
                    <SearchableSelect
                      label="Pembimbing Industri"
                      placeholder="Jangan Ubah"
                      options={[
                        { value: '', label: 'Jangan Ubah' },
                        ...pembimbings
                          .filter(p => !filterIndustriId || p.pembimbing?.industri_id === Number(filterIndustriId))
                          .map(p => ({ value: p.pembimbing?.id, label: `${p.name} ${!filterIndustriId ? `(${p.pembimbing?.industri?.nama_industri})` : ''}`.trim() }))
                      ]}
                      value={bulkData.pembimbing_id ? { 
                        value: bulkData.pembimbing_id, 
                        label: pembimbings.find(p => p.pembimbing?.id == bulkData.pembimbing_id)?.name 
                      } : null}
                      onChange={(opt: any) => setBulkData({...bulkData, pembimbing_id: opt?.value || ''})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select value={bulkData.status || ''} onChange={e => setBulkData({...bulkData, status: e.target.value})} className="form-input">
                      <option value="">Jangan Ubah</option>
                      <option value="active">Aktif</option>
                      <option value="finished">Selesai</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Tanggal Mulai</label>
                    <input type="date" value={bulkData.tanggal_mulai || ''} onChange={e => setBulkData({...bulkData, tanggal_mulai: e.target.value})} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Tanggal Selesai</label>
                    <input type="date" value={bulkData.tanggal_selesai || ''} onChange={e => setBulkData({...bulkData, tanggal_selesai: e.target.value})} className="form-input" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsBulkModalOpen(false)} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                  <button type="submit" disabled={submittingBulk} className="flex-[2] btn btn-primary py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                    {submittingBulk ? 'Memproses...' : <><Save size={20} /> Update Massal</>}
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
