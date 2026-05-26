import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { pengajuanApi, industriApi, suratApi, periodePklApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import Badge from '@/components/ui/Badge';
import {
  CheckCircle2, XCircle, Clock, Building2, Search,
  CheckSquare, Square, FileText, X, Users,
  Pencil, Trash2,
} from 'lucide-react';
import type { PengajuanPkl, Industri } from '@/lib/types';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function AdminPengajuanPage() {
  const [pengajuans, setPengajuans] = useState<PengajuanPkl[]>([]);
  const [industris, setIndustris] = useState<Industri[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIndustri, setFilterIndustri] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage] = useState(15);
  
  // Stats state
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    on_site: 0,
    total: 0
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Modal states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [isBulkReject, setIsBulkReject] = useState(false);
  const [alasanReject, setAlasanReject] = useState('');
  
  const [isSuratModalOpen, setIsSuratModalOpen] = useState(false);
  const [suratForm, setSuratForm] = useState({
    nomor_surat: '',
    tanggal_surat: new Date().toISOString().split('T')[0],
    nama_penandatangan: 'Nama Kepala Sekolah/Hubin',
    nip_penandatangan: '123456789',
    jabatan_penandatangan: 'Wakasek Bidang Humas/Hubin',
    kop_sekolah: "PEMERINTAH DAERAH PROVINSI JAWA BARAT\nDINAS PENDIDIKAN\nSMK NEGERI 2 SUMEDANG\nJl. Paseh No. 70 Telp. (0261) 201089 Sumedang 45321"
  });

  // Approve Modal states
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveId, setApproveId] = useState<number | 'bulk' | null>(null);
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });

  // Edit Date Modal states
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [editingPengajuan, setEditingPengajuan] = useState<PengajuanPkl | null>(null);
  const [editTanggalMulai, setEditTanggalMulai] = useState('');
  const [editTanggalSelesai, setEditTanggalSelesai] = useState('');

  const { toast, showToast } = useToast();

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [resP, resI] = await Promise.all([
        pengajuanApi.listAll({
          page,
          per_page: perPage,
          search: search,
          industri_id: filterIndustri !== 'all' ? filterIndustri : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined
        }),
        industriApi.list()
      ]);
      const paginatedData = resP.data.data as any;
      const dataI = resI.data.data;
      setPengajuans(paginatedData.data || []);
      setCurrentPage(paginatedData.current_page || 1);
      setLastPage(paginatedData.last_page || 1);
      setTotalData(paginatedData.total || 0);
      setIndustris(Array.isArray(dataI) ? dataI : (dataI as any).data || []);
    } catch {
      showToast('Gagal memuat data pengajuan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, perPage, search, filterIndustri, filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await pengajuanApi.listAll({ per_page: 10000 });
      const raw = res.data.data;
      const allList = ((Array.isArray(raw) ? raw : (raw as any).data || []) as PengajuanPkl[]);
      setStats({
        pending: allList.filter(p => p.status === 'pending').length,
        approved: allList.filter(p => p.status === 'approved').length,
        on_site: allList.filter(p => p.status === 'on_site').length,
        total: allList.length
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filterIndustri, filterStatus]);

  const filtered = pengajuans;

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(f => f.id));
  };

  // Actions
  const openApproveModal = (id: number | 'bulk') => {
    setApproveId(id);
    setTanggalMulai(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setTanggalSelesai(d.toISOString().split('T')[0]);
    setIsApproveModalOpen(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveId) return;
    try {
      if (approveId === 'bulk') {
        const res = await pengajuanApi.bulkApprove(selectedIds, { tanggal_mulai: tanggalMulai, tanggal_selesai: tanggalSelesai });
        showToast(`${res.data.data.berhasil?.length || 0} pengajuan berhasil disetujui.`, 'success');
        setSelectedIds([]);
      } else {
        await pengajuanApi.approve(approveId, { tanggal_mulai: tanggalMulai, tanggal_selesai: tanggalSelesai });
        showToast('Pengajuan berhasil disetujui.', 'success');
      }
      setIsApproveModalOpen(false);
      fetchData(currentPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyetujui pengajuan.', 'error');
    }
  };

  const openEditDateModal = (p: PengajuanPkl) => {
    setEditingPengajuan(p);
    const pMulai = p.periode_pkl?.tanggal_mulai ? p.periode_pkl.tanggal_mulai.split(' ')[0] : new Date().toISOString().split('T')[0];
    const pSelesai = p.periode_pkl?.tanggal_selesai ? p.periode_pkl.tanggal_selesai.split(' ')[0] : new Date().toISOString().split('T')[0];
    setEditTanggalMulai(pMulai);
    setEditTanggalSelesai(pSelesai);
    setIsEditDateModalOpen(true);
  };

  const handleEditDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPengajuan) return;
    try {
      await pengajuanApi.updateDates(editingPengajuan.id, {
        tanggal_mulai: editTanggalMulai,
        tanggal_selesai: editTanggalSelesai,
      });
      showToast('Tanggal periode PKL berhasil diperbarui.', 'success');
      setIsEditDateModalOpen(false);
      setEditingPengajuan(null);
      fetchData(currentPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal memperbarui tanggal PKL.', 'error');
    }
  };

  const handleCancelPlacement = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan penempatan ini? Data absen/jurnal yang terkait mungkin tidak dapat diakses dan status pengajuan akan di-reset menjadi pending.')) return;
    try {
      await pengajuanApi.cancelPlacement(id);
      showToast('Penempatan berhasil dibatalkan.', 'success');
      fetchData(currentPage);
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal membatalkan penempatan.', 'error');
    }
  };

  const openRejectModal = (id: number | 'bulk') => {
    if (id === 'bulk') {
      setIsBulkReject(true);
    } else {
      setRejectId(id);
      setIsBulkReject(false);
    }
    setAlasanReject('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    try {
      if (isBulkReject) {
        await pengajuanApi.bulkReject(selectedIds, alasanReject);
        showToast('Pengajuan terpilih berhasil ditolak.', 'success');
        setSelectedIds([]);
      } else if (rejectId) {
        await pengajuanApi.reject(rejectId, alasanReject);
        showToast('Pengajuan ditolak.', 'success');
      }
      setIsRejectModalOpen(false);
      fetchData(currentPage);
      fetchStats();
    } catch {
      showToast('Gagal menolak pengajuan.', 'error');
    }
  };

  const handleGenerateSurat = async () => {
    if (!selectedIds.length) return;
    
    try {
      showToast('Sedang membuat surat...', 'info');
      
      const payload: any = {
        pengajuan_ids: selectedIds,
        nomor_surat: suratForm.nomor_surat,
        tanggal_surat: suratForm.tanggal_surat,
        nama_penandatangan: suratForm.nama_penandatangan,
        nip_penandatangan: suratForm.nip_penandatangan,
        jabatan_penandatangan: suratForm.jabatan_penandatangan,
      };

      if (suratForm.kop_sekolah.trim() !== '') {
        payload.kop_sekolah = suratForm.kop_sekolah;
      }

      const res = await suratApi.generatePermohonan(payload);
      
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Surat_Permohonan_PKL_${Date.now()}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast('Surat berhasil diunduh.', 'success');
      setIsSuratModalOpen(false);
    } catch {
      showToast('Gagal membuat surat.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Disetujui</Badge>;
      case 'rejected': return <Badge variant="danger">Ditolak</Badge>;
      case 'on_site':  return <Badge variant="info">Aktif PKL</Badge>;
      case 'pending':  return <Badge variant="warning">Menunggu</Badge>;
      default: return <Badge variant="gray">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Verifikasi Pengajuan" subtitle="Kelola persetujuan tempat PKL siswa" />

      <div className="page-container py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard label="Pending" count={stats.pending} color="text-amber-600 bg-amber-50" icon={<Clock size={16}/>} />
          <StatCard label="Setuju" count={stats.approved} color="text-emerald-600 bg-emerald-50" icon={<CheckCircle2 size={16}/>} />
          <StatCard label="On Site" count={stats.on_site} color="text-indigo-600 bg-indigo-50" icon={<Building2 size={16}/>} />
          <StatCard label="Total" count={stats.total} color="text-slate-600 bg-slate-100" icon={<Users size={16}/>} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" placeholder="Cari siswa atau industri..."
              className="form-input pl-11"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="w-full sm:w-64">
              <SearchableSelect 
                placeholder="Semua Industri"
                options={[{ value: 'all', label: 'Semua Industri' }, ...industris.map(i => ({ value: i.id.toString(), label: i.nama_industri }))]}
                value={filterIndustri === 'all' ? { value: 'all', label: 'Semua Industri' } : { 
                  value: filterIndustri, 
                  label: industris.find(i => i.id.toString() === filterIndustri)?.nama_industri || 'Semua Industri'
                }}
                onChange={(opt: any) => setFilterIndustri(opt?.value || 'all')}
              />
            </div>
            <select
              className="form-input text-sm !py-2 !px-3 w-auto"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="on_site">On Site</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Selection Actions Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-blue-600 p-4 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4 text-white shadow-lg"
            >
              <div className="flex items-center gap-3 ml-2">
                <span className="font-bold">{selectedIds.length} Siswa Terpilih</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openApproveModal('bulk')} className="px-4 py-2 bg-white text-blue-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors">
                  <CheckCircle2 size={16} /> Setujui
                </button>
                <button onClick={() => setIsSuratModalOpen(true)} className="px-4 py-2 bg-blue-500 text-white border border-blue-400 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-400 transition-colors">
                  <FileText size={16} /> Buat Surat
                </button>
                <button onClick={() => openRejectModal('bulk')} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-600 transition-colors">
                  <XCircle size={16} /> Tolak
                </button>
                <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? <SkeletonList count={5} /> : (
          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-5 w-14">
                        <button onClick={toggleSelectAll} className="text-blue-600">
                          {selectedIds.length === filtered.length && filtered.length > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}
                        </button>
                      </th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Siswa</th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Instansi Tujuan</th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                      <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(p => (
                      <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(p.id) ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-5">
                          <button onClick={() => toggleSelect(p.id)} className={selectedIds.includes(p.id) ? 'text-blue-600' : 'text-slate-300'}>
                            {selectedIds.includes(p.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                          </button>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm flex-shrink-0">
                              {(p.siswa?.user?.name || 'S').charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{p.siswa?.user?.name || 'Siswa'}</p>
                              <p className="text-xs text-slate-400">{p.siswa?.nisn} · {p.siswa?.kelas?.nama_kelas}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="font-medium text-sm">{p.industri?.nama_industri}</span>
                          </div>
                        </td>
                        <td className="p-5">{getStatusBadge(p.status)}</td>
                        <td className="p-5 text-xs text-slate-500 font-medium">
                          {p.status === 'pending' || p.status === 'rejected' ? (
                            new Date(p.created_at).toLocaleDateString('id-ID')
                          ) : p.periode_pkl ? (
                            <span className="flex flex-col gap-0.5 whitespace-nowrap">
                              <span className="font-bold text-slate-700">
                                {new Date(p.periode_pkl.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                s.d. {new Date(p.periode_pkl.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </span>
                          ) : (
                            <span className="text-red-500 font-bold text-xs bg-red-50 px-2.5 py-1 rounded-lg inline-block">Tanggal Belum Diatur</span>
                          )}
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-1">
                            {p.status === 'pending' && (
                              <>
                                <button onClick={() => openApproveModal(p.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Setujui Pengajuan">
                                  <CheckCircle2 size={20} />
                                </button>
                                <button onClick={() => openRejectModal(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Tolak Pengajuan">
                                  <XCircle size={20} />
                                </button>
                              </>
                            )}
                            {(p.status === 'approved' || p.status === 'on_site') && (
                              <>
                                <button onClick={() => openEditDateModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Tanggal PKL">
                                  <Pencil size={18} />
                                </button>
                                <button onClick={() => handleCancelPlacement(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Batalkan/Reset Penempatan">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-24 text-center">
                <Search size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Tidak ada data ditemukan.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && lastPage > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400">
              Hal <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{lastPage}</span> 
              <span className="mx-2">•</span> 
              Total <span className="text-indigo-600">{totalData}</span>
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => fetchData(currentPage - 1)}
                className="btn btn-secondary btn-sm px-3 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button 
                disabled={currentPage === lastPage}
                onClick={() => fetchData(currentPage + 1)}
                className="btn btn-primary btn-sm px-3 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals are handled below for brevity, but they should be defined similarly to earlier */}
      <AnimatePresence>
        {isEditDateModalOpen && editingPengajuan && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditDateModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 mb-2">Edit Tanggal Periode PKL</h3>
              <p className="text-slate-500 text-sm mb-6">Ubah tanggal mulai dan selesai kegiatan PKL siswa: <strong>{editingPengajuan.siswa?.user?.name}</strong></p>
              
              <form onSubmit={handleEditDateSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal Mulai PKL</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input rounded-xl py-3 px-4" 
                    value={editTanggalMulai} 
                    onChange={e => setEditTanggalMulai(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal Selesai PKL</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input rounded-xl py-3 px-4" 
                    value={editTanggalSelesai} 
                    onChange={e => setEditTanggalSelesai(e.target.value)} 
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsEditDateModalOpen(false)} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                  <button type="submit" className="flex-[2] btn btn-primary py-4 rounded-2xl font-black">Simpan Perubahan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isApproveModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsApproveModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 mb-2">Setujui Pengajuan PKL</h3>
              <p className="text-slate-500 text-sm mb-6">Tentukan tanggal mulai dan selesai kegiatan PKL siswa.</p>
              
              <form onSubmit={handleApproveSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal Mulai PKL</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input rounded-xl py-3 px-4" 
                    value={tanggalMulai} 
                    onChange={e => setTanggalMulai(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tanggal Selesai PKL</label>
                  <input 
                    type="date" 
                    required 
                    className="form-input rounded-xl py-3 px-4" 
                    value={tanggalSelesai} 
                    onChange={e => setTanggalSelesai(e.target.value)} 
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsApproveModalOpen(false)} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                  <button type="submit" className="flex-[2] btn btn-primary py-4 rounded-2xl font-black">Setujui</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 mb-2">Tolak Pengajuan</h3>
              <p className="text-slate-500 text-sm mb-6">Berikan alasan penolakan.</p>
              <textarea 
                className="form-input rounded-2xl p-4 min-h-[120px] resize-none mb-6" 
                value={alasanReject} onChange={e => setAlasanReject(e.target.value)}
                placeholder="Alasan..."
              />
              <div className="flex gap-3">
                <button onClick={() => setIsRejectModalOpen(false)} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                <button onClick={handleReject} disabled={!alasanReject} className="flex-[2] btn bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold">Tolak</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSuratModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Generate Surat</h3>
                <button onClick={() => setIsSuratModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={24}/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-4">
                  <Input label="Nomor Surat" value={suratForm.nomor_surat} onChange={v => setSuratForm({...suratForm, nomor_surat: v})} />
                  <Input label="Tanggal Surat" type="date" value={suratForm.tanggal_surat} onChange={v => setSuratForm({...suratForm, tanggal_surat: v})} />
                  <Input label="Jabatan Penandatangan" value={suratForm.jabatan_penandatangan} onChange={v => setSuratForm({...suratForm, jabatan_penandatangan: v})} />
                </div>
                <div className="space-y-4">
                  <Input label="Penandatangan" value={suratForm.nama_penandatangan} onChange={v => setSuratForm({...suratForm, nama_penandatangan: v})} />
                  <Input label="NIP" value={suratForm.nip_penandatangan} onChange={v => setSuratForm({...suratForm, nip_penandatangan: v})} />
                </div>
              </div>
              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Kop Sekolah (Opsional, diabaikan jika pakai template file)</label>
                <textarea 
                  className="form-input rounded-xl p-4 w-full min-h-[80px] resize-none" 
                  value={suratForm.kop_sekolah} 
                  onChange={e => setSuratForm({...suratForm, kop_sekolah: e.target.value})}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsSuratModalOpen(false)} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                <button onClick={handleGenerateSurat} className="flex-[2] btn btn-primary py-4 rounded-2xl font-black">Unduh DOCX</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, count, color, icon }: { label: string; count: number; color: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-3 flex flex-col items-center gap-1.5 ${color}`}>
      {icon}
      <p className="text-xl font-black stat-number">{count}</p>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70 text-center">{label}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{label}</label>
      <input type={type} className="form-input py-3 px-4 rounded-xl" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
