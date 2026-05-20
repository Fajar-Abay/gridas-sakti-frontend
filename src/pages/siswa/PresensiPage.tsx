/**
 * pages/siswa/PresensiPage.tsx
 * Halaman Presensi Harian Siswa (Masuk, Pulang, Sakit, Izin) dengan Geolocation.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import TopBar from '@/components/layout/TopBar';
import { presensiApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import {
  Calendar, Clock, CheckCircle, AlertTriangle,
  Upload, FileText, Compass, MapPin, Check,
  X, HelpCircle, Activity,
} from 'lucide-react';

export default function PresensiPage() {
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // States data presensi hari ini & penempatan
  const [todayData, setTodayData] = useState<any>(null);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // Geolocation & Form States
  const [status, setStatus] = useState<'hadir' | 'sakit' | 'izin'>('hadir');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [keteranganIzin, setKeteranganIzin] = useState('');
  const [lampiranIzin, setLampiranIzin] = useState<File | null>(null);

  // Hitung jarak ke tempat PKL
  const [distance, setDistance] = useState<number | null>(null);

  const fetchTodayStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await presensiApi.today();
      setTodayData(res.data.data);
    } catch {
      showToast('Gagal memuat status presensi hari ini.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await presensiApi.riwayat();
      setRiwayat(res.data.data);
    } catch {
      showToast('Gagal memuat riwayat presensi.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchTodayStatus();
    fetchHistory();
  }, [fetchTodayStatus, fetchHistory]);

  // Request GPS permission and coordinates with high accuracy try and low accuracy fallback
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Browser Anda tidak mendukung deteksi lokasi.');
      return;
    }

    if (!window.isSecureContext) {
      setGeoError('Akses diblokir: Geolocation memerlukan koneksi aman (HTTPS) atau diakses via localhost (http://localhost / http://127.0.0.1). Jika menggunakan IP lokal (misalnya http://192.168.x.x), deteksi lokasi tidak diizinkan oleh browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });
      setGeoLoading(false);

      // Jika ada koordinat industri, hitung jarak
      const indLat = todayData?.placement?.industri?.latitude;
      const indLon = todayData?.placement?.industri?.longitude;
      if (indLat && indLon) {
        const dist = calculateHaversineDistance(latitude, longitude, indLat, indLon);
        setDistance(dist);
      }
    };

    navigator.geolocation.getCurrentPosition(
      successCallback,
      (error) => {
        console.warn(`High accuracy geolocation failed: ${error.message}. Trying standard accuracy...`);
        navigator.geolocation.getCurrentPosition(
          successCallback,
          (fallbackError) => {
            setGeoLoading(false);
            switch (fallbackError.code) {
              case fallbackError.PERMISSION_DENIED:
                setGeoError('Izin lokasi ditolak. Mohon aktifkan akses lokasi pada browser Anda.');
                break;
              case fallbackError.POSITION_UNAVAILABLE:
                setGeoError('Informasi lokasi tidak tersedia.');
                break;
              case fallbackError.TIMEOUT:
                setGeoError('Waktu deteksi lokasi habis. Silakan periksa GPS Anda dan coba lagi.');
                break;
              default:
                setGeoError('Gagal mendeteksi lokasi.');
            }
          },
          { enableHighAccuracy: false, timeout: 15000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Trigger GPS detection when "hadir" is selected
  useEffect(() => {
    if (status === 'hadir' && todayData?.placement && !todayData?.presensi) {
      detectLocation();
    }
  }, [status, todayData]);

  // Haversine formula on client
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radius bumi dalam meter
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSubmitMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todayData?.placement) return;

    if (status === 'hadir' && !coords) {
      showToast('Koordinat GPS tidak terdeteksi. Mengirim presensi tanpa lokasi...', 'warning');
    }

    setSubmitting(true);
    try {
      await presensiApi.submit({
        status,
        latitude: status === 'hadir' ? coords?.latitude : undefined,
        longitude: status === 'hadir' ? coords?.longitude : undefined,
        keterangan_izin: status !== 'hadir' ? keteranganIzin : undefined,
        lampiran_izin: status !== 'hadir' ? lampiranIzin || undefined : undefined,
      });

      showToast('Presensi hari ini berhasil dikirim!', 'success');
      fetchTodayStatus();
      fetchHistory();
      setKeteranganIzin('');
      setLampiranIzin(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengirim presensi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePresensiPulang = async () => {
    setSubmitting(true);
    try {
      await presensiApi.submitPulang({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      showToast('Presensi pulang berhasil dicatat!', 'success');
      fetchTodayStatus();
      fetchHistory();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal mengirim presensi pulang.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (s: string) => {
    if (s === 'hadir') return 'success';
    if (s === 'sakit') return 'warning';
    if (s === 'izin') return 'info';
    return 'danger';
  };

  const hasPlacement = !!todayData?.placement;
  const isCheckedIn = !!todayData?.presensi;
  const isCheckedOut = isCheckedIn && !!todayData?.presensi?.jam_pulang;

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>Presensi Harian PKL | GRIDAS SAKTI</title>
      </Helmet>
      {toast}
      <TopBar title="Presensi Harian" subtitle="Absensi kehadiran siswa di industri" />

      <div className="page-container py-5 space-y-6">
        {loading ? (
          <div className="card space-y-4 animate-pulse">
            <div className="h-6 bg-slate-100 rounded w-1/4" />
            <div className="h-20 bg-slate-100 rounded" />
          </div>
        ) : !hasPlacement ? (
          <div className="card border-dashed text-center py-12">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-3 animate-bounce" />
            <p className="font-bold text-slate-700 mb-1">Penempatan PKL Belum Aktif</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Anda tidak dapat melakukan presensi karena belum memiliki penempatan industri yang aktif atau disetujui Hubin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ══ COLUMN LEFT: Form Presensi ══ */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Presensi Card Status */}
              <div className="card bg-white relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    <span className="font-bold text-slate-700 text-sm">
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {isCheckedIn ? (
                    <Badge variant={getStatusBadgeVariant(todayData.presensi.status)}>
                      {todayData.presensi.status.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="gray">BELUM PRESENSI</Badge>
                  )}
                </div>

                {/* Belum Check In */}
                {!isCheckedIn && (
                  <form onSubmit={handleSubmitMasuk} className="space-y-4">
                    <div>
                      <label className="form-label">Tipe Kehadiran</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['hadir', 'sakit', 'izin'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setStatus(t)}
                            className={`py-3 px-4 rounded-xl border-2 font-bold text-xs capitalize transition-all flex items-center justify-center gap-1.5
                              ${status === t 
                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' 
                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                          >
                            {t === 'hadir' && <MapPin size={14} />}
                            {t === 'sakit' && <Activity size={14} />}
                            {t === 'izin' && <FileText size={14} />}
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Jika PILIH HADIR -> Deteksi Lokasi */}
                    {status === 'hadir' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Compass size={12} className={geoLoading ? 'animate-spin' : ''} /> Deteksi Geolocation (GPS)
                          </span>
                          <button
                            type="button"
                            onClick={detectLocation}
                            disabled={geoLoading}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            Ulangi Deteksi
                          </button>
                        </div>

                        {geoLoading && (
                          <p className="text-xs text-slate-500 animate-pulse">Mencari sinyal GPS dan mengukur akurasi...</p>
                        )}

                        {geoError && (
                          <div className="flex items-start gap-2 text-red-600">
                            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold leading-relaxed">{geoError}</p>
                          </div>
                        )}

                        {coords && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100">
                              <div><strong>Latitude:</strong> {coords.latitude.toFixed(6)}</div>
                              <div><strong>Longitude:</strong> {coords.longitude.toFixed(6)}</div>
                            </div>
                            
                            {distance !== null ? (
                              <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2
                                ${distance <= 100 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-red-50 text-red-700 border border-red-100'}`}
                              >
                                {distance <= 100 ? (
                                  <CheckCircle size={14} />
                                ) : (
                                  <AlertTriangle size={14} />
                                )}
                                <span>
                                  Jarak Anda: {Math.round(distance)} meter dari Instansi.
                                  {distance <= 100 ? ' (Boleh melakukan presensi)' : ' (Terlalu jauh, maks 100m)'}
                                </span>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100 text-xs font-semibold">
                                Instansi ini belum mengatur lokasi GPS. Anda dapat langsung mengirim presensi.
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Jika PILIH SAKIT / IZIN -> Upload Lampiran */}
                    {status !== 'hadir' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="form-label">Alasan / Keterangan Surat</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Contoh: Demam tinggi dari semalam dan harus bed rest sesuai arahan dokter."
                            className="form-input resize-none"
                            value={keteranganIzin}
                            onChange={(e) => setKeteranganIzin(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="form-label">Unggah Lampiran (.pdf / .png / .jpg, maks 2MB)</label>
                          <div className="relative">
                            <label className="upload-zone flex flex-col items-center justify-center p-5">
                              <Upload size={24} className="text-slate-400 mb-2" />
                              <span className="text-xs font-bold text-slate-500">
                                {lampiranIzin ? lampiranIzin.name : 'Pilih File Lampiran'}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => setLampiranIzin(e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary w-full py-3.5"
                    >
                      {submitting ? 'Mengirim Presensi...' : 'Kirim Presensi Masuk'}
                    </button>
                  </form>
                )}

                {/* Sudah Check In & Belum Check Out */}
                {isCheckedIn && !isCheckedOut && (
                  <div className="space-y-5 py-2">
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100/60 flex items-start gap-3">
                      <Clock size={20} className="text-indigo-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-indigo-900">Sudah Melakukan Presensi Masuk</p>
                        <p className="text-[11px] text-indigo-700/80 mt-0.5">
                          Jam Masuk: <strong>{todayData.presensi.jam_masuk}</strong>
                        </p>
                      </div>
                    </div>

                    {todayData.presensi.status === 'hadir' ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Validasi GPS Pulang
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">Deteksi lokasi pulang sebelum tap Check Out</span>
                            <button
                              type="button"
                              onClick={detectLocation}
                              disabled={geoLoading}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                            >
                              Deteksi Lokasi
                            </button>
                          </div>

                          {coords && distance !== null && (
                            <div className={`p-2 rounded text-xs font-semibold mt-2
                              ${distance <= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                            >
                              Jarak: {Math.round(distance)} meter dari Instansi.
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handlePresensiPulang}
                          disabled={submitting}
                          className="btn btn-primary w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-700 hover:brightness-110 shadow-emerald-100"
                        >
                          {submitting ? 'Mengirim...' : 'Presensi Pulang (Check Out)'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center italic py-2">
                        Anda sedang berhalangan hadir (Sakit/Izin). Tidak diperlukan presensi pulang.
                      </p>
                    )}
                  </div>
                )}

                {/* Sudah Check In & Sudah Check Out */}
                {isCheckedOut && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                      <Check size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Presensi Hari Ini Selesai</p>
                      <p className="text-xs text-slate-400 mt-1">Sampai jumpa besok pagi! Tetap semangat menjalani PKL.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Jam Masuk</p>
                        <p className="font-bold text-slate-700">{todayData.presensi.jam_masuk}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Jam Pulang</p>
                        <p className="font-bold text-slate-700">{todayData.presensi.jam_pulang || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ══ COLUMN RIGHT: Info Penempatan & Ketentuan ══ */}
            <div className="space-y-6">
              
              {/* Penempatan Card */}
              <div className="card">
                <h3 className="font-bold text-slate-800 text-sm mb-3">Tempat Penempatan</h3>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {todayData?.placement?.industri?.nama_industri}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">
                      {todayData?.placement?.industri?.bidang_industri}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-1">
                      {todayData?.placement?.industri?.alamat_lengkap}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ketentuan Card */}
              <div className="card text-slate-600 space-y-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <HelpCircle size={16} className="text-indigo-600" /> Aturan Presensi
                </h3>
                <ul className="text-xs space-y-2 list-disc list-inside leading-relaxed text-slate-500">
                  <li>Presensi masuk dilakukan saat tiba di industri mitra.</li>
                  <li>Sistem mengukur GPS ponsel Anda secara langsung. Jarak maksimum adalah <strong>100 Meter</strong> dari titik industri.</li>
                  <li>Jika sakit/izin wajib melampirkan berkas bukti resmi (Surat Dokter/Surat Izin Orang Tua).</li>
                  <li>Kehadiran Anda akan diverifikasi secara langsung oleh Pembimbing Industri di akhir pekan.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ══ SECTION: Riwayat Presensi ══ */}
        <div className="card">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Riwayat Kehadiran</h3>
          
          {riwayat.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">Belum ada riwayat kehadiran.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5">Tanggal</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Jam Masuk</th>
                    <th className="py-2.5">Jam Pulang</th>
                    <th className="py-2.5">Persetujuan</th>
                    <th className="py-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {riwayat.map((r) => (
                    <tr key={r.id} className="text-slate-600">
                      <td className="py-3 font-semibold">
                        {new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3">
                        <Badge variant={getStatusBadgeVariant(r.status)}>
                          {r.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 font-medium">{r.jam_masuk || '-'}</td>
                      <td className="py-3 font-medium">{r.jam_pulang || '-'}</td>
                      <td className="py-3">
                        {r.is_verified_pembimbing ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check size={12} /> Disetujui
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Pending</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 max-w-xs truncate">{r.catatan_pembimbing || '-'}</td>
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
