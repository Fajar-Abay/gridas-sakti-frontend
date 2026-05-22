/**
 * pages/admin/MasterData.tsx
 * Halaman Manajemen Data Master (Jurusan, Kelas, Tahun Ajar, Industri).
 * Dilengkapi dengan fitur CRUD (Tambah, Edit, Hapus).
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { jurusanApi, kelasApi, tahunAjarApi, industriApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import Badge from '@/components/ui/Badge';
import { BookOpen, GraduationCap, Calendar, Building2, Plus, Search, Trash2, Pencil, X, Save, AlertTriangle, CheckCircle, RotateCcw, Power } from 'lucide-react';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useTahunAjar } from '@/lib/TahunAjarContext';

type Tab = 'jurusan' | 'kelas' | 'tahun-ajar' | 'industri';

export default function MasterData() {
  const { setActiveTahunAjar, refresh: refreshTahunAjar } = useTahunAjar();
  const [activeTab, setActiveTab] = useState<Tab>('jurusan');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [industriFilter, setIndustriFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { toast, showToast } = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState(false);
  const [autoGenYearId, setAutoGenYearId] = useState('');
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const [jurusans, setJurusans] = useState<any[]>([]);
  const [tahunAjars, setTahunAjars] = useState<any[]>([]);

  const fetchData = useCallback(async (tab: Tab) => {
    setLoading(true);
    try {
      let res;
      if (tab === 'jurusan') res = await jurusanApi.list();
      else if (tab === 'kelas') res = await kelasApi.list();
      else if (tab === 'tahun-ajar') res = await tahunAjarApi.list();
      else if (tab === 'industri') res = await industriApi.list();
      
      const rawData = res?.data.data;
      setData(Array.isArray(rawData) ? (rawData || []) : (rawData as any).data || []);
    } catch (err) {
      showToast('Gagal memuat data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchRefs = useCallback(async () => {
    try {
      const [jRes, tRes] = await Promise.all([jurusanApi.list(), tahunAjarApi.list()]);
      
      const jData = jRes.data.data;
      setJurusans(Array.isArray(jData) ? jData : (jData as any).data || []);
      
      const tData = tRes.data.data;
      setTahunAjars(Array.isArray(tData) ? tData : (tData as any).data || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData(activeTab);
    fetchRefs();
  }, [activeTab, fetchData, fetchRefs]);

  const filteredData = () => {
    const s = search.toLowerCase();
    return data.filter((item: any) => {
      // Search logic
      const matchesSearch = (
        (item.nama_jurusan?.toLowerCase().includes(s)) ||
        (item.nama_kelas?.toLowerCase().includes(s)) ||
        (item.tahun_ajaran?.toLowerCase().includes(s)) ||
        (item.nama_industri?.toLowerCase().includes(s)) ||
        (item.bidang_industri?.toLowerCase().includes(s))
      );

      // Industri Status Filter logic
      if (activeTab === 'industri') {
        if (industriFilter === 'active') return matchesSearch && item.is_active;
        if (industriFilter === 'inactive') return matchesSearch && !item.is_active;
      }

      return matchesSearch;
    });
  };

  const openModal = (item: any = null) => {
    setEditItem(item);
    setFormData(item || {});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'jurusan') {
        if (editItem) await jurusanApi.update(editItem.id, formData);
        else await jurusanApi.create(formData);
      } else if (activeTab === 'kelas') {
        if (editItem) await kelasApi.update(editItem.id, formData);
        else await kelasApi.create(formData);
      } else if (activeTab === 'tahun-ajar') {
        if (editItem) await tahunAjarApi.update(editItem.id, formData);
        else await tahunAjarApi.create(formData);
      } else if (activeTab === 'industri') {
        if (editItem) await industriApi.update(editItem.id, formData);
        else await industriApi.create(formData);
      }

      showToast(`Data berhasil ${editItem ? 'diperbarui' : 'ditambahkan'}.`, 'success');
      closeModal();
      
      if (activeTab === 'tahun-ajar') {
        await refreshTahunAjar();
      }
      
      fetchData(activeTab);
    } catch (err) {
      showToast('Terjadi kesalahan saat menyimpan data.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      if (activeTab === 'jurusan') await jurusanApi.delete(id);
      else if (activeTab === 'kelas') await kelasApi.delete(id);
      else if (activeTab === 'tahun-ajar') await tahunAjarApi.delete(id);
      else if (activeTab === 'industri') await industriApi.delete(id);

      showToast('Data berhasil dihapus.', 'success');
      
      if (activeTab === 'tahun-ajar') {
        await refreshTahunAjar();
      }

      fetchData(activeTab);
    } catch (err) {
      showToast('Gagal menghapus data.', 'error');
    }
  };

  const handleActivate = async (item: any) => {
    try {
      await tahunAjarApi.setActive(item.id);
      showToast('Tahun ajaran berhasil diaktifkan.', 'success');
      
      // Sinkronisasi dengan context dan local storage
      setActiveTahunAjar(item);
      sessionStorage.removeItem('active_tahun_ajaran_user_selected');
      
      await refreshTahunAjar();
      fetchData(activeTab);
    } catch (err) {
      showToast('Gagal mengaktifkan tahun ajaran.', 'error');
    }
  };

  const handleGenerateKelas = async () => {
    if (!autoGenYearId) return;
    
    try {
      setLoading(true);
      await kelasApi.generateDefault(parseInt(autoGenYearId));
      showToast('Kelas standar berhasil digenerate.', 'success');
      setIsAutoGenModalOpen(false);
      fetchData('kelas');
    } catch (err) {
      showToast('Gagal generate kelas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIndustri = async (id: number) => {
    try {
      await industriApi.toggleStatus(id);
      showToast('Status industri berhasil diperbarui.', 'success');
      fetchData('industri');
    } catch (err) {
      showToast('Gagal memperbarui status industri.', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Data Master" subtitle="Kelola referensi data inti sistem Gridas Sakti" />

      <div className="page-container py-6">
        
        {/* ── Tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          <TabButton active={activeTab === 'jurusan'} onClick={() => setActiveTab('jurusan')} icon={<BookOpen size={14}/>} label="Jurusan" />
          <TabButton active={activeTab === 'kelas'} onClick={() => setActiveTab('kelas')} icon={<GraduationCap size={14}/>} label="Kelas" />
          <TabButton active={activeTab === 'tahun-ajar'} onClick={() => setActiveTab('tahun-ajar')} icon={<Calendar size={14}/>} label="Tahun Ajar" />
          <TabButton active={activeTab === 'industri'} onClick={() => setActiveTab('industri')} icon={<Building2 size={14}/>} label="Industri" />
        </div>

        {/* ── Action Bar ── */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Cari ${activeTab.replace('-', ' ')}...`} 
              className="form-input pl-11" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {activeTab === 'industri' && (
            <select 
              value={industriFilter} 
              onChange={e => setIndustriFilter(e.target.value as any)}
              className="form-input w-40 text-sm font-bold border-slate-200"
            >
              <option value="all">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Hanya Tutup</option>
            </select>
          )}

          <div className="flex gap-2">
            {activeTab === 'kelas' && (
              <button onClick={() => setIsAutoGenModalOpen(true)} className="btn btn-secondary btn-sm gap-1 flex-shrink-0">
                <RotateCcw size={14}/> Auto-Gen
              </button>
            )}
            <button onClick={() => openModal()} className="btn btn-primary btn-sm gap-1 flex-shrink-0">
              <Plus size={15}/> Tambah
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? <SkeletonList count={6} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredData().length > 0 ? filteredData().map((item, idx) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card group border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activeTab === 'jurusan' ? 'bg-blue-50 text-blue-600' :
                    activeTab === 'kelas' ? 'bg-indigo-50 text-indigo-600' :
                    activeTab === 'tahun-ajar' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {activeTab === 'jurusan' && <BookOpen size={18} />}
                    {activeTab === 'kelas' && <GraduationCap size={18} />}
                    {activeTab === 'tahun-ajar' && <Calendar size={18} />}
                    {activeTab === 'industri' && <Building2 size={18} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={15} />
                    </button>
                    {activeTab === 'tahun-ajar' && !item.is_active && (
                      <button onClick={() => handleActivate(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Set Aktif">
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {activeTab === 'industri' && (
                      <button onClick={() => handleToggleIndustri(item.id)} className={`p-2 rounded-xl transition-all ${item.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                        <Power size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">
                      {item.nama_jurusan || item.nama_kelas || item.tahun_ajaran || item.tahun_ajar || item.nama_industri}
                    </h4>
                    {activeTab === 'tahun-ajar' && (item as any).is_active && (
                      <Badge variant="success" className="rounded-lg">Aktif</Badge>
                    )}
                    {activeTab === 'industri' && (
                      <Badge variant={item.is_active ? 'success' : 'gray'} className="rounded-lg">
                        {item.is_active ? 'Aktif' : 'Tutup'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    {activeTab === 'jurusan' && <span className="flex items-center gap-1.5"><Shield size={14} className="text-slate-300"/> {item.kode_jurusan || '-'}</span>}
                    {activeTab === 'kelas' && <span className="flex flex-col gap-0.5">
                      <span>{item.jurusan?.nama_jurusan}</span>
                      <span className="text-[10px] text-slate-400">Tahun: {item.tahun_ajaran?.tahun_ajaran} ({item.tahun_ajaran?.semester})</span>
                    </span>}
                    {activeTab === 'industri' && <span className="line-clamp-1">{item.alamat_lengkap || item.alamat}</span>}
                    {activeTab === 'tahun-ajar' && <span>Smt: {item.semester ? (item.semester.charAt(0).toUpperCase() + item.semester.slice(1)) : '-'}</span>}
                  </p>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-32 text-center card border-dashed border-slate-200">
                <AlertTriangle size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Tidak ada data {activeTab.replace('-', ' ')} ditemukan.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CRUD Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 md:p-10"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{editItem ? 'Edit' : 'Tambah'} {activeTab.replace('-', ' ')}</h3>
                  <p className="text-slate-500 text-sm">Lengkapi detail informasi di bawah ini.</p>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {activeTab === 'jurusan' && (
                  <>
                    <div>
                      <label className="form-label">Nama Jurusan</label>
                      <input type="text" required value={formData.nama_jurusan || ''} onChange={e => setFormData({...formData, nama_jurusan: e.target.value})} className="form-input" placeholder="Contoh: Rekayasa Perangkat Lunak" />
                    </div>
                    <div>
                      <label className="form-label">Kode Jurusan</label>
                      <input type="text" required value={formData.kode_jurusan || ''} onChange={e => setFormData({...formData, kode_jurusan: e.target.value})} className="form-input" placeholder="Contoh: RPL" />
                    </div>
                  </>
                )}

                {activeTab === 'kelas' && (
                  <>
                    <div>
                      <label className="form-label">Nama Kelas</label>
                      <input type="text" required value={formData.nama_kelas || ''} onChange={e => setFormData({...formData, nama_kelas: e.target.value})} className="form-input" placeholder="Contoh: 12 PPLG 1" />
                    </div>
                    <div>
                      <SearchableSelect 
                        label="Jurusan"
                        placeholder="Pilih atau cari jurusan..."
                        options={Array.isArray(jurusans) ? jurusans.map((j: any) => ({ value: j.id, label: `${j.nama_jurusan} (${j.kode_jurusan})` })) : []}
                        value={formData.jurusan_id ? { 
                          value: formData.jurusan_id, 
                          label: jurusans.find((j: any) => j.id === formData.jurusan_id)?.nama_jurusan 
                        } : null}
                        onChange={(opt: any) => setFormData({ ...formData, jurusan_id: opt?.value })}
                      />
                    </div>
                    <div>
                      <SearchableSelect 
                        label="Tahun Ajaran"
                        placeholder="Pilih atau cari tahun ajaran..."
                        options={Array.isArray(tahunAjars) ? tahunAjars.map((t: any) => ({ value: t.id, label: `${t.tahun_ajaran} - ${t.semester}` })) : []}
                        value={formData.tahun_ajaran_id ? { 
                          value: formData.tahun_ajaran_id, 
                          label: tahunAjars.find((t: any) => t.id === formData.tahun_ajaran_id)?.tahun_ajaran 
                        } : null}
                        onChange={(opt: any) => setFormData({ ...formData, tahun_ajaran_id: opt?.value })}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'tahun-ajar' && (
                  <>
                    <div>
                      <label className="form-label">Tahun</label>
                      <input type="text" required value={formData.tahun_ajaran || ''} onChange={e => setFormData({...formData, tahun_ajaran: e.target.value})} className="form-input" placeholder="Contoh: 2023/2024" />
                    </div>
                    <div>
                      <label className="form-label">Semester</label>
                      <select required value={formData.semester || ''} onChange={e => setFormData({...formData, semester: e.target.value})} className="form-input">
                        <option value="">Pilih Semester</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'industri' && (
                  <>
                    <div>
                      <label className="form-label">Nama Industri</label>
                      <input type="text" required value={formData.nama_industri || ''} onChange={e => setFormData({...formData, nama_industri: e.target.value})} className="form-input" placeholder="Nama Perusahaan" />
                    </div>
                    <div>
                      <label className="form-label">Bidang</label>
                      <input type="text" required value={formData.bidang_industri || ''} onChange={e => setFormData({...formData, bidang_industri: e.target.value})} className="form-input" placeholder="Contoh: IT Services" />
                    </div>
                    <div>
                      <label className="form-label">Alamat Lengkap</label>
                      <textarea required value={formData.alamat_lengkap || ''} onChange={e => setFormData({...formData, alamat_lengkap: e.target.value})} className="form-input min-h-[100px]" placeholder="Alamat lengkap industri..." />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                  <button type="submit" className="flex-[2] btn btn-primary py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                    <Save size={20} /> Simpan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── Auto-Gen Modal ── */}
      <AnimatePresence>
        {isAutoGenModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAutoGenModalOpen(false)}/>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-slate-800 mb-2">Auto-Gen Kelas</h3>
              <p className="text-sm text-slate-500 mb-6">Pilih tahun ajaran untuk membuat kelas standar (1-4) secara otomatis.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Pilih Tahun Ajaran</label>
                  <select value={autoGenYearId} onChange={e => setAutoGenYearId(e.target.value)} className="form-input">
                    <option value="">Pilih Tahun...</option>
                    {Array.isArray(tahunAjars) && tahunAjars.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.tahun_ajaran} - {t.semester}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsAutoGenModalOpen(false)} className="btn btn-secondary flex-1">Batal</button>
                  <button onClick={handleGenerateKelas} disabled={!autoGenYearId} className="btn btn-primary flex-1">Generate</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`filter-chip flex-shrink-0 ${active ? 'active' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Shield({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
