/**
 * pages/monitoring/PenilaianPage.tsx
 * Penilaian PKL — Redesign v2. Mobile-first.
 * Hard Skill (40%): Pengetahuan, Keterampilan Teknis, Pemecahan Masalah
 * Soft Skill (60%): Kedisiplinan, Kejujuran, Kerjasama, Inisiatif, Komunikasi
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar';
import { penilaianApi, monitoringApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import {
  Award, Plus, X, Search, Pencil,
  Brain, Handshake, GraduationCap,
} from 'lucide-react';
import type { Penilaian, MonitoringSiswa } from '@/lib/types';

export default function PenilaianPage() {
  const user = getUser();
  const [penilaians, setPenilaians] = useState<Penilaian[]>([]);
  const [siswaList, setSiswaList] = useState<MonitoringSiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<Penilaian | null>(null);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();

  const defaultForm = {
    siswa_id: 0,
    periode_pkl_id: 0,
    tipe_penilai: user?.role === 'pembimbing' ? 'pembimbing' : 'guru',
    pengetahuan: 75,
    keterampilan_teknis: 75,
    pemecahan_masalah: 75,
    kedisiplinan: 80,
    kejujuran: 80,
    kerjasama: 75,
    inisiatif: 70,
    komunikasi: 75,
    catatan: '',
  };
  const [form, setForm] = useState(defaultForm);

  const openModal = (item: Penilaian | null = null) => {
    setEditItem(item);
    if (item) {
      setForm({
        siswa_id: item.siswa_id,
        periode_pkl_id: item.periode_pkl_id,
        tipe_penilai: item.tipe_penilai,
        pengetahuan: item.pengetahuan,
        keterampilan_teknis: item.keterampilan_teknis,
        pemecahan_masalah: item.pemecahan_masalah,
        kedisiplinan: item.kedisiplinan,
        kejujuran: item.kejujuran,
        kerjasama: item.kerjasama,
        inisiatif: item.inisiatif,
        komunikasi: item.komunikasi,
        catatan: item.catatan || '',
      });
    } else {
      setForm(defaultForm);
    }
    setIsModalOpen(true);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [penRes, siswaRes] = await Promise.all([penilaianApi.list(), monitoringApi.siswa()]);
      setPenilaians(Array.isArray(penRes.data.data) ? penRes.data.data : []);
      setSiswaList(Array.isArray(siswaRes.data.data) ? siswaRes.data.data : []);
    } catch { showToast('Gagal memuat data.', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.siswa_id) { showToast('Pilih siswa terlebih dahulu.', 'error'); return; }
    setSubmitting(true);
    try {
      if (editItem) { await penilaianApi.update(editItem.id, form as any); showToast('Penilaian diperbarui!', 'success'); }
      else { await penilaianApi.create(form as any); showToast('Penilaian disimpan!', 'success'); }
      setIsModalOpen(false); fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menyimpan penilaian.', 'error');
    } finally { setSubmitting(false); }
  };

  const calcAvg = (p: Penilaian) => {
    const hard = (p.pengetahuan + p.keterampilan_teknis + p.pemecahan_masalah) / 3;
    const soft = (p.kedisiplinan + p.kejujuran + p.kerjasama + p.inisiatif + p.komunikasi) / 5;
    return (hard * 0.4 + soft * 0.6).toFixed(1);
  };

  const getGrade = (val: number) => {
    if (val >= 90) return { label: 'A', bg: 'bg-emerald-100 text-emerald-700' };
    if (val >= 80) return { label: 'B', bg: 'bg-blue-100 text-blue-700' };
    if (val >= 70) return { label: 'C', bg: 'bg-amber-100 text-amber-700' };
    return { label: 'D', bg: 'bg-red-100 text-red-700' };
  };

  const filtered = penilaians.filter(p =>
    !search || ((p as any).siswa?.user?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Penilaian PKL" subtitle="Nilai kompetensi siswa" />

      <div className="page-container py-5">

        {/* Action Bar */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Cari siswa..." className="form-input pl-11"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <button onClick={() => openModal()} className="btn btn-primary btn-sm gap-1 flex-shrink-0">
            <Plus size={15}/> <span className="hidden sm:inline">Beri Penilaian</span>
          </button>
        </div>

        {/* List */}
        {loading ? <SkeletonList count={3}/> : (
          <div className="space-y-3">
            {filtered.length > 0 ? filtered.map((p, idx) => {
              const avg = Number(calcAvg(p));
              const grade = getGrade(avg);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card group hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Grade Badge */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black flex-shrink-0 ${grade.bg}`}>
                        {grade.label}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{(p as any).siswa?.user?.name || `Siswa #${p.siswa_id}`}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Oleh: {(p as any).penilai?.name || 'N/A'} ·{' '}
                          {p.tipe_penilai === 'guru' ? 'Guru Pembimbing' : 'Pembimbing Industri'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-2xl font-black text-slate-800 stat-number">{avg}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Nilai Akhir</p>
                      </div>
                      <button
                        onClick={() => openModal(p)}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-colors"
                      >
                        <Pencil size={13}/>
                      </button>
                    </div>
                  </div>

                  {/* Mini bars */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                    <MiniBar label="Teknis" value={Math.round((p.pengetahuan + p.keterampilan_teknis + p.pemecahan_masalah) / 3)}/>
                    <MiniBar label="Disiplin" value={p.kedisiplinan}/>
                    <MiniBar label="Kerjasama" value={p.kerjasama}/>
                    <MiniBar label="Inisiatif" value={p.inisiatif}/>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="card border-dashed text-center py-12">
                <Award size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="text-slate-400 font-medium">Belum ada penilaian yang dibuat.</p>
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
              className="relative bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[94dvh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="font-black text-slate-800">{editItem ? 'Edit' : 'Form'} Penilaian PKL</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Hard Skill (40%) + Soft Skill (60%)</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X size={16}/>
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                <form onSubmit={handleSubmit} id="penilaian-form" className="p-5 space-y-5">
                  {/* Pilih Siswa */}
                  <div>
                    <label className="form-label flex items-center gap-1"><GraduationCap size={11}/> Pilih Siswa *</label>
                    <select
                      required
                      className="form-input"
                      value={form.siswa_id}
                      onChange={e => {
                        const sid = Number(e.target.value);
                        const sObj = siswaList.find(s => s.id === sid);
                        setForm({ 
                          ...form, 
                          siswa_id: sid, 
                          periode_pkl_id: sObj?.periode_pkl_id || 0 
                        });
                      }}
                    >
                      <option value={0}>-- Pilih Siswa --</option>
                      {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} — {s.kelas}</option>)}
                    </select>
                  </div>

                  {/* Hard Skill */}
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                        <Brain size={14}/>
                      </div>
                      <span className="text-sm font-black text-blue-800">Hard Skill — Bobot 40%</span>
                    </div>
                    <div className="space-y-3">
                      <SliderField label="Pengetahuan" value={form.pengetahuan} onChange={v => setForm({...form, pengetahuan: v})} />
                      <SliderField label="Keterampilan Teknis" value={form.keterampilan_teknis} onChange={v => setForm({...form, keterampilan_teknis: v})} />
                      <SliderField label="Pemecahan Masalah" value={form.pemecahan_masalah} onChange={v => setForm({...form, pemecahan_masalah: v})} />
                    </div>
                  </div>

                  {/* Soft Skill */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                        <Handshake size={14}/>
                      </div>
                      <span className="text-sm font-black text-emerald-800">Soft Skill — Bobot 60%</span>
                    </div>
                    <div className="space-y-3">
                      <SliderField label="Kedisiplinan" value={form.kedisiplinan} onChange={v => setForm({...form, kedisiplinan: v})} />
                      <SliderField label="Kejujuran" value={form.kejujuran} onChange={v => setForm({...form, kejujuran: v})} />
                      <SliderField label="Kerjasama" value={form.kerjasama} onChange={v => setForm({...form, kerjasama: v})} />
                      <SliderField label="Inisiatif" value={form.inisiatif} onChange={v => setForm({...form, inisiatif: v})} />
                      <SliderField label="Komunikasi" value={form.komunikasi} onChange={v => setForm({...form, komunikasi: v})} />
                    </div>
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="form-label">Catatan (opsional)</label>
                    <textarea className="form-input resize-none" rows={2} placeholder="Catatan tambahan penilaian..."
                      value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})}/>
                  </div>
                </form>
              </div>

              <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1">Batal</button>
                <button type="submit" form="penilaian-form" disabled={submitting} className="btn btn-primary flex-[2] gap-2">
                  <Award size={15}/> {submitting ? 'Menyimpan...' : 'Simpan Penilaian'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 80 ? 'text-emerald-600' : value >= 60 ? 'text-amber-600' : 'text-red-500';
  const barColor = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`text-xs font-black ${color}`}>{value}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${value}%` }}/>
        </div>
        <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
          className="w-20 h-1.5 cursor-pointer accent-indigo-600"/>
      </div>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 mb-1 truncate">{label}</p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }}/>
        </div>
        <span className="text-[10px] font-black text-slate-600 flex-shrink-0">{value}</span>
      </div>
    </div>
  );
}
