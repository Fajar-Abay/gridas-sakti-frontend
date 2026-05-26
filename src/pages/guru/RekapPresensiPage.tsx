/**
 * pages/guru/RekapPresensiPage.tsx
 * Halaman Rekapitulasi Presensi Bulanan Siswa PKL (Akses Guru & Admin).
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { presensiApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import {
  Calendar, Users, BookOpen, AlertTriangle,
  Download, Printer, Search, TrendingUp,
} from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktobers' }, // Typos in Indonesian translations sometimes happen, but let's keep it proper: Oktober
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

export default function RekapPresensiPage() {
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Filter States
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');

  // Data Rekap
  const [rekapList, setRekapList] = useState<any[]>([]);

  const fetchRekap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await presensiApi.rekap({ month, year });
      setRekapList(res.data.data);
    } catch {
      showToast('Gagal memuat rekapitulasi presensi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, year, showToast]);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      showToast('Menyiapkan file Excel rekap absensi...', 'info');
      const res = await presensiApi.exportExcel({ month, year });
      const url = window.URL.createObjectURL(new Blob([res.data as any]));
      const link = document.createElement('a');
      link.href = url;
      const monthLabel = MONTHS.find(m => m.value === month)?.label || 'Bulan';
      link.setAttribute('download', `rekap_absen_pkl_${monthLabel}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Rekap absensi berhasil diunduh.', 'success');
    } catch {
      showToast('Gagal mengunduh rekap absensi.', 'error');
    }
  };

  // Filter list by search term
  const filtered = rekapList.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.industri.toLowerCase().includes(search.toLowerCase()) ||
    (item.nis && item.nis.includes(search))
  );

  // Calculate overall metrics
  const avgAttendance = filtered.length > 0
    ? Math.round(filtered.reduce((acc, curr) => acc + curr.persentase_kehadiran, 0) / filtered.length)
    : 0;

  const totalAlpa = filtered.reduce((acc, curr) => acc + curr.alpa, 0);

  const getAttendanceColorClass = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600 bg-emerald-50';
    if (pct >= 80) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Rekap Absensi Bulanan | GRIDAS SAKTI</title>
      </Helmet>
      {toast}
      <TopBar title="Rekap Absen" subtitle="Rekapitulasi kehadiran bulanan bimbingan siswa" />

      <div className="page-container py-5 space-y-6 print:p-0">
        
        {/* ── FILTER & CONTROL PANEL ── */}
        <div className="card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa atau industri..."
                className="form-input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Month Filter */}
            <select
              className="form-input max-w-[140px]"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              className="form-input max-w-[100px]"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="btn btn-secondary gap-2 flex-1 md:flex-none border-dashed text-slate-700"
            >
              <Printer size={15} /> Cetak
            </button>
            <button
              onClick={handleExportExcel}
              className="btn btn-primary gap-2 flex-1 md:flex-none shadow-xl shadow-blue-100 flex items-center justify-center"
            >
              <Download size={15} /> Export Excel
            </button>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Siswa Bimbingan</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{filtered.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rata-rata Kehadiran</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{avgAttendance}%</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Akumulasi Alpa</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalAlpa} Hari</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>

        {/* ── TABLE VIEW ── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">
              Rekapitulasi Kehadiran Bulan {MONTHS.find(m => m.value === month)?.label} {year}
            </h4>
            <span className="hidden print:inline text-xs text-slate-400 font-bold">
              GRIDAS SAKTI PKL MANAGEMENT
            </span>
          </div>

          {loading ? (
            <div className="p-8 space-y-3 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-full" />
              <div className="h-6 bg-slate-100 rounded w-full" />
              <div className="h-6 bg-slate-100 rounded w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">Tidak ada data rekapitulasi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-5">No</th>
                    <th className="py-3 px-5">Nama Siswa</th>
                    <th className="py-3 px-5">Industri Placement</th>
                    <th className="py-3 px-5 text-center">Hari Kerja</th>
                    <th className="py-3 px-5 text-center text-emerald-600">Hadir (H)</th>
                    <th className="py-3 px-5 text-center text-amber-600">Sakit (S)</th>
                    <th className="py-3 px-5 text-center text-blue-600">Izin (I)</th>
                    <th className="py-3 px-5 text-center text-red-600">Alpa (A)</th>
                    <th className="py-3 px-5 text-center">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {filtered.map((item, idx) => (
                    <tr key={item.siswa_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-5 font-bold text-slate-800">
                        <div>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">NIS: {item.nis || '-'}</div>
                      </td>
                      <td className="py-3 px-5 font-medium">{item.industri}</td>
                      <td className="py-3 px-5 text-center font-bold">{item.workdays}</td>
                      <td className="py-3 px-5 text-center font-bold text-emerald-600">{item.hadir}</td>
                      <td className="py-3 px-5 text-center font-bold text-amber-600">{item.sakit}</td>
                      <td className="py-3 px-5 text-center font-bold text-blue-600">{item.izin}</td>
                      <td className="py-3 px-5 text-center font-bold text-red-600">{item.alpa}</td>
                      <td className="py-3 px-5 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-black ${getAttendanceColorClass(item.persentase_kehadiran)}`}>
                          {item.persentase_kehadiran}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
