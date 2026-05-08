/**
 * pages/siswa/PengajuanPage.tsx
 * Pengajuan PKL — Riwayat & Form Mandiri dengan field lengkap. Redesign v2.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { pengajuanApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { getUser } from '@/lib/auth';
import Badge, { getPengajuanBadgeVariant, getPengajuanStatusLabel } from '@/components/ui/Badge';
import {
  FileText, Plus, Building, MapPin, ChevronRight, Download,
  Upload, Briefcase, CheckCircle, AlertCircle, Send,
  Phone, Mail, User, ClipboardList,
  Info,
} from 'lucide-react';

const EMPTY_FORM = {
  nama_industri: '',
  bidang_industri: '',
  deskripsi: '',
  alamat_lengkap: '',
  longitude: '',
  latitude: '',
  telepon: '',
  email: '',
  kontak_person: '',
  kuota: '',
};

export default function PengajuanPage() {
  const [user, setUser] = useState(getUser());
  const isPlaced = user?.siswa?.status === 'sudah_ditempatkan' || user?.siswa?.status === 'selesai_pkl';

  const [activeTab, setActiveTab] = useState<'riwayat' | 'mandiri'>('riwayat');
  const [pengajuans, setPengajuans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const fetchPengajuans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pengajuanApi.list();
      const raw = res.data.data;
      setPengajuans(Array.isArray(raw) ? raw : (raw as any).data || []);
    } catch {
      showToast('Gagal memuat data pengajuan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPengajuans();
    const interval = setInterval(() => {
      const latest = getUser();
      if (JSON.stringify(latest) !== JSON.stringify(user)) setUser(latest);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchPengajuans, user]);

  const handleSubmitMandiri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlaced) { showToast('Akses dibatasi karena Anda sudah ditempatkan.', 'error'); return; }
    if (!formData.nama_industri.trim()) { showToast('Nama instansi wajib diisi.', 'error'); return; }
    if (!formData.alamat_lengkap.trim()) { showToast('Alamat lengkap wajib diisi.', 'error'); return; }

    setSubmitting(true);
    try {
      await pengajuanApi.createMandiri({
        nama_industri: formData.nama_industri,
        bidang_industri: formData.bidang_industri,
        alamat_lengkap: formData.alamat_lengkap,
        kontak_person: formData.kontak_person,
        telepon: formData.telepon,
        email: formData.email,
        deskripsi: formData.deskripsi,
        kuota: formData.kuota ? parseInt(formData.kuota) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      });
      showToast('Pengajuan mandiri berhasil dikirim!', 'success');
      setActiveTab('riwayat');
      fetchPengajuans();
      setFormData(EMPTY_FORM);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengirim pengajuan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSurat = async (id: number) => {
    try {
      showToast('Menyiapkan dokumen...', 'info');
      const res = await pengajuanApi.downloadSuratPermohonan(id);
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Surat_Permohonan_PKL_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showToast('Gagal mengunduh surat.', 'error');
    }
  };

  const handleUploadBalasan = async (id: number, file: File) => {
    try {
      await pengajuanApi.uploadSuratBalasan(id, file);
      showToast('Surat balasan berhasil diunggah!', 'success');
      fetchPengajuans();
    } catch {
      showToast('Gagal mengunggah surat balasan.', 'error');
    }
  };

  const tabs: { key: 'riwayat' | 'mandiri'; label: string; icon: React.ReactNode }[] = [
    { key: 'riwayat', label: 'Riwayat Pengajuan', icon: <ClipboardList size={15}/> },
    ...(!isPlaced ? [{ key: 'mandiri' as const, label: 'Tambah Instansi Baru', icon: <Plus size={15}/> }] : []),
  ];

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Pengajuan PKL" subtitle="Pengajuan & riwayat penempatan" />

      <div className="page-container py-5">

        {/* Placed warning */}
        {isPlaced && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-amber-50 border-amber-200 mb-5 flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0"/>
            <div>
              <p className="text-sm font-bold text-amber-900">Pengajuan Terkunci</p>
              <p className="text-xs text-amber-700/80">Status Anda sudah ditempatkan. Pengajuan baru tidak dapat dilakukan.</p>
            </div>
          </motion.div>
        )}

        {/* Tab Bar */}
        <div className="tab-bar mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══ TAB RIWAYAT ══ */}
          {activeTab === 'riwayat' && (
            <motion.div
              key="riwayat"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
            >
              {/* CTA to browse industry */}
              <Link
                to="/daftar-industri"
                className="block card bg-gradient-to-br from-indigo-600 to-indigo-800 text-white mb-5 relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <Building size={20} className="text-indigo-200"/>
                    <h3 className="font-black text-base">Daftar Mitra Industri</h3>
                  </div>
                  <p className="text-sm text-indigo-200 mb-3">Pilih dari ratusan perusahaan mitra yang sudah terdaftar.</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-white/20 px-3 py-1.5 rounded-full">
                    Jelajahi Sekarang <ChevronRight size={12}/>
                  </span>
                </div>
                <Building className="absolute -bottom-6 -right-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform"/>
              </Link>

              {/* List */}
              {loading ? <SkeletonList count={3}/> : (
                <div className="space-y-3">
                  {pengajuans.length > 0 ? pengajuans.map((p, idx) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="card"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Building size={20}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-slate-800 text-sm truncate flex-1">{p.industri?.nama_industri || `Pengajuan #${p.id}`}</h3>
                            <Badge variant={getPengajuanBadgeVariant(p.status)}>{getPengajuanStatusLabel(p.status)}</Badge>
                          </div>
                          {p.industri?.bidang_industri && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">
                              <Briefcase size={9}/> {p.industri.bidang_industri}
                            </span>
                          )}
                          {p.industri?.alamat_lengkap && (
                            <p className="text-xs text-slate-500 flex items-start gap-1 line-clamp-1">
                              <MapPin size={10} className="flex-shrink-0 mt-0.5"/> {p.industri.alamat_lengkap}
                            </p>
                          )}
                          {p.alasan_penolakan && (
                            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                              <p className="text-xs text-red-700"><strong>Alasan:</strong> {p.alasan_penolakan}</p>
                            </div>
                          )}

                          {/* Actions */}
                          {p.status === 'approved' && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <button
                                onClick={() => handleDownloadSurat(p.id)}
                                className="btn btn-sm btn-secondary gap-1"
                              >
                                <Download size={12}/> Surat Permohonan
                              </button>
                              <label className="btn btn-sm btn-primary gap-1 cursor-pointer">
                                <Upload size={12}/> Unggah Balasan
                                <input type="file" className="hidden" accept=".pdf,.jpg,.png"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadBalasan(p.id, f); }}/>
                              </label>
                            </div>
                          )}
                          {p.status === 'on_site' && (
                            <div className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                              <CheckCircle size={13}/> Sedang PKL di sini
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="card border-dashed text-center py-12">
                      <FileText size={36} className="mx-auto text-slate-200 mb-3"/>
                      <p className="font-semibold text-slate-500 mb-1">Belum ada pengajuan</p>
                      <p className="text-xs text-slate-400 mb-4">Ajukan dari daftar mitra atau tambahkan instansi sendiri.</p>
                      {!isPlaced && (
                        <button onClick={() => setActiveTab('mandiri')} className="btn btn-primary btn-sm gap-1">
                          <Plus size={14}/> Tambah Instansi Baru
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ TAB MANDIRI ══ */}
          {activeTab === 'mandiri' && !isPlaced && (
            <motion.div
              key="mandiri"
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* Info box */}
              <div className="card bg-indigo-50 border-indigo-100 mb-5">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-indigo-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-bold text-indigo-800 mb-0.5">Pengajuan Instansi Mandiri</p>
                    <p className="text-xs text-indigo-700/80 leading-relaxed">
                      Isi data perusahaan pilihan Anda yang belum terdaftar sebagai mitra. Pastikan data akurat agar proses verifikasi Hubin lebih cepat.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitMandiri} className="space-y-5">

                {/* Informasi Dasar */}
                <section className="card p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="section-title mb-0 flex items-center gap-2">
                      <Building size={13}/> Informasi Perusahaan
                    </p>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="form-label">Nama Perusahaan / Instansi <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="text"
                        placeholder="PT. Teknologi Maju Jaya"
                        className="form-input"
                        value={formData.nama_industri}
                        onChange={set('nama_industri')}
                      />
                    </div>
                    <div>
                      <label className="form-label">Bidang Usaha / Industri <span className="text-red-500">*</span></label>
                      <select
                        className="form-input"
                        value={formData.bidang_industri}
                        onChange={set('bidang_industri')}
                        required
                      >
                        <option value="">-- Pilih Bidang --</option>
                        <option value="Teknologi Informasi">Teknologi Informasi</option>
                        <option value="Manufaktur">Manufaktur</option>
                        <option value="Perbankan & Keuangan">Perbankan & Keuangan</option>
                        <option value="Retail & Perdagangan">Retail & Perdagangan</option>
                        <option value="Perhotelan & Pariwisata">Perhotelan & Pariwisata</option>
                        <option value="Kesehatan & Farmasi">Kesehatan & Farmasi</option>
                        <option value="Pendidikan">Pendidikan</option>
                        <option value="Konstruksi & Properti">Konstruksi & Properti</option>
                        <option value="Otomotif">Otomotif</option>
                        <option value="Media & Kreatif">Media & Kreatif</option>
                        <option value="Pemerintahan / BUMN">Pemerintahan / BUMN</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Perkiraan Kuota Siswa</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Contoh: 5"
                        className="form-input"
                        value={formData.kuota}
                        onChange={set('kuota')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Deskripsi Singkat Perusahaan</label>
                      <textarea
                        rows={2}
                        placeholder="Tuliskan gambaran singkat tentang perusahaan dan kegiatannya..."
                        className="form-input resize-none"
                        value={formData.deskripsi}
                        onChange={set('deskripsi')}
                      />
                    </div>
                  </div>
                </section>

                {/* Alamat */}
                <section className="card p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="section-title mb-0 flex items-center gap-2">
                      <MapPin size={13}/> Lokasi
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="form-label">Alamat Lengkap <span className="text-red-500">*</span></label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Jl. Merdeka No. 123, Kec. Sumedang Utara, Kab. Sumedang, Jawa Barat 45311"
                        className="form-input resize-none"
                        value={formData.alamat_lengkap}
                        onChange={set('alamat_lengkap')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Latitude (opsional)</label>
                        <input
                          type="text"
                          placeholder="-6.8456"
                          className="form-input"
                          value={formData.latitude}
                          onChange={set('latitude')}
                        />
                      </div>
                      <div>
                        <label className="form-label">Longitude (opsional)</label>
                        <input
                          type="text"
                          placeholder="107.9234"
                          className="form-input"
                          value={formData.longitude}
                          onChange={set('longitude')}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin size={10}/> Koordinat membantu sekolah memverifikasi lokasi instansi.
                    </p>
                  </div>
                </section>

                {/* Kontak */}
                <section className="card p-0 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="section-title mb-0 flex items-center gap-2">
                      <User size={13}/> Informasi Kontak
                    </p>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Nama Kontak Person</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                          type="text"
                          placeholder="Bapak/Ibu Hendra"
                          className="form-input pl-9"
                          value={formData.kontak_person}
                          onChange={set('kontak_person')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Nomor Telepon / WhatsApp</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                          type="tel"
                          placeholder="0812 xxxx xxxx"
                          className="form-input pl-9"
                          value={formData.telepon}
                          onChange={set('telepon')}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Email Perusahaan</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input
                          type="email"
                          placeholder="hrd@perusahaan.com"
                          className="form-input pl-9"
                          value={formData.email}
                          onChange={set('email')}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Submit */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('riwayat')}
                    className="btn btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary flex-[2] gap-2"
                  >
                    {submitting ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Mengirim...</>
                    ) : (
                      <><Send size={16}/> Kirim Pengajuan</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
