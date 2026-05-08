import React, { createContext, useContext, useState, useEffect } from 'react';
import { tahunAjarApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import type { TahunAjar } from '@/lib/types';

interface TahunAjarContextType {
  activeTahunAjar: TahunAjar | null;
  setActiveTahunAjar: (tahun: TahunAjar) => void;
  allTahunAjar: TahunAjar[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const TahunAjarContext = createContext<TahunAjarContextType | undefined>(undefined);

export const TahunAjarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTahunAjar, setActiveTahunAjarState] = useState<TahunAjar | null>(null);
  const [allTahunAjar, setAllTahunAjar] = useState<TahunAjar[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await tahunAjarApi.list();
      const data = res.data.data;
      if (Array.isArray(data)) {
        setAllTahunAjar(data);
        
        // Cek jika ada yang aktif di local storage
        const savedId = localStorage.getItem('active_tahun_ajaran_id');
        let active = null;
        
        if (savedId) {
          active = data.find(t => t.id === parseInt(savedId));
        }
        
        // Jika tidak ada di local storage atau tidak ditemukan, ambil yang is_active: true dari API
        if (!active) {
          active = data.find(t => t.is_active);
        }
        
        // Fallback ke yang pertama jika masih tidak ada
        if (!active && data.length > 0) {
          active = data[0];
        }
        
        if (active) {
          setActiveTahunAjarState(active);
          localStorage.setItem('active_tahun_ajaran_id', active.id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch tahun ajar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      refresh();
    } else {
      setLoading(false);
    }
  }, []);

  const setActiveTahunAjar = (tahun: TahunAjar) => {
    setActiveTahunAjarState(tahun);
    localStorage.setItem('active_tahun_ajaran_id', tahun.id.toString());
  };

  return (
    <TahunAjarContext.Provider value={{ activeTahunAjar, setActiveTahunAjar, allTahunAjar, loading, refresh }}>
      {children}
    </TahunAjarContext.Provider>
  );
};

export const useTahunAjar = () => {
  const context = useContext(TahunAjarContext);
  if (context === undefined) {
    throw new Error('useTahunAjar must be used within a TahunAjarProvider');
  }
  return context;
};
