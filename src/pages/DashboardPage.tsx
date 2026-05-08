/**
 * pages/DashboardPage.tsx
 * Halaman Dashboard — adaptif berdasarkan role user. Redesign v2.
 */

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { useToast } from '@/components/ui/Toast';
import { getUser } from '@/lib/auth';
import { monitoringApi, jurnalApi, pengajuanApi, userApi, dashboardApi } from '@/lib/api';
import Badge, {
  getJurnalBadgeVariant, getJurnalStatusLabel,
  getPengajuanBadgeVariant, getPengajuanStatusLabel,
} from '@/components/ui/Badge';
import type { User, Jurnal, MonitoringProfil, PengajuanPkl } from '@/lib/types';
import {
  Zap, BookOpen, CheckCircle, Clock, RotateCcw, GraduationCap, Building,
  Users, FileText, Briefcase, ChevronRight, PlusCircle, Database,
  AlertTriangle, Tag, MapPin, Award, ClipboardList, History,
  ArrowRight, TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [jurnals, setJurnals] = useState<Jurnal[]>([]);
  const [profilBimbingan, setProfilBimbingan] = useState<MonitoringProfil | null>(null);
  const [pengajuan, setPengajuan] = useState<PengajuanPkl[]>([]);
  const [totalUser, setTotalUser] = useState(0);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => { setUser(getUser()); }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (user.role === 'siswa') {
        const [jRes, pRes] = await Promise.allSettled([jurnalApi.list(), monitoringApi.profil()]);
        if (jRes.status === 'fulfilled') {
          const jData = jRes.value.data.data;
          setJurnals(Array.isArray(jData) ? jData.slice(0, 5) : (jData as any).data?.slice(0, 5) || []);
        }
        if (pRes.status === 'fulfilled') setProfilBimbingan(pRes.value.data.data);
      } else if (user.role === 'guru' || user.role === 'pembimbing') {
        const mRes = await monitoringApi.siswa();
        const mData = mRes.data.data;
        setTotalSiswa(Array.isArray(mData) ? mData.length : (mData as any).length || 0);
        const list = Array.isArray(mData) ? mData : (mData as any).data || [];
        setTotalPending(list.reduce((acc: number, s: any) => acc + s.jurnal_pending, 0));
        const allJurnals: Jurnal[] = [];
        for (const s of list.slice(0, 4)) {
          try {
            const j = await jurnalApi.bySiswa(s.id);
            const jData = j.data.data;
            const items = Array.isArray(jData) ? jData : (jData as any).data || [];
            allJurnals.push(...items);
          } catch {}
        }
        allJurnals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setJurnals(allJurnals.slice(0, 5));
      } else if (user.role === 'admin') {
        const [sRes, pRes] = await Promise.allSettled([dashboardApi.getAdminStats(), pengajuanApi.listAll()]);
        if (sRes.status === 'fulfilled') {
          const stats = sRes.value.data.data;
          setTotalUser(stats.total_user);
          setTotalSiswa(stats.total_siswa);
          setTotalPending(stats.total_ditolak); // Kita gunakan variabel ini untuk Ditolak
        }
        if (pRes.status === 'fulfilled') {
          const pData = pRes.value.data.data;
          const list = Array.isArray(pData) ? pData : (pData as any).data || [];
          setPengajuan(list.slice(0, 5));
        }
      }
    } catch {
      showToast('Gagal memuat data dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user) return null;

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';
  const fotoUrl = user?.siswa?.foto ? `${BASE_URL}/storage/${user.siswa.foto}` : null;

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Dashboard" subtitle={today} />

      <div className="page-container py-5">

        {/* ── Welcome Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl mb-5 p-5 md:p-7"
          style={{ background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)' }}
        >
          {/* Decorative elements */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -right-2 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">Selamat datang kembali 👋</p>
              <h2 className="text-2xl font-black text-white mb-2 leading-tight">{user.name}</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                  {user.role === 'siswa' ? 'Peserta PKL' : user.role === 'guru' ? 'Pembimbing Sekolah' : user.role === 'pembimbing' ? 'Pembimbing Industri' : 'Administrator'}
                </span>
              </div>
            </div>
            {/* Avatar */}
            {fotoUrl ? (
              <img src={fotoUrl} alt={user.name} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/20 flex-shrink-0"/>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white/10 text-white text-2xl font-black flex items-center justify-center flex-shrink-0 ring-4 ring-white/10">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Siswa: Status PKL Banner ── */}
        {user.role === 'siswa' && user.siswa && user.siswa.status === 'belum_ditempatkan' && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-amber-50 border-amber-200 mb-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20}/>
              </div>
              <div>
                <p className="font-bold text-amber-900 text-sm">Belum Ditempatkan</p>
                <p className="text-xs text-amber-700/80">Segera ajukan tempat PKL untuk memulai.</p>
              </div>
            </div>
            <Link to="/pengajuan-pkl" className="btn btn-sm flex-shrink-0" style={{ background: '#d97706', color: 'white' }}>
              Ajukan
            </Link>
          </motion.div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {user.role === 'siswa' && (
            <>
              <StatCard label="Jurnal" value={jurnals.length} icon={<BookOpen size={20}/>} color="indigo" />
              <StatCard label="Verified" value={jurnals.filter(j => j.status === 'verified').length} icon={<CheckCircle size={20}/>} color="emerald" />
              <StatCard label="Pending" value={jurnals.filter(j => j.status === 'pending').length} icon={<Clock size={20}/>} color="amber" />
              <StatCard label="Revisi" value={jurnals.filter(j => j.status === 'revision').length} icon={<RotateCcw size={20}/>} color="red" />
            </>
          )}
          {(user.role === 'guru' || user.role === 'pembimbing') && (
            <>
              <StatCard label="Bimbingan" value={totalSiswa} icon={<Users size={20}/>} color="indigo" span2 />
              <StatCard label="Pending" value={totalPending} icon={<Clock size={20}/>} color="amber" span2 />
            </>
          )}
          {user.role === 'admin' && (
            <>
              <StatCard label="Total User" value={totalUser} icon={<Users size={20}/>} color="indigo" />
              <StatCard label="Siswa PKL" value={totalSiswa} icon={<GraduationCap size={20}/>} color="emerald" />
              <StatCard label="Pengajuan" value={pengajuan.length} icon={<FileText size={20}/>} color="amber" />
              <StatCard label="Ditolak" value={totalPending} icon={<RotateCcw size={20}/>} color="red" />
            </>
          )}
        </div>

        {/* ── Content Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Main Column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Recent Activity */}
            {user.role !== 'admin' && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">Jurnal Terbaru</h3>
                  <Link to="/jurnal" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    Lihat Semua <ChevronRight size={14}/>
                  </Link>
                </div>
                {loading ? <SkeletonList count={3}/> : (
                  <div className="space-y-2">
                    {jurnals.length > 0 ? jurnals.map(j => (
                      <div key={j.id} className="card flex items-center justify-between gap-4 py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={16}/>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{j.judul_kegiatan}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {user.role === 'siswa'
                                ? new Date(j.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                : `Oleh: ${(j.siswa as any)?.user?.name || '-'}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getJurnalBadgeVariant(j.status)}>{getJurnalStatusLabel(j.status)}</Badge>
                      </div>
                    )) : (
                      <div className="card border-dashed text-center py-8">
                        <BookOpen size={28} className="mx-auto text-slate-200 mb-2"/>
                        <p className="text-slate-400 text-sm font-medium">Belum ada jurnal harian</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Admin: Pengajuan Terbaru */}
            {user.role === 'admin' && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">Pengajuan Terbaru</h3>
                  <Link to="/pengajuan-pkl" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    Lihat Semua <ChevronRight size={14}/>
                  </Link>
                </div>
                {loading ? <SkeletonList count={3}/> : (
                  <div className="space-y-2">
                    {pengajuan.length > 0 ? pengajuan.map(p => (
                      <div key={p.id} className="card flex items-center justify-between gap-4 py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                            <FileText size={16}/>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {(p.siswa as any)?.user?.name ?? `Pengajuan #${p.id}`}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{p.industri?.nama_industri}</p>
                          </div>
                        </div>
                        <Badge variant={getPengajuanBadgeVariant(p.status)}>{getPengajuanStatusLabel(p.status)}</Badge>
                      </div>
                    )) : (
                      <div className="card border-dashed text-center py-8">
                        <p className="text-slate-400 text-sm font-medium">Belum ada pengajuan PKL</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Side Column */}
          <div className="space-y-5">

            {/* Quick Actions — Siswa */}
            {user.role === 'siswa' && (
              <section className="card">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">⚡ Aksi Cepat</h3>
                <div className="space-y-2">
                  <Link to="/jurnal" className="btn btn-primary w-full justify-between">
                    <span>Tulis Jurnal Harian</span> <ArrowRight size={16}/>
                  </Link>
                  <Link to="/pengajuan-pkl" className="btn btn-secondary w-full justify-between">
                    <span>Ajukan Tempat PKL</span> <ArrowRight size={16}/>
                  </Link>
                  <Link to="/daftar-industri" className="btn btn-secondary w-full justify-between">
                    <span>Daftar Mitra Industri</span> <ArrowRight size={16}/>
                  </Link>
                </div>
              </section>
            )}

            {/* Profil Bimbingan — Siswa */}
            {user.role === 'siswa' && profilBimbingan && (
              <section className="card">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">👨‍🏫 Info Bimbingan</h3>
                <div className="space-y-2">
                  {profilBimbingan.guru_pembimbing && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={16}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{profilBimbingan.guru_pembimbing.nama}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pembimbing Sekolah</p>
                      </div>
                    </div>
                  )}
                  {profilBimbingan.pembimbing_instansi && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Building size={16}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{profilBimbingan.pembimbing_instansi.nama}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pembimbing Industri</p>
                      </div>
                    </div>
                  )}
                  {profilBimbingan.industri && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Briefcase size={16}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{profilBimbingan.industri.nama}</p>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Tempat PKL</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Admin Quick Links */}
            {user.role === 'admin' && (
              <section className="card">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">🔗 Navigasi Cepat</h3>
                <div className="grid grid-cols-2 gap-2">
                  <QuickLink to="/admin/users" label="Pengguna" icon={<Users size={16}/>} color="bg-indigo-50 text-indigo-600"/>
                  <QuickLink to="/admin/master-data" label="Data Master" icon={<Database size={16}/>} color="bg-purple-50 text-purple-600"/>
                  <QuickLink to="/admin/industri" label="Industri" icon={<Building size={16}/>} color="bg-cyan-50 text-cyan-600"/>
                  <QuickLink to="/admin/periode-pkl" label="Penempatan" icon={<Briefcase size={16}/>} color="bg-emerald-50 text-emerald-600"/>
                  <QuickLink to="/pengajuan-pkl" label="Pengajuan" icon={<ClipboardList size={16}/>} color="bg-amber-50 text-amber-600"/>
                  <QuickLink to="/admin/surat" label="Surat" icon={<FileText size={16}/>} color="bg-rose-50 text-rose-600"/>
                  <QuickLink to="/admin/kategori-jurnal" label="Kat. Jurnal" icon={<Tag size={16}/>} color="bg-pink-50 text-pink-600"/>
                  <QuickLink to="/admin/logs" label="Log" icon={<History size={16}/>} color="bg-slate-50 text-slate-600"/>
                </div>
              </section>
            )}

            {/* Guru/Pembimbing Quick Links */}
            {(user.role === 'guru' || user.role === 'pembimbing') && (
              <section className="card">
                <h3 className="font-bold text-slate-800 mb-3 text-sm">🔗 Menu</h3>
                <div className="space-y-1">
                  <MenuLink to="/monitoring" icon={<Users size={15}/>} label="Monitoring Siswa"/>
                  <MenuLink to="/jurnal-verifikasi" icon={<ClipboardList size={15}/>} label="Verifikasi Jurnal"/>
                  <MenuLink to="/penilaian" icon={<Award size={15}/>} label="Penilaian PKL"/>
                  {user.role === 'guru' && <MenuLink to="/visitasi" icon={<MapPin size={15}/>} label="Visitasi"/>}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ label, value, icon, color, span2 }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; span2?: boolean;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-500',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-4 ${span2 ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.indigo}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-black text-slate-800 stat-number">{value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

function QuickLink({ to, label, icon, color }: { to: string; label: string; icon: React.ReactNode; color: string }) {
  return (
    <Link to={to} className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 flex flex-col items-center gap-1.5 text-center transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <span className="text-[10px] font-bold text-slate-600 leading-tight">{label}</span>
    </Link>
  );
}

function MenuLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <span className="text-indigo-400 group-hover:text-indigo-600 transition-colors">{icon}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <ChevronRight size={14} className="ml-auto text-slate-300 group-hover:text-indigo-400 transition-colors"/>
    </Link>
  );
}
