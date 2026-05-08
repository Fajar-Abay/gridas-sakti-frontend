import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { suratApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import {
  FileText, Plus, Trash2, X, Upload, Save,
  FileCheck, Info, Clock
} from 'lucide-react';
import type { SuratTemplate, User } from '@/lib/types';

export interface SuratArchive {
  id: number;
  user_id: number;
  user: User;
  jenis_surat: string;
  nomor_surat: string;
  nama_file: string;
  path_file: string;
  metadata: any;
  created_at: string;
}

export default function AdminSuratPage() {
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [archives, setArchives] = useState<SuratArchive[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'archives'>('templates');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{
    nama_template: string;
    jenis_surat: string;
    deskripsi: string;
    file_template: File | null;
  }>({
    nama_template: '',
    jenis_surat: 'surat_permohonan',
    deskripsi: '',
    file_template: null,
  });

  const { toast, showToast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suratApi.listTemplates();
      // Data struktur baru { templates: [], archives: [] }
      if (res.data.data.templates) {
        setTemplates(res.data.data.templates);
        setArchives(res.data.data.archives || []);
      } else {
        setTemplates(res.data.data as any);
      }
    } catch {
      showToast('Gagal memuat data surat.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file_template) return showToast('Pilih file template .docx', 'error');
    
    setSubmitting(true);
    try {
      await suratApi.uploadTemplate({
        ...form,
        file_template: form.file_template
      });
      showToast('Template berhasil diunggah.', 'success');
      setIsModalOpen(false);
      setForm({ nama_template: '', jenis_surat: 'surat_permohonan', deskripsi: '', file_template: null });
      fetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengunggah.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus template ini?')) return;
    try {
      await suratApi.deleteTemplate(id);
      showToast('Template dihapus.', 'success');
      fetch();
    } catch {
      showToast('Gagal menghapus template.', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Manajemen Surat" subtitle="Kelola template dokumen otomatis (.docx)" />

      <div className="page-container py-6">
        <div className="flex justify-between items-center mb-8">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 max-w-2xl">
            <Info className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Gunakan template dalam format <strong>.docx</strong> dengan placeholder seperti <code>{'{'}nomor_surat{'}'}</code>, <code>{'{'}tanggal_surat{'}'}</code>, dan tabel siswa untuk generate dokumen otomatis.
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('templates')}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                TEMPLATE
              </button>
              <button 
                onClick={() => setActiveTab('archives')}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'archives' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                ARSIP SURAT
              </button>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary px-8 py-4 rounded-2xl shadow-xl flex items-center gap-2 font-black">
              <Plus size={22} /> Unggah Template
            </button>
          </div>
        </div>

        {activeTab === 'templates' ? (
          loading ? <SkeletonList count={3} /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(t => (
                <motion.div key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card group hover:border-blue-200 transition-all p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileText size={24} />
                    </div>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <h4 className="font-black text-slate-800 mb-1">{t.nama_template}</h4>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{t.deskripsi || 'Tidak ada deskripsi.'}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2.5 py-1 bg-slate-50 rounded-lg">
                      {t.jenis_surat.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={12} />
                      {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full py-20 text-center card border-dashed">
                  <FileText size={48} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-400 font-medium">Belum ada template yang diunggah.</p>
                </div>
              )}
            </div>
          )
        ) : (
          /* ── Arsip Surat ── */
          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Nomor Surat</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Jenis</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Industri</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Digenerate Oleh</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {archives.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText size={16} />
                          </div>
                          <span className="font-bold text-slate-700">{a.nomor_surat}</span>
                        </div>
                      </td>
                      <td className="p-5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {a.jenis_surat.replace('_', ' ')}
                      </td>
                      <td className="p-5 text-sm font-bold text-slate-600">
                        {a.metadata?.industri || '-'}
                      </td>
                      <td className="p-5 text-sm text-slate-500">
                        {a.user?.name}
                      </td>
                      <td className="p-5 text-xs text-slate-400">
                        {new Date(a.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-5 text-right">
                        <a 
                          href={`${import.meta.env.VITE_STORAGE_URL ?? 'http://localhost:8000/storage'}/${a.path_file}`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn btn-secondary py-2 px-4 rounded-xl text-xs font-black inline-flex items-center gap-2"
                        >
                          Buka / Download
                        </a>
                      </td>
                    </tr>
                  ))}
                  {archives.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <Clock size={48} className="mx-auto text-slate-100 mb-4" />
                        <p className="text-slate-400 font-medium">Belum ada arsip surat.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Unggah Template</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Template</label>
                  <input type="text" className="form-input py-3 rounded-xl" required value={form.nama_template} onChange={e => setForm({...form, nama_template: e.target.value})} placeholder="e.g. Template Permohonan 2024" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Jenis Surat</label>
                  <select className="form-input py-3 rounded-xl" value={form.jenis_surat} onChange={e => setForm({...form, jenis_surat: e.target.value})}>
                    <option value="surat_permohonan">Surat Permohonan</option>
                    <option value="surat_tugas">Surat Tugas</option>
                    <option value="sertifikat">Sertifikat</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Deskripsi</label>
                  <textarea className="form-input py-3 rounded-xl h-20 resize-none" value={form.deskripsi} onChange={e => setForm({...form, deskripsi: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">File Template (.docx)</label>
                  <div className="relative group">
                    <input 
                      type="file" accept=".docx" required
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      onChange={e => setForm({...form, file_template: e.target.files?.[0] || null})}
                    />
                    <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${form.file_template ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 group-hover:border-blue-200 bg-slate-50'}`}>
                      {form.file_template ? (
                        <div className="flex flex-col items-center text-emerald-600">
                          <FileCheck size={32} className="mb-2" />
                          <p className="text-xs font-bold">{form.file_template.name}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <Upload size={32} className="mb-2" />
                          <p className="text-xs font-medium">Klik atau drop file di sini</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn btn-secondary py-4 rounded-2xl font-bold">Batal</button>
                  <button type="submit" disabled={submitting} className="flex-[2] btn btn-primary py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                    <Save size={18} /> {submitting ? 'Mengunggah...' : 'Unggah'}
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
