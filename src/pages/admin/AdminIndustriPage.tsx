import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { industriApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import {
  Building2, Plus, X, Search, Pencil, Trash2, MapPin,
  Phone, Mail, User, Save, Upload, Download,
  Briefcase, Users, CheckCircle, XCircle, Hash, Power
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { Industri } from '@/lib/types';

const emptyForm = {
  nama_industri: '', bidang_industri: '', deskripsi: '', mou: '',
  alamat_lengkap: '', telepon: '', email: '', kontak_person: '',
  longitude: '', latitude: '', kuota: '10',
};

export default function AdminIndustriPage() {
  const [industris, setIndustris] = useState<Industri[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industriFilter, setIndustriFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittingImport, setSubmittingImport] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage] = useState(15);
  
  const { toast, showToast } = useToast();

  const refetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await industriApi.list({ 
        page, 
        per_page: perPage,
        search: search,
        status: industriFilter !== 'all' ? industriFilter : undefined
      });
      const paginatedData = res.data.data as any;
      setIndustris(paginatedData.data || []);
      setCurrentPage(paginatedData.current_page || 1);
      setLastPage(paginatedData.last_page || 1);
      setTotalData(paginatedData.total || 0);
    } catch { showToast('Gagal memuat data industri.', 'error'); }
    finally { setLoading(false); }
  }, [showToast, perPage, search, industriFilter]);

  useEffect(() => { 
    const timer = setTimeout(() => {
      refetch(currentPage);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, industriFilter]);

  const openCreate = () => { setForm(emptyForm); setEditId(null); setIsModalOpen(true); };
  const openEdit = (i: Industri) => {
    setForm({
      nama_industri: i.nama_industri, bidang_industri: i.bidang_industri,
      deskripsi: i.deskripsi || '', mou: i.mou || '',
      alamat_lengkap: i.alamat_lengkap, telepon: i.telepon || '',
      email: i.email || '', kontak_person: i.kontak_person || '',
      longitude: i.longitude?.toString() || '', latitude: i.latitude?.toString() || '',
      kuota: i.kuota?.toString() || '10',
    });
    setEditId(i.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { ...form };
      payload.longitude = payload.longitude ? parseFloat(payload.longitude) : undefined;
      payload.latitude = payload.latitude ? parseFloat(payload.latitude) : undefined;
      payload.kuota = parseInt(payload.kuota) || 10;
      if (editId) { await industriApi.update(editId, payload); showToast('Industri diperbarui!', 'success'); }
      else { await industriApi.create(payload); showToast('Industri ditambahkan!', 'success'); }
      setIsModalOpen(false); refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan data.', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus industri ini?')) return;
    try { await industriApi.delete(id); showToast('Industri dihapus.', 'success'); refetch(); }
    catch { showToast('Gagal menghapus industri.', 'error'); }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await industriApi.toggleStatus(id);
      showToast('Status industri diperbarui.', 'success');
      refetch();
    } catch {
      showToast('Gagal memperbarui status.', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSubmittingImport(true);
    try { 
      showToast('Sedang mengimpor data industri...', 'info');
      await industriApi.importExcel(file); 
      showToast('Data industri berhasil diimpor.', 'success'); 
      refetch(); 
    }
    catch (err: any) { showToast(err.response?.data?.message || 'Gagal mengimpor data.', 'error'); }
    finally { setSubmittingImport(false); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await industriApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'template-import-industri.xlsx');
      document.body.appendChild(link); link.click(); link.remove();
    } catch { showToast('Gagal mengunduh template.', 'error'); }
  };

  const f = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const stats = {
    total: totalData,
    verified: 0, // Placeholder, updated via API in real app
    pending: 0,
  };

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Master Industri" subtitle="Kelola perusahaan mitra PKL" />

      <div className="page-container py-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatChip label="Total" value={stats.total} color="bg-indigo-50 text-indigo-600" icon={<Building2 size={16}/>}/>
          <StatChip label="Terverifikasi" value={stats.verified} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle size={16}/>}/>
          <StatChip label="Pending" value={stats.pending} color="bg-amber-50 text-amber-600" icon={<XCircle size={16}/>}/>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Cari nama atau bidang industri..." className="form-input pl-11"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            <select 
              value={industriFilter} 
              onChange={e => setIndustriFilter(e.target.value as any)}
              className="form-input w-full sm:w-48 text-sm font-bold border-slate-200"
            >
              <option value="all">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Hanya Tutup</option>
            </select>

            <div className="flex gap-2 w-full sm:w-auto">
              <input type="file" id="import-industri" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport}/>
              <button onClick={handleDownloadTemplate} className="btn btn-secondary btn-sm gap-1 flex-1 sm:flex-none" title="Unduh Template Excel">
                <Download size={14}/> <span className="hidden sm:inline">Template</span>
              </button>
              <button onClick={() => document.getElementById('import-industri')?.click()} className="btn btn-secondary btn-sm gap-1 flex-1 sm:flex-none">
                <Upload size={14}/> <span className="hidden sm:inline">Import</span>
              </button>
              <button onClick={openCreate} className="btn btn-primary btn-sm gap-1 flex-1 sm:flex-none">
                <Plus size={15}/> <span>Tambah</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {!loading && lastPage > 1 && (
          <div className="mt-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400">
              Hal <span className="text-slate-800">{currentPage}</span> / <span className="text-slate-800">{lastPage}</span> 
              <span className="mx-2">•</span> 
              Total <span className="text-indigo-600">{totalData}</span>
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => refetch(currentPage - 1)}
                className="btn btn-secondary btn-sm px-3 disabled:opacity-50"
              >
                Prev
              </button>
              <button 
                disabled={currentPage === lastPage}
                onClick={() => refetch(currentPage + 1)}
                className="btn btn-primary btn-sm px-3 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? <SkeletonList count={4}/> : (
          <div className="space-y-3">
            {industris.map((i, idx) => (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card flex items-center justify-between gap-4 group hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{i.nama_industri}</h4>
                      {!i.is_verified && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          Unverified
                        </span>
                      )}
                      <Badge variant={i.is_active ? 'success' : 'gray'} className="text-[9px] py-0 px-2">
                        {i.is_active ? 'Aktif' : 'Tutup'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <Briefcase size={10}/> {i.bidang_industri}
                      <span className="text-slate-300 mx-1">•</span>
                      <MapPin size={10}/> <span className="truncate">{i.alamat_lengkap}</span>
                    </p>
                    {/* Quota bar */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1 w-20 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${i.kuota_terpakai >= i.kuota ? 'bg-red-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, (i.kuota_terpakai / i.kuota) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {i.kuota_terpakai}/{i.kuota} terpakai
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleStatus(i.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${i.is_active ? 'bg-slate-100 text-emerald-600 hover:bg-emerald-50' : 'bg-slate-100 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    title={i.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    <Power size={14}/>
                  </button>
                  <button onClick={() => openEdit(i)}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                    <Pencil size={14}/>
                  </button>
                  <button onClick={() => handleDelete(i.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </motion.div>
            ))}
            {industris.length === 0 && (
              <div className="card border-dashed text-center py-12">
                <Building2 size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="text-slate-400 font-medium">Belum ada data industri.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}/>
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 35 }}
              className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[94dvh] flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
                <h3 className="font-black text-slate-800">{editId ? 'Edit Industri' : 'Tambah Industri'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X size={16}/>
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} id="industri-form" className="p-5 space-y-4">
                  {/* Identitas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="form-label flex items-center gap-1"><Building2 size={11}/> Nama Industri *</label>
                      <input required type="text" className="form-input" placeholder="PT. Teknologi Maju" value={form.nama_industri} onChange={f('nama_industri')}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Briefcase size={11}/> Bidang Industri *</label>
                      <input required type="text" className="form-input" placeholder="Teknologi Informasi" value={form.bidang_industri} onChange={f('bidang_industri')}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Users size={11}/> Kuota Siswa *</label>
                      <input required type="number" min="1" className="form-input" value={form.kuota} onChange={f('kuota')}/>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label flex items-center gap-1"><MapPin size={11}/> Alamat Lengkap *</label>
                      <textarea required rows={2} className="form-input resize-none" placeholder="Jl. Merdeka No. 1, Sumedang..." value={form.alamat_lengkap} onChange={f('alamat_lengkap') as any}/>
                    </div>
                  </div>

                  {/* Kontak */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label flex items-center gap-1"><User size={11}/> Kontak Person</label>
                      <input type="text" className="form-input" placeholder="Nama PIC" value={form.kontak_person} onChange={f('kontak_person')}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Phone size={11}/> Telepon</label>
                      <input type="text" className="form-input" placeholder="0812xxxx" value={form.telepon} onChange={f('telepon')}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Mail size={11}/> Email</label>
                      <input type="email" className="form-input" placeholder="hrd@perusahaan.com" value={form.email} onChange={f('email')}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Hash size={11}/> No. MoU</label>
                      <input type="text" className="form-input" placeholder="MOU/2025/xxx" value={form.mou} onChange={f('mou')}/>
                    </div>
                  </div>

                  {/* Koordinat */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Latitude</label>
                      <input type="text" className="form-input" placeholder="-6.xxx" value={form.latitude} onChange={f('latitude')}/>
                    </div>
                    <div>
                      <label className="form-label">Longitude</label>
                      <input type="text" className="form-input" placeholder="107.xxx" value={form.longitude} onChange={f('longitude')}/>
                    </div>
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <label className="form-label">Deskripsi</label>
                    <textarea rows={2} className="form-input resize-none" placeholder="Deskripsi singkat perusahaan..." value={form.deskripsi} onChange={f('deskripsi') as any}/>
                  </div>
                </form>
              </div>

              <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1">Batal</button>
                <button type="submit" form="industri-form" disabled={submitting} className="btn btn-primary flex-[2] gap-2">
                  <Save size={15}/> {submitting ? 'Menyimpan...' : 'Simpan Industri'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay untuk Import */}
      <AnimatePresence>
        {submittingImport && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center text-white"
          >
            <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-black text-xl animate-pulse">Sedang Mengimpor Data Industri...</p>
            <p className="text-sm text-slate-300 mt-2">Mohon tunggu sebentar.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatChip({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className={`card p-3 flex flex-col items-center gap-1 ${color}`}>
      {icon}
      <p className="text-xl font-black">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}
