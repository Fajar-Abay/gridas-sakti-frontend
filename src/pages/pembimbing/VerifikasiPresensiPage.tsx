/**
 * pages/pembimbing/VerifikasiPresensiPage.tsx
 * Halaman verifikasi presensi harian siswa oleh Pembimbing Industri.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { presensiApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import {
  Calendar, Check, X, FileText, Download,
  User, CheckSquare, Edit3, MessageSquare, AlertCircle,
  Filter, Search, Users
} from 'lucide-react';

export default function VerifikasiPresensiPage() {
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States for Date Range Filter
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to past 7 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // States for Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('all');

  // Checkbox batch selection state
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Attendance lists
  const [attendances, setAttendances] = useState<any[]>([]);

  // Modal / Verification Edit State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isVerified, setIsVerified] = useState(true);
  const [catatan, setCatatan] = useState('');
  const [manualStatus, setManualStatus] = useState<'hadir' | 'sakit' | 'izin' | 'alpa'>('hadir');

  // Batch Verify Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchCatatan, setBatchCatatan] = useState('');

  const fetchAttendances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await presensiApi.siswa({
        start_date: startDate,
        end_date: endDate
      });
      setAttendances(res.data.data);
      // Clear selection keys on refresh
      setSelectedKeys([]);
    } catch {
      showToast('Gagal memuat daftar presensi siswa.', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  // Extract unique students for dropdown filter
  const uniqueStudents = Array.from(
    new Map(
      attendances
        .filter(item => item.siswa)
        .map(item => [item.siswa.id, item.siswa])
    ).values()
  );

  // Helper key generator
  const getItemKey = (item: any) => {
    return item.id ? String(item.id) : `mock-${item.siswa_id}-${item.tanggal}`;
  };

  // Filtered List
  const filteredAttendances = attendances.filter(item => {
    // Filter by selected student dropdown
    if (selectedSiswaId !== 'all' && String(item.siswa_id) !== selectedSiswaId) {
      return false;
    }
    // Filter by name text search
    if (searchQuery.trim() !== '') {
      const name = item.siswa?.user?.name?.toLowerCase() || '';
      const nis = item.siswa?.nis?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      if (!name.includes(q) && !nis.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Checkbox handlers
  const toggleSelectItem = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getUnverifiedFilteredKeys = () => {
    return filteredAttendances
      .filter(item => !item.is_verified_pembimbing)
      .map(item => getItemKey(item));
  };

  const handleSelectAll = () => {
    const unverifiedKeys = getUnverifiedFilteredKeys();
    const allSelected = unverifiedKeys.every(k => selectedKeys.includes(k));

    if (allSelected) {
      // Deselect all filtered unverified items
      setSelectedKeys(prev => prev.filter(k => !unverifiedKeys.includes(k)));
    } else {
      // Select all filtered unverified items
      setSelectedKeys(prev => {
        const next = [...prev];
        unverifiedKeys.forEach(k => {
          if (!next.includes(k)) next.push(k);
        });
        return next;
      });
    }
  };

  const handleOpenVerifyModal = (item: any) => {
    setSelectedItem(item);
    setIsVerified(item.is_verified_pembimbing || true);
    setCatatan(item.catatan_pembimbing || '');
    setManualStatus(item.status || 'hadir');
  };

  // Single verification saving
  const handleSaveVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSaving(true);
    try {
      const isManual = selectedItem.id === null;
      const endpointId = isManual ? 'create-manual' : selectedItem.id;
      
      const payload: any = {
        is_verified: isVerified,
        catatan_pembimbing: catatan,
      };

      if (isManual) {
        payload.siswa_id = selectedItem.siswa_id;
        payload.tanggal = selectedItem.tanggal;
        payload.status = manualStatus;
      }

      await presensiApi.verify(endpointId, payload);
      showToast('Presensi berhasil diverifikasi!', 'success');
      setSelectedItem(null);
      fetchAttendances();
    } catch {
      showToast('Gagal memproses verifikasi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Batch verification saving
  const handleSaveBatchVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKeys.length === 0) return;

    setSaving(true);
    try {
      const promises = selectedKeys.map(key => {
        const item = attendances.find(a => getItemKey(a) === key);
        if (!item) return Promise.resolve();

        const isManual = item.id === null;
        const endpointId = isManual ? 'create-manual' : item.id;
        const payload: any = {
          is_verified: true,
          catatan_pembimbing: batchCatatan || undefined,
        };

        if (isManual) {
          payload.siswa_id = item.siswa_id;
          payload.tanggal = item.tanggal;
          payload.status = item.status;
        }

        return presensiApi.verify(endpointId, payload);
      });

      await Promise.all(promises);
      showToast(`${selectedKeys.length} presensi berhasil diverifikasi secara massal!`, 'success');
      setSelectedKeys([]);
      setIsBatchModalOpen(false);
      setBatchCatatan('');
      fetchAttendances();
    } catch {
      showToast('Terjadi kesalahan saat memverifikasi massal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeVariant = (s: string) => {
    if (s === 'hadir') return 'success';
    if (s === 'sakit') return 'warning';
    if (s === 'izin') return 'info';
    return 'danger';
  };

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';

  const unverifiedFilteredKeys = getUnverifiedFilteredKeys();
  const isAllSelected = unverifiedFilteredKeys.length > 0 && unverifiedFilteredKeys.every(k => selectedKeys.includes(k));

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Verifikasi Absensi PKL | GRIDAS SAKTI</title>
      </Helmet>
      {toast}
      <TopBar title="Verifikasi Absen" subtitle="Konfirmasi & persetujuan presensi siswa" />

      <div className="page-container py-5 space-y-6">
        
        {/* ── FILTERS & SEARCH ── */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Filter size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Filter & Pencarian</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dari Tanggal</label>
              <input
                type="date"
                className="form-input text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Sampai Tanggal</label>
              <input
                type="date"
                className="form-input text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Filter Student Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Siswa Bimbingan</label>
              <select
                className="form-input text-xs"
                value={selectedSiswaId}
                onChange={(e) => setSelectedSiswaId(e.target.value)}
              >
                <option value="all">Semua Siswa</option>
                {uniqueStudents.map((siswa: any) => (
                  <option key={siswa.id} value={String(siswa.id)}>
                    {siswa.user?.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Search */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cari Nama / NIS</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan kata kunci..."
                  className="form-input text-xs pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── BATCH ACTION HEADER ── */}
        <AnimatePresence>
          {selectedKeys.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="text-indigo-600" size={20} />
                <span className="text-xs font-bold text-indigo-900">
                  {selectedKeys.length} presensi dipilih untuk verifikasi massal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedKeys([])}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="btn btn-primary btn-sm bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                >
                  Verifikasi Massal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ATTENDANCE LIST & SELECT ALL ── */}
        <div className="space-y-4">
          {!loading && filteredAttendances.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-indigo-600 accent-indigo-600 border-slate-300 rounded cursor-pointer"
                />
                <span>Pilih Semua yang Belum Verifikasi ({unverifiedFilteredKeys.length})</span>
              </button>
              <span className="text-xs text-slate-400">Total: {filteredAttendances.length} baris</span>
            </div>
          )}

          {loading ? (
            <div className="card space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-1/4" />
              <div className="h-12 bg-slate-100 rounded" />
              <div className="h-12 bg-slate-100 rounded" />
            </div>
          ) : filteredAttendances.length === 0 ? (
            <div className="card text-center py-12 border-dashed">
              <Calendar size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-slate-500 mb-1">Tidak Ada Data Absensi</p>
              <p className="text-xs text-slate-400">Coba ubah filter pencarian atau jangkauan tanggal Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAttendances.map((item, idx) => {
                const key = getItemKey(item);
                const isSelected = selectedKeys.includes(key);

                return (
                  <motion.div
                    key={key + '-' + idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className={`card border-l-4 relative ${
                      item.is_verified_pembimbing
                        ? 'border-l-emerald-500 bg-emerald-50/5'
                        : item.status === 'alpa'
                        ? 'border-l-red-500 bg-red-50/20'
                        : 'border-l-amber-500 bg-amber-50/5'
                    } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Checkbox & Profile */}
                      <div className="flex items-center gap-3">
                        {!item.is_verified_pembimbing && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(key)}
                            className="w-4 h-4 text-indigo-600 accent-indigo-600 border-slate-300 rounded cursor-pointer mr-1"
                          />
                        )}
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <User size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{item.siswa?.user?.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                            <span>NIS: {item.siswa?.nis || '-'}</span>
                            <span>•</span>
                            <span className="text-indigo-600 flex items-center gap-0.5">
                              <Calendar size={10} /> {item.tanggal}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Attendance status log */}
                      <div className="grid grid-cols-3 gap-4 text-xs text-center border-t border-b border-slate-50 md:border-none py-2.5 md:py-0">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Status</p>
                          <Badge variant={getStatusBadgeVariant(item.status)}>{item.status.toUpperCase()}</Badge>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Jam Masuk</p>
                          <span className="font-semibold text-slate-700">{item.jam_masuk || '-'}</span>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Jam Pulang</p>
                          <span className="font-semibold text-slate-700">{item.jam_pulang || '-'}</span>
                        </div>
                      </div>

                      {/* Actions and verification statuses */}
                      <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
                        
                        {/* Document lampiran (sakit/izin) */}
                        {item.lampiran_izin && (
                          <a
                            href={`${BASE_URL}/storage/${item.lampiran_izin}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-xs gap-1 border-dashed text-amber-700 hover:text-amber-800"
                          >
                            <Download size={12} /> Bukti Lampiran
                          </a>
                        )}

                        {item.is_verified_pembimbing ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                            <Check size={14} /> Terverifikasi
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenVerifyModal(item)}
                            className="btn btn-primary btn-sm gap-1"
                          >
                            <CheckSquare size={13} /> Verifikasi
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Keterangan Izin / Catatan */}
                    {(item.keterangan_izin || item.catatan_pembimbing) && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        {item.keterangan_izin && (
                          <p className="text-slate-600">
                            <strong>Alasan Izin:</strong> {item.keterangan_izin}
                          </p>
                        )}
                        {item.catatan_pembimbing && (
                          <p className={`font-medium ${item.catatan_pembimbing.includes('[Sistem:') ? 'text-red-600 bg-red-50/50 p-1.5 rounded border border-red-100/60' : 'text-slate-500 italic'}`}>
                            <strong>Catatan:</strong> {item.catatan_pembimbing}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: VERIFIKASI SINGLE PRESENSI ── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base">Verifikasi Presensi</h3>
                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveVerification} className="space-y-4">
                
                {/* Details */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-700">{selectedItem.siswa?.user?.name}</p>
                  <p className="text-slate-500">Tanggal: {selectedItem.tanggal}</p>
                  <p className="text-slate-500">Status Awal: <strong className="uppercase">{selectedItem.status}</strong></p>
                </div>

                {/* Manual Override Status (Hanya jika manual creation / belum absen/alpa) */}
                {selectedItem.id === null && (
                  <div>
                    <label className="form-label">Ubah Status Menjadi</label>
                    <select
                      className="form-input"
                      value={manualStatus}
                      onChange={(e: any) => setManualStatus(e.target.value)}
                    >
                      <option value="hadir">HADIR</option>
                      <option value="sakit">SAKIT</option>
                      <option value="izin">IZIN</option>
                      <option value="alpa">ALPA</option>
                    </select>
                  </div>
                )}

                {/* Checkbox verification */}
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="chkVerify"
                    className="w-4 h-4 text-indigo-600 accent-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                  />
                  <label htmlFor="chkVerify" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Tandai Sebagai "Terverifikasi / Setuju"
                  </label>
                </div>

                {/* Catatan Pembimbing */}
                <div>
                  <label className="form-label">Catatan / Keterangan Tambahan</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Datang tepat waktu / Surat izin sudah dikonfirmasi langsung oleh instansi."
                    className="form-input resize-none"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>

                {/* Submit actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="btn btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary flex-1"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: VERIFIKASI MASSAL ── */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBatchModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base">Verifikasi Massal ({selectedKeys.length} Absensi)</h3>
                <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBatchVerification} className="space-y-4">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-950">
                  <AlertCircle className="text-indigo-600 flex-shrink-0 mt-0.5" size={16} />
                  <p>
                    Semua <strong>{selectedKeys.length} data absensi</strong> yang dipilih akan ditandai sebagai <strong>Terverifikasi / Setuju</strong> secara bersamaan.
                  </p>
                </div>

                {/* Catatan Pembimbing Massal */}
                <div>
                  <label className="form-label">Catatan Bersama (Opsional)</label>
                  <textarea
                    rows={3}
                    placeholder="Masukkan catatan jika ingin memberikan catatan yang sama untuk semua siswa yang dipilih."
                    className="form-input resize-none"
                    value={batchCatatan}
                    onChange={(e) => setBatchCatatan(e.target.value)}
                  />
                </div>

                {/* Submit actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                  >
                    {saving ? 'Memproses...' : 'Setujui Semua'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
