/**
 * layouts/DashboardLayout.tsx
 * Layout utama — Dark sidebar (desktop) + floating bottom nav (mobile).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  Settings, Zap, Briefcase, History,
  Database, Tag, Award, FileText, MapPin,
  ChevronLeft, ChevronRight, GraduationCap, Calendar,
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { isAuthenticated, getUser, setUser as setLocalUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import type { UserRole } from '@/lib/types';
import { useTahunAjar } from '@/lib/TahunAjarContext';

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

function getSidebarGroups(role: UserRole): SidebarGroup[] {
  switch (role) {
    case 'admin':
      return [
        {
          title: 'Navigasi Utama',
          items: [
            { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/> },
          ]
        },
        {
          title: 'Data Master',
          items: [
            { href: '/admin/users',           label: 'Kelola Pengguna',   icon: <Users size={18}/> },
            { href: '/admin/master-data',     label: 'Data Master',       icon: <Database size={18}/> },
            { href: '/admin/industri',        label: 'Master Industri',   icon: <Briefcase size={18}/> },
            { href: '/admin/kategori-jurnal', label: 'Kategori Jurnal',   icon: <Tag size={18}/> },
          ]
        },
        {
          title: 'Operasional PKL',
          items: [
            { href: '/admin/periode-pkl',     label: 'Penempatan PKL',    icon: <GraduationCap size={18}/> },
            { href: '/pengajuan-pkl',         label: 'Pengajuan PKL',     icon: <ClipboardList size={18}/> },
            { href: '/presensi/rekap',        label: 'Rekap Absen',       icon: <Calendar size={18}/> },
            { href: '/admin/surat',           label: 'Manajemen Surat',   icon: <FileText size={18}/> },
            { href: '/visitasi',              label: 'Visitasi',          icon: <MapPin size={18}/> },
          ]
        },
        {
          title: 'Sistem',
          items: [
            { href: '/admin/logs',            label: 'Log Aktivitas',     icon: <History size={18}/> },
          ]
        }
      ];
    case 'guru':
      return [
        {
          title: 'Navigasi Utama',
          items: [
            { href: '/dashboard',         label: 'Beranda',     icon: <LayoutDashboard size={18}/> },
          ]
        },
        {
          title: 'Bimbingan',
          items: [
            { href: '/monitoring',        label: 'Monitoring',  icon: <Users size={18}/> },
            { href: '/jurnal-verifikasi', label: 'Verifikasi Jurnal', icon: <ClipboardList size={18}/> },
            { href: '/presensi/rekap',    label: 'Rekap Absen', icon: <Calendar size={18}/> },
          ]
        },
        {
          title: 'Penilaian & Visit',
          items: [
            { href: '/visitasi',          label: 'Visitasi',    icon: <MapPin size={18}/> },
            { href: '/penilaian',         label: 'Penilaian',   icon: <Award size={18}/> },
          ]
        },
        {
          title: 'Pengaturan',
          items: [
            { href: '/profile',           label: 'Profil Saya', icon: <Settings size={18}/> },
          ]
        }
      ];
    case 'pembimbing':
      return [
        {
          title: 'Navigasi Utama',
          items: [
            { href: '/dashboard',         label: 'Beranda',     icon: <LayoutDashboard size={18}/> },
          ]
        },
        {
          title: 'Bimbingan',
          items: [
            { href: '/monitoring',        label: 'Monitoring',  icon: <Users size={18}/> },
            { href: '/jurnal-verifikasi', label: 'Verifikasi Jurnal', icon: <ClipboardList size={18}/> },
            { href: '/presensi/verifikasi', label: 'Verifikasi Absen', icon: <Calendar size={18}/> },
          ]
        },
        {
          title: 'Penilaian',
          items: [
            { href: '/penilaian',         label: 'Penilaian',   icon: <Award size={18}/> },
          ]
        },
        {
          title: 'Pengaturan',
          items: [
            { href: '/profile',           label: 'Profil Saya', icon: <Settings size={18}/> },
          ]
        }
      ];
    case 'siswa':
      return [
        {
          title: 'Navigasi Utama',
          items: [
            { href: '/dashboard',        label: 'Beranda',      icon: <LayoutDashboard size={18}/> },
          ]
        },
        {
          title: 'Kegiatan PKL',
          items: [
            { href: '/presensi',         label: 'Presensi Harian', icon: <MapPin size={18}/> },
            { href: '/jurnal',           label: 'Jurnal PKL',   icon: <BookOpen size={18}/> },
          ]
        },
        {
          title: 'Informasi',
          items: [
            { href: '/daftar-industri',  label: 'Daftar Mitra', icon: <Briefcase size={18}/> },
            { href: '/pengajuan-pkl',    label: 'Pengajuan',    icon: <ClipboardList size={18}/> },
          ]
        },
        {
          title: 'Pengaturan',
          items: [
            { href: '/profile',          label: 'Profil Saya',  icon: <Settings size={18}/> },
          ]
        }
      ];
    default:
      return [];
  }
}

function getRoleBadgeColor(role: UserRole) {
  const map: Record<UserRole, string> = {
    admin:      'bg-purple-500/20 text-purple-300',
    guru:       'bg-blue-500/20 text-blue-300',
    pembimbing: 'bg-emerald-500/20 text-emerald-300',
    siswa:      'bg-amber-500/20 text-amber-300',
  };
  return map[role] || 'bg-gray-500/20 text-gray-300';
}

function getRoleLabel(role: UserRole) {
  const map: Record<UserRole, string> = {
    admin:      'Administrator',
    guru:       'Pembimbing Sekolah',
    pembimbing: 'Pembimbing Industri',
    siswa:      'Peserta PKL',
  };
  return map[role] || role;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [ready, setReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUserState] = useState(getUser());
  const { refresh: refreshTahunAjar } = useTahunAjar();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
    } else {
      setReady(true);
      refreshTahunAjar();
      authApi.me().then(res => {
        const latestUser = res.data.data;
        setLocalUser(latestUser);
        setUserState(latestUser);
      }).catch(() => {});
    }
  }, [navigate]);

  if (!ready) return null;

  const groups = user ? getSidebarGroups(user.role) : [];
  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';
  const fotoUrl = user?.siswa?.foto ? `${BASE_URL}/storage/${user.siswa.foto}` : null;

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">

      {/* ── Sidebar Desktop ── */}
      <aside
        className={`hidden md:flex flex-col sticky top-0 h-screen transition-all duration-300 flex-shrink-0
          ${isSidebarOpen ? 'w-64' : 'w-[68px]'}`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 h-16 px-4 border-b border-white/5 flex-shrink-0`}>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
            <Zap size={20} fill="currentColor" />
          </div>
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-black text-white text-lg tracking-tight leading-none">GRIDAS<span className="text-indigo-400">SAKTI</span></p>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">PKL Management</p>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto scrollbar-hide">
          {groups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {isSidebarOpen ? (
                <p className="px-3 text-[10px] font-extrabold text-white/25 uppercase tracking-widest mb-1.5 mt-3 select-none">
                  {group.title}
                </p>
              ) : (
                <div className="h-px bg-white/5 my-3 mx-2" />
              )}
              {group.items.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    title={!isSidebarOpen ? item.label : ''}
                    className={`sidebar-link ${isActive ? 'active' : ''} ${!isSidebarOpen ? 'justify-center px-0' : ''}`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-white/40'}`}>
                      {item.icon}
                    </span>
                    {isSidebarOpen && <span className="truncate">{item.label}</span>}
                    {isSidebarOpen && isActive && (
                      <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-5 bg-indigo-400 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors ${!isSidebarOpen ? 'justify-center' : ''}`}>
            {/* Avatar */}
            {fotoUrl ? (
              <img src={fotoUrl} alt={user?.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-black text-sm flex-shrink-0">
                {user?.name?.charAt(0) ?? '?'}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white/90 truncate">{user?.name}</p>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${getRoleBadgeColor(user?.role as UserRole)}`}>
                  {getRoleLabel(user?.role as UserRole)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-[72px] w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all shadow-lg z-10"
        >
          {isSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex-1 pb-6"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <BottomNav />
    </div>
  );
}
