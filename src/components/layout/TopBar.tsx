/**
 * components/layout/TopBar.tsx
 * Top header — sticky, dengan tahun ajar selector dan logout.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, LogOut, Calendar, ChevronDown } from 'lucide-react';
import { removeToken, getUser } from '@/lib/auth';
import { useTahunAjar } from '@/lib/TahunAjarContext';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: React.ReactNode;
  subtitle?: string;
}

export default function TopBar({ title, showBack = false, backHref, rightAction, subtitle }: TopBarProps) {
  const navigate = useNavigate();
  const user = getUser();
  const { activeTahunAjar, allTahunAjar, setActiveTahunAjar } = useTahunAjar();

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';
  const fotoUrl = user?.siswa?.foto ? `${BASE_URL}/storage/${user.siswa.foto}` : null;

  const handleBack = () => {
    if (backHref) navigate(backHref);
    else navigate(-1);
  };

  return (
    <header className="mb-4 sticky top-0 z-50 flex items-center justify-between gap-3 px-4 md:px-6 h-16
      bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm shadow-slate-200/40">

      {/* Left: back/logo + title */}
      <div className="flex items-center gap-3 min-w-0">
        {showBack ? (
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        ) : null}

        <motion.div key={title} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="min-w-0">
          <h1 className="text-base font-black text-slate-800 tracking-tight truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{subtitle}</p>}
        </motion.div>
      </div>

      {/* Right: year selector + extra action + user + logout */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Tahun Ajar */}
        {allTahunAjar.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
            <Calendar size={13} className="text-indigo-500 flex-shrink-0" />
            <select
              value={activeTahunAjar?.id || ''}
              onChange={(e) => {
                const selected = allTahunAjar.find(t => t.id === parseInt(e.target.value));
                if (selected) setActiveTahunAjar(selected);
              }}
              className="bg-transparent text-[11px] font-bold text-indigo-700 outline-none cursor-pointer max-w-[130px]"
            >
              {allTahunAjar.map(t => (
                <option key={t.id} value={t.id}>TA {t.tahun_ajaran} ({t.semester})</option>
              ))}
            </select>
          </div>
        )}

        {rightAction}

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-1">
          {fotoUrl ? (
            <img src={fotoUrl} alt={user?.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
              {user?.name?.charAt(0) ?? '?'}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => { removeToken(); navigate('/login'); }}
          className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Keluar"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
