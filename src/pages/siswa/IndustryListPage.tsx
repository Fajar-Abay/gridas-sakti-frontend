/**
 * pages/siswa/IndustryListPage.tsx
 * Daftar Mitra Industri — redesign v2.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { industriApi, pengajuanApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { getUser } from '@/lib/auth';
import {
  Search, Building, MapPin, Briefcase, Phone, Send,
  ChevronRight, AlertCircle, Users,
} from 'lucide-react';
import type { Industri } from '@/lib/types';

export default function IndustryListPage() {
  const [user] = useState(getUser());
  const isPlaced = user?.siswa?.status === 'sudah_ditempatkan' || user?.siswa?.status === 'selesai_pkl';

  const [industris, setIndustris] = useState<Industri[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  const [hasActivePengajuan, setHasActivePengajuan] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);

  const fetchIndustries = useCallback(async () => {
    setLoading(true);
    try {
      const [indRes, pengRes] = await Promise.allSettled([
        industriApi.list(),
        pengajuanApi.list()
      ]);

      if (indRes.status === 'fulfilled') {
        const raw = indRes.value.data.data;
        setIndustris(Array.isArray(raw) ? raw : (raw as any).data || []);
      } else {
        showToast('Gagal memuat daftar industri.', 'error');
      }

      if (pengRes.status === 'fulfilled') {
        const raw = pengRes.value.data.data;
        const list = Array.isArray(raw) ? raw : (raw as any).data || [];
        const hasActive = list.some((p: any) => ['pending', 'approved', 'on_site'].includes(p.status));
        setHasActivePengajuan(hasActive);
      }
    } catch {
      showToast('Gagal memuat data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchIndustries(); }, [fetchIndustries]);

  const handleApply = async (id: number) => {
    if (isPlaced || hasActivePengajuan || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setApplyingId(id);
    try {
      await pengajuanApi.create({ industri_id: id });
      showToast('Pengajuan berhasil dikirim!', 'success');
      navigate('/pengajuan-pkl');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengirim pengajuan.', 'error');
      isSubmittingRef.current = false;
      setApplyingId(null);
    }
  };

  const filtered = industris.filter(i =>
    i.is_verified && i.is_active && (
      i.nama_industri.toLowerCase().includes(search.toLowerCase()) ||
      i.bidang_industri.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Daftar Mitra Industri PKL | GRIDAS SAKTI</title>
        <meta name="description" content="Jelajahi daftar perusahaan dan industri mitra PKL SMKN 2 Sumedang. Temukan tempat PKL yang sesuai dengan jurusan Anda." />
      </Helmet>
      {toast}
      <TopBar title="Daftar Mitra" subtitle="Industri mitra PKL" />

      <div className="page-container py-5">

        {/* Placed warning */}
        {isPlaced && (
          <div className="card bg-amber-50 border-amber-200 mb-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0"/>
            <p className="text-sm text-amber-800 font-semibold">
              Anda sudah mendapatkan penempatan PKL. Pengajuan tidak dapat dilakukan.
            </p>
          </div>
        )}

        {/* Active pengajuan warning */}
        {!isPlaced && hasActivePengajuan && (
          <div className="card bg-amber-50 border-amber-200 mb-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0"/>
            <p className="text-sm text-amber-800 font-semibold">
              Anda memiliki pengajuan aktif yang sedang diproses. Pengajuan tidak dapat dilakukan.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Building size={18}/>
            </div>
            <div>
              <p className="text-xl font-black text-slate-800">{filtered.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Industri</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Users size={18}/>
            </div>
            <div>
              <p className="text-xl font-black text-slate-800">{filtered.reduce((a, i) => a + i.sisa_kuota, 0)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sisa Kuota</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input
            type="text"
            placeholder="Cari industri atau bidang usaha..."
            className="form-input pl-11"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? <SkeletonList count={4}/> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.length > 0 ? filtered.map((i, idx) => (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="card group hover:border-indigo-200 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Building size={22}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate mb-1">{i.nama_industri}</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      <Briefcase size={10}/> {i.bidang_industri}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  <p className="text-xs text-slate-500 flex items-start gap-2">
                    <MapPin size={12} className="flex-shrink-0 mt-0.5 text-slate-400"/>
                    <span className="line-clamp-2">{i.alamat_lengkap}</span>
                  </p>
                  {i.telepon && (
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <Phone size={12} className="text-slate-400"/> {i.telepon}
                    </p>
                  )}
                </div>

                {/* Quota badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                    ${i.sisa_kuota > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {i.sisa_kuota > 0 ? `${i.sisa_kuota} kuota tersedia` : 'Kuota penuh'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={isPlaced || hasActivePengajuan || i.sisa_kuota === 0 || applyingId !== null}
                    onClick={() => handleApply(i.id!)}
                    className="flex-1 btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {applyingId === i.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    ) : (
                      <Send size={13}/>
                    )}
                    <span className="ml-1">
                      {applyingId === i.id
                        ? 'Mengirim...'
                        : isPlaced
                        ? 'Sudah PKL'
                        : hasActivePengajuan
                        ? 'Ada Pengajuan Aktif'
                        : 'Ajukan'}
                    </span>
                  </button>
                  <button
                    onClick={() => navigate(`/daftar-industri/${i.id}`)}
                    className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )) : (
              <div className="md:col-span-2 card border-dashed text-center py-12">
                <Building size={36} className="mx-auto text-slate-200 mb-3"/>
                <p className="font-semibold text-slate-500">Tidak ada industri yang cocok</p>
              </div>
            )}
          </div>
        )}

        {/* Custom application CTA */}
        <div className={`mt-6 p-5 rounded-2xl ${isPlaced ? 'bg-slate-100' : 'bg-slate-900'} relative overflow-hidden`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className={`font-black mb-1 ${isPlaced ? 'text-slate-600' : 'text-white'}`}>
                Punya target industri sendiri?
              </h3>
              <p className={`text-sm ${isPlaced ? 'text-slate-500' : 'text-slate-400'}`}>
                {isPlaced
                  ? 'Anda sudah mendapatkan penempatan PKL.'
                  : 'Ajukan instansi pilihan Anda yang belum ada dalam daftar mitra.'}
              </p>
            </div>
            <button
              disabled={isPlaced || hasActivePengajuan}
              onClick={() => navigate('/pengajuan-pkl')}
              className={`btn flex-shrink-0 ${isPlaced || hasActivePengajuan ? 'btn-secondary opacity-50 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
            >
              Tambah Instansi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
