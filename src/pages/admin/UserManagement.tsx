/**
 * pages/admin/UserManagement.tsx
 * Manajemen Pengguna — Redesign v2. Mobile-first.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { userApi, jurusanApi, kelasApi, industriApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import Badge, { getRoleBadgeVariant } from '@/components/ui/Badge';
import {
  Users, Search, Plus, Mail, Shield, User as UserIcon, X, Save,
  Trash2, Pencil, Download, Upload, RotateCcw, GraduationCap,
  Building2, BookOpen, Phone, Hash, Briefcase,
} from 'lucide-react';
import type { User, Jurusan, Kelas, Industri, UserRole } from '@/lib/types';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const { toast, showToast } = useToast();

  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [kelass, setKelass] = useState<Kelas[]>([]);
  const [industris, setIndustris] = useState<Industri[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [formData, setFormData] = useState<any>({ role: 'siswa' });

  const [importRole, setImportRole] = useState<'siswa' | 'guru' | 'pembimbing'>('siswa');
  const [importResult, setImportResult] = useState<{ success_count: number; error_count: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [perPage] = useState(15);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await userApi.list({ 
        page, 
        per_page: perPage,
        search: search,
        role: filterRole !== 'all' ? filterRole : undefined
      });
      const paginatedData = res.data.data as any;
      
      setUsers(paginatedData.data || []);
      setCurrentPage(paginatedData.current_page || 1);
      setLastPage(paginatedData.last_page || 1);
      setTotalData(paginatedData.total || 0);
    } catch { showToast('Gagal memuat daftar pengguna.', 'error'); }
    finally { setLoading(false); }
  }, [showToast, perPage, search, filterRole]);

  const fetchRefs = useCallback(async () => {
    try {
      const [jRes, kRes, iRes] = await Promise.all([jurusanApi.list(), kelasApi.list(), industriApi.list()]);
      setJurusans(Array.isArray(jRes.data.data) ? jRes.data.data : (jRes.data.data as any).data || []);
      setKelass(Array.isArray(kRes.data.data) ? kRes.data.data : (kRes.data.data as any).data || []);
      setIndustris(Array.isArray(iRes.data.data) ? iRes.data.data : (iRes.data.data as any).data || []);
    } catch {}
  }, []);

  useEffect(() => { 
    // Debounce search
    const timer = setTimeout(() => {
      fetchUsers(1); 
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filterRole]); // Trigger juga saat filterRole berubah

  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  const openModal = (item: User | null = null) => {
    setEditItem(item);
    if (item) {
      const extra = item.siswa || item.guru || item.pembimbing || {};
      setFormData({ ...item, ...extra, password: '' });
    } else {
      setFormData({ role: 'siswa' });
    }
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditItem(null); setFormData({ role: 'siswa' }); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) { await userApi.update(editItem.id, formData); showToast('User diperbarui.', 'success'); }
      else { await userApi.create(formData); showToast('User ditambahkan.', 'success'); }
      closeModal(); fetchUsers();
    } catch { showToast('Gagal menyimpan data user.', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus user ini?')) return;
    try { await userApi.delete(id); showToast('User dihapus.', 'success'); fetchUsers(); }
    catch { showToast('Gagal menghapus user.', 'error'); }
  };

  const handleResetPassword = async (id: number, name: string) => {
    if (!window.confirm(`Reset password ${name}?`)) return;
    try { await userApi.resetPassword(id); showToast(`Password ${name} berhasil direset.`, 'success'); }
    catch { showToast('Gagal mereset password.', 'error'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setIsImporting(true);
    try {
      showToast('Sedang mengimpor data...', 'info');
      const res = await userApi.importExcel(file, importRole);
      const data = res.data.data!;
      setImportResult(data);
      if (data.error_count === 0) showToast(`${data.success_count} data berhasil diimpor!`, 'success');
      else showToast(`${data.success_count} berhasil, ${data.error_count} gagal.`, 'error');
      fetchUsers();
    } catch (err: any) {
      if (err?.response?.data?.data) setImportResult(err.response.data.data);
      showToast(err?.response?.data?.message ?? 'Gagal mengimpor data.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await userApi.downloadImportTemplate(importRole);
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `template_import_${importRole}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      showToast('Template berhasil diunduh!', 'success');
    } catch { showToast('Gagal mengunduh template.', 'error'); }
  };

  const filteredUsers = users; 
  // Filtering sudah dilakukan di level API

  const roleCounts: Record<string, number> = {
    all: totalData, 
    siswa: filterRole === 'siswa' ? totalData : users.filter(u => u.role === 'siswa').length,
    guru: filterRole === 'guru' ? totalData : users.filter(u => u.role === 'guru').length,
    pembimbing: filterRole === 'pembimbing' ? totalData : users.filter(u => u.role === 'pembimbing').length,
    admin: filterRole === 'admin' ? totalData : users.filter(u => u.role === 'admin').length,
  };

  const roleFilters: { key: UserRole | 'all'; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'siswa', label: 'Siswa' },
    { key: 'guru', label: 'Guru' },
    { key: 'pembimbing', label: 'Pembimbing' },
    { key: 'admin', label: 'Admin' },
  ];

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Kelola Pengguna" subtitle="Manajemen akun & hak akses" />

      <div className="page-container py-5">

        {/* Import error result */}
        <AnimatePresence>
          {importResult && importResult.error_count > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card bg-red-50 border-red-200 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-red-700">
                  ✅ {importResult.success_count} berhasil · ❌ {importResult.error_count} gagal
                </p>
                <button onClick={() => setImportResult(null)} className="text-xs text-red-400 hover:text-red-600 font-bold">Tutup</button>
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 bg-red-100 px-3 py-1.5 rounded-lg">⚠️ {err}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Cari nama atau email..." className="form-input pl-11"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            <select value={importRole} onChange={e => setImportRole(e.target.value as any)}
              className="form-input text-sm !py-2 !px-3 w-auto" title="Role untuk import">
              <option value="siswa">Siswa</option>
              <option value="guru">Guru</option>
              <option value="pembimbing">Pembimbing</option>
            </select>
            <input type="file" id="import-excel" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport}/>
            <button onClick={() => document.getElementById('import-excel')?.click()} className="btn btn-secondary btn-sm gap-1">
              <Upload size={14}/> Import
            </button>
            <button onClick={handleDownloadTemplate} className="btn btn-secondary btn-sm gap-1">
              <Download size={14}/> Template
            </button>
            <button onClick={() => openModal()} className="btn btn-primary btn-sm gap-1">
              <Plus size={15}/> Tambah
            </button>
          </div>
        </div>

        {/* Role filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {roleFilters.map(r => (
            <button key={r.key} onClick={() => setFilterRole(r.key)}
              className={`filter-chip flex-shrink-0 ${filterRole === r.key ? 'active' : ''}`}>
              {r.label}
              <span className="text-[10px] font-black">({roleCounts[r.key] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? <SkeletonList count={5}/> : (
          <div className="space-y-3">
            {filteredUsers.length > 0 ? filteredUsers.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-base flex-shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-bold text-slate-800 text-sm truncate">{u.name}</p>
                      <Badge variant={getRoleBadgeVariant(u.role)} className="rounded-md">{u.role}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Mail size={10}/> {u.email}</span>
                      {u.siswa && <span className="flex items-center gap-1"><Hash size={10}/> {u.siswa.nisn} · {u.siswa.kelas?.nama_kelas}</span>}
                      {u.guru && <span className="flex items-center gap-1"><Shield size={10}/> {u.guru.nip}</span>}
                      {u.pembimbing && <span className="flex items-center gap-1"><Building2 size={10}/> {u.pembimbing.industri?.nama_industri}</span>}
                      {(u.siswa?.no_hp || u.guru?.no_hp || u.pembimbing?.no_hp) && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Phone size={10}/> {u.siswa?.no_hp || u.guru?.no_hp || u.pembimbing?.no_hp}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleResetPassword(u.id, u.name)}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-amber-100 hover:text-amber-600 transition-colors" title="Reset Password">
                    <RotateCcw size={13}/>
                  </button>
                  <button onClick={() => openModal(u)}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors" title="Edit">
                    <Pencil size={13}/>
                  </button>
                  <button onClick={() => handleDelete(u.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors" title="Hapus">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </motion.div>
            )) : (
              <div className="card border-dashed text-center py-12">
                <Users size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="text-slate-400 font-medium">Tidak ada pengguna ditemukan.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && lastPage > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400">
              Halaman <span className="text-slate-800">{currentPage}</span> dari <span className="text-slate-800">{lastPage}</span> 
              <span className="mx-2">•</span> 
              Total <span className="text-indigo-600">{totalData}</span> Pengguna
            </p>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => fetchUsers(currentPage - 1)}
                className="btn btn-secondary btn-sm px-4 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button 
                disabled={currentPage === lastPage}
                onClick={() => fetchUsers(currentPage + 1)}
                className="btn btn-primary btn-sm px-4 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}/>
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 35 }}
              className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="font-black text-slate-800">{editItem ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pilih role dan lengkapi informasi akun.</p>
                </div>
                <button onClick={closeModal} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X size={16}/>
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <form onSubmit={handleSave} id="user-form" className="p-5 space-y-4">
                  {/* Basic info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="form-label flex items-center gap-1"><UserIcon size={11}/> Nama Lengkap *</label>
                      <input required type="text" className="form-input" placeholder="Nama lengkap..."
                        value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Mail size={11}/> Email *</label>
                      <input required type="email" className="form-input" placeholder="email@contoh.com"
                        value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})}/>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Shield size={11}/> Role *</label>
                      <select required className="form-input" value={formData.role || 'siswa'}
                        onChange={e => setFormData({...formData, role: e.target.value})}>
                        <option value="siswa">Siswa</option>
                        <option value="guru">Guru Pembimbing</option>
                        <option value="pembimbing">Pembimbing Industri</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">Password {editItem && <span className="text-slate-400 font-normal">(kosongkan jika tidak diubah)</span>}</label>
                      <input type="password" required={!editItem} className="form-input" placeholder="••••••••"
                        value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})}/>
                    </div>
                  </div>

                  {/* Role-specific */}
                  {formData.role === 'siswa' && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                      <p className="section-title flex items-center gap-1"><GraduationCap size={11}/> Data Siswa</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label">NISN *</label>
                          <input required type="text" className="form-input bg-white" placeholder="NISN"
                            value={formData.nisn || ''} onChange={e => setFormData({...formData, nisn: e.target.value})}/>
                        </div>
                        <div>
                          <label className="form-label">NIS *</label>
                          <input required type="text" className="form-input bg-white" placeholder="NIS"
                            value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})}/>
                        </div>
                        <div>
                          <SearchableSelect 
                            label="Jurusan *"
                            placeholder="Pilih jurusan..."
                            options={jurusans.map(j => ({ value: j.id, label: j.nama_jurusan }))}
                            value={formData.jurusan_id ? { 
                              value: formData.jurusan_id, 
                              label: jurusans.find(j => j.id === Number(formData.jurusan_id))?.nama_jurusan 
                            } : null}
                            onChange={(opt: any) => setFormData({...formData, jurusan_id: opt?.value})}
                          />
                        </div>
                        <div>
                          <SearchableSelect 
                            label="Kelas *"
                            placeholder="Pilih kelas..."
                            options={kelass.map(k => ({ value: k.id, label: k.nama_kelas }))}
                            value={formData.kelas_id ? { 
                              value: formData.kelas_id, 
                              label: kelass.find(k => k.id === Number(formData.kelas_id))?.nama_kelas 
                            } : null}
                            onChange={(opt: any) => setFormData({...formData, kelas_id: opt?.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="form-label">No. HP (WhatsApp)</label>
                          <input type="text" className="form-input bg-white" placeholder="628xxx"
                            value={formData.no_hp || ''} onChange={e => setFormData({...formData, no_hp: e.target.value})}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.role === 'guru' && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                      <p className="section-title flex items-center gap-1"><BookOpen size={11}/> Data Guru</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label">NIP *</label>
                          <input required type="text" className="form-input bg-white" placeholder="NIP"
                            value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})}/>
                        </div>
                        <div>
                          <label className="form-label">Jabatan *</label>
                          <input required type="text" className="form-input bg-white" placeholder="Koordinator PKL"
                            value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})}/>
                        </div>
                        <div>
                          <SearchableSelect 
                            label="Jurusan"
                            placeholder="Pilih jurusan..."
                            options={jurusans.map(j => ({ value: j.id, label: j.nama_jurusan }))}
                            value={formData.jurusan_id ? { 
                              value: formData.jurusan_id, 
                              label: jurusans.find(j => j.id === Number(formData.jurusan_id))?.nama_jurusan 
                            } : null}
                            onChange={(opt: any) => setFormData({...formData, jurusan_id: opt?.value})}
                          />
                        </div>
                        <div>
                          <label className="form-label text-emerald-600 font-bold">No. HP (WhatsApp) *</label>
                          <input required type="text" className="form-input bg-white border-emerald-200" placeholder="628xxx"
                            value={formData.no_hp || ''} onChange={e => setFormData({...formData, no_hp: e.target.value})}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.role === 'pembimbing' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3">
                      <p className="section-title flex items-center gap-1"><Briefcase size={11}/> Data Pembimbing</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <SearchableSelect 
                            label="Industri *"
                            placeholder="Pilih industri..."
                            options={industris.map(i => ({ value: i.id, label: i.nama_industri }))}
                            value={formData.industri_id ? { 
                              value: formData.industri_id, 
                              label: industris.find(i => i.id === Number(formData.industri_id))?.nama_industri 
                            } : null}
                            onChange={(opt: any) => setFormData({...formData, industri_id: opt?.value})}
                          />
                        </div>
                        <div>
                          <label className="form-label">Jabatan *</label>
                          <input required type="text" className="form-input bg-white" placeholder="Senior Developer"
                            value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})}/>
                        </div>
                        <div>
                          <label className="form-label text-emerald-600 font-bold">No. HP (WhatsApp) *</label>
                          <input required type="text" className="form-input bg-white border-emerald-200" placeholder="628xxx"
                            value={formData.no_hp || ''} onChange={e => setFormData({...formData, no_hp: e.target.value})}/>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.role === 'admin' && (
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
                      <UserIcon size={24} className="mx-auto text-purple-400 mb-1"/>
                      <p className="text-xs text-purple-600 font-medium">Admin tidak memerlukan informasi tambahan.</p>
                    </div>
                  )}
                </form>
              </div>

              <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">Batal</button>
                <button type="submit" form="user-form" className="btn btn-primary flex-[2] gap-2">
                  <Save size={15}/> Simpan Pengguna
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Loading Overlay untuk Import */}
      <AnimatePresence>
        {isImporting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center text-white"
          >
            <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-black text-xl animate-pulse">Sedang Mengimpor Data...</p>
            <p className="text-sm text-slate-300 mt-2">Mohon tunggu, jangan tutup halaman ini.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
