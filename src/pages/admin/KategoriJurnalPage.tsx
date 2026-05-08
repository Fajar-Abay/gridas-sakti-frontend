/**
 * pages/admin/KategoriJurnalPage.tsx
 * Admin CRUD untuk Kategori Jurnal (Produksi, Maintenance, Administrasi, dll).
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { kategoriJurnalApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { Tag, Plus, X, Edit, Trash2, Save } from 'lucide-react';
import type { KategoriJurnal } from '@/lib/types';

export default function KategoriJurnalPage() {
  const [kategoriList, setKategoriList] = useState<KategoriJurnal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ nama_kategori: '', deskripsi: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kategoriJurnalApi.list();
      setKategoriList(Array.isArray(res.data.data) ? res.data.data : []);
    } catch { showToast('Gagal memuat kategori.', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setForm({ nama_kategori: '', deskripsi: '' }); setEditId(null); setIsModalOpen(true); };

  const openEdit = (k: KategoriJurnal) => {
    setForm({ nama_kategori: k.nama_kategori, deskripsi: (k as any).deskripsi || '' });
    setEditId(k.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        await kategoriJurnalApi.update(editId, form);
        showToast('Kategori berhasil diperbarui!', 'success');
      } else {
        await kategoriJurnalApi.create(form);
        showToast('Kategori berhasil ditambahkan!', 'success');
      }
      setIsModalOpen(false);
      fetch();
    } catch { showToast('Gagal menyimpan kategori.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await kategoriJurnalApi.delete(id);
      showToast('Kategori berhasil dihapus.', 'success');
      fetch();
    } catch { showToast('Gagal menghapus kategori.', 'error'); }
  };

  const colors = ['bg-blue-50 text-blue-600', 'bg-green-50 text-green-600', 'bg-purple-50 text-purple-600', 'bg-amber-50 text-amber-600', 'bg-rose-50 text-rose-600'];

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Kategori Jurnal" subtitle="Kelola kategori aktivitas untuk jurnal harian" />

      <div className="page-container py-6 max-w-2xl mx-auto">
        <button onClick={openCreate} className="btn btn-primary w-full py-4 rounded-2xl shadow-xl font-black flex items-center justify-center gap-2 mb-8">
          <Plus size={22} /> Tambah Kategori
        </button>

        {loading ? <SkeletonList count={3} /> : (
          <div className="space-y-3">
            {kategoriList.map((k, idx) => (
              <motion.div key={k.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                className="card flex items-center justify-between group hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[idx % colors.length]}`}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{k.nama_kategori}</h4>
                    {(k as any).deskripsi && <p className="text-xs text-slate-400">{(k as any).deskripsi}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(k)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(k.id)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
            {kategoriList.length === 0 && (
              <div className="py-20 text-center card border-dashed"><Tag size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-slate-400 font-medium">Belum ada kategori jurnal.</p></div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">{editId ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Nama Kategori *</label>
                  <input type="text" required className="form-input py-3 rounded-xl" placeholder="Contoh: Produksi" value={form.nama_kategori} onChange={e => setForm({...form, nama_kategori: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Deskripsi</label>
                  <textarea className="form-input py-3 rounded-xl resize-none" rows={2} placeholder="Keterangan singkat..." value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn btn-secondary py-3 rounded-xl font-bold">Batal</button>
                  <button type="submit" disabled={submitting} className="flex-1 btn btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <Save size={16} /> {submitting ? '...' : 'Simpan'}
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
