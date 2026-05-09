/**
 * pages/siswa/IndustryDetailPage.tsx
 * Detail lengkap industri — MoU, GPS map, kontak, deskripsi, tombol ajukan.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { industriApi, pengajuanApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import {
  Building, MapPin, Briefcase, Phone, Mail, User,
  FileText, Send, ArrowLeft, Globe, AlertCircle
} from 'lucide-react';
import type { Industri } from '@/lib/types';

export default function IndustryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [industri, setIndustri] = useState<Industri | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    industriApi.show(Number(id))
      .then(res => setIndustri(res.data.data))
      .catch(() => showToast('Gagal memuat detail industri.', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!industri) return;
    if (!industri.is_active) {
      showToast('Industri ini sedang tidak menerima pendaftaran PKL.', 'error');
      return;
    }
    setApplying(true);
    try {
      await pengajuanApi.create({ industri_id: industri.id });
      showToast('Pengajuan berhasil dikirim!', 'success');
      navigate('/pengajuan-pkl');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengirim pengajuan.', 'error');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Detail Industri" />
        <div className="page-container py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-slate-100 rounded-3xl" />
            <div className="h-8 bg-slate-100 rounded-xl w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!industri) {
    return (
      <div className="min-h-screen">
        <TopBar title="Detail Industri" />
        <div className="page-container py-20 text-center">
          <p className="text-slate-400">Industri tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const hasGPS = industri.latitude && industri.longitude;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{industri.nama_industri} — Detail Industri | GRIDAS SAKTI</title>
        <meta name="description" content={`Informasi lengkap tentang ${industri.nama_industri} — ${industri.bidang_industri}. Lokasi, kontak, dan kuota PKL di SMKN 2 Sumedang.`} />
      </Helmet>
      {toast}
      <TopBar title="Detail Industri" />

      <div className="page-container py-6 max-w-3xl mx-auto">

        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-sm mb-6 transition-colors">
          <ArrowLeft size={18} /> Kembali
        </button>

        {/* ── Header Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card bg-gradient-to-br from-blue-600 to-indigo-800 text-white mb-6 relative overflow-hidden"
        >
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Building size={40} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black mb-2">{industri.nama_industri}</h1>
              <div className="flex items-center gap-2 text-blue-200 text-sm font-medium">
                <Briefcase size={16} /> {industri.bidang_industri}
              </div>
              {industri.mou && (
                <div className="flex items-center gap-2 mt-2 text-blue-200 text-xs font-medium">
                  <FileText size={14} /> MoU: {industri.mou}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InfoCard icon={<MapPin size={20} />} title="Alamat Lengkap" value={industri.alamat_lengkap} />
          {industri.telepon && <InfoCard icon={<Phone size={20} />} title="Telepon" value={industri.telepon} />}
          {industri.email && <InfoCard icon={<Mail size={20} />} title="Email HRD" value={industri.email} />}
          {industri.kontak_person && <InfoCard icon={<User size={20} />} title="Kontak Person" value={industri.kontak_person} />}
        </div>

        {/* ── Deskripsi ── */}
        {industri.deskripsi && (
          <section className="card mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Deskripsi</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{industri.deskripsi}</p>
          </section>
        )}

        {/* ── Map Preview (GPS) ── */}
        {hasGPS && (
          <section className="card mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Lokasi GPS</h3>
            <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-100">
              <iframe
                title="Lokasi Industri"
                width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                src={`https://www.google.com/maps?q=${industri.latitude},${industri.longitude}&z=15&output=embed`}
                allowFullScreen
              />
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-medium">
              <Globe size={14} /> {industri.latitude}, {industri.longitude}
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <div className="flex flex-col gap-4">
          {!industri.is_active && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <AlertCircle size={18} className="text-red-500" />
              <p className="text-sm font-bold text-red-700">Saat ini sedang tidak menerima pendaftaran PKL.</p>
            </div>
          )}
          <button
            onClick={handleApply}
            disabled={applying || !industri.is_active}
            className="flex-1 btn btn-primary py-5 rounded-2xl shadow-xl shadow-blue-100 font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? 'Mengirim...' : <><Send size={22} /> Ajukan PKL di Sini</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium mb-0.5">{title}</p>
        <p className="text-sm font-bold text-slate-700 leading-relaxed">{value}</p>
      </div>
    </div>
  );
}
