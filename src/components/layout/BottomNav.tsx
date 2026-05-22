/**
 * components/layout/BottomNav.tsx
 * Dark floating pill bottom navigation — mobile only.
 */

import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  User, Briefcase, FileText, MapPin, Calendar
} from 'lucide-react';
import { getUser } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'siswa':
      return [
        { href: '/dashboard',       label: 'Beranda',   icon: <LayoutDashboard size={20}/> },
        { href: '/presensi',        label: 'Absen',     icon: <MapPin size={20}/> },
        { href: '/jurnal',          label: 'Jurnal',    icon: <BookOpen size={20}/> },
        { href: '/daftar-industri', label: 'Mitra',     icon: <Briefcase size={20}/> },
        { href: '/profile',         label: 'Profil',    icon: <User size={20}/> },
      ];
    case 'guru':
      return [
        { href: '/dashboard',         label: 'Beranda',   icon: <LayoutDashboard size={20}/> },
        { href: '/monitoring',        label: 'Monitor',   icon: <Users size={20}/> },
        { href: '/jurnal-verifikasi', label: 'Verifikasi',icon: <ClipboardList size={20}/> },
        { href: '/presensi/rekap',    label: 'Absen',     icon: <Calendar size={20}/> },
        { href: '/profile',           label: 'Profil',    icon: <User size={20}/> },
      ];
    case 'pembimbing':
      return [
        { href: '/dashboard',         label: 'Beranda',   icon: <LayoutDashboard size={20}/> },
        { href: '/monitoring',        label: 'Monitor',   icon: <Users size={20}/> },
        { href: '/jurnal-verifikasi', label: 'Verifikasi',icon: <ClipboardList size={20}/> },
        { href: '/presensi/verifikasi', label: 'Absen',    icon: <Calendar size={20}/> },
        { href: '/profile',           label: 'Profil',    icon: <User size={20}/> },
      ];
    case 'admin':
      return [
        { href: '/dashboard',        label: 'Beranda',   icon: <LayoutDashboard size={20}/> },
        { href: '/admin/users',      label: 'Pengguna',  icon: <Users size={20}/> },
        { href: '/presensi/rekap',   label: 'Absen',     icon: <Calendar size={20}/> },
        { href: '/pengajuan-pkl',    label: 'Pengajuan', icon: <ClipboardList size={20}/> },
        { href: '/admin/surat',      label: 'Surat',     icon: <FileText size={20}/> },
      ];
    default:
      return [];
  }
}

export default function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const user = getUser();

  if (!user) return null;

  const items = getNavItems(user.role);

  return (
    <div className="md:hidden">
      <nav className="bottom-nav">
        {items.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative"
            >
              {/* Active background blob */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  className="absolute inset-x-1 inset-y-1 rounded-[14px] bg-indigo-600/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                animate={{
                  color: isActive ? '#818cf8' : 'rgba(255,255,255,0.35)',
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.15 }}
                className="relative z-10"
              >
                {item.icon}
              </motion.div>

              <span
                className={`text-[9px] font-bold uppercase tracking-wide relative z-10 transition-colors duration-150
                  ${isActive ? 'text-indigo-300' : 'text-white/35'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
