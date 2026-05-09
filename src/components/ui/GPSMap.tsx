/**
 * components/ui/GPSMap.tsx
 * Komponen peta GPS menggunakan Leaflet untuk menampilkan:
 * - Lokasi industri PKL (marker merah)
 * - Posisi siswa saat ini (marker biru, bergerak)
 * - Lingkaran radius 150m area yang diizinkan
 * - Status apakah siswa di dalam atau luar area
 *
 * Tidak memerlukan API key apapun — pakai OpenStreetMap tile gratis.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

export interface LokasiPKL {
  industri_id: number;
  nama_industri: string;
  alamat_lengkap: string;
  bidang_industri: string;
  latitude: number | null;
  longitude: number | null;
  has_gps: boolean;
  radius_meter: number;
}

interface GPSMapProps {
  lokasiPKL: LokasiPKL;
  onPositionUpdate?: (pos: { lat: number; lon: number } | null) => void;
  /** Callback dipanggil dengan status apakah user di dalam area */
  onStatusChange?: (inArea: boolean, distance: number | null) => void;
}

// Haversine formula — jarak dalam meter
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GPSMap({ lokasiPKL, onPositionUpdate, onStatusChange }: GPSMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const userMarker = useRef<any>(null);
  const watchId = useRef<number | null>(null);

  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'ok' | 'error' | 'denied'>('loading');
  const [mapLoaded, setMapLoaded] = useState(false);

  const RADIUS = lokasiPKL.radius_meter;
  const inArea = distance !== null && distance <= RADIUS;

  // Muat Leaflet secara dinamis — tidak perlu install dependency
  useEffect(() => {
    if (!lokasiPKL.has_gps || !lokasiPKL.latitude || !lokasiPKL.longitude) return;

    // Tambah CSS Leaflet ke head jika belum ada
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load script Leaflet
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup sudah ada di effect bawah
    };
  }, [lokasiPKL.has_gps]);

  // Inisialisasi peta setelah Leaflet dimuat
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !lokasiPKL.latitude || !lokasiPKL.longitude) return;
    const L = (window as any).L;
    if (!L || leafletMap.current) return;

    const lat = lokasiPKL.latitude;
    const lng = lokasiPKL.longitude;

    // Inisialisasi peta
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 17);

    // Tile OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Marker industri (Technical SVG)
    const industryIcon = L.divIcon({
      html: `
        <div class="technical-marker industry">
          <div class="marker-ring"></div>
          <div class="marker-dot"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 22V7L7 2V7H12L17 2V7H22V22H2Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
            <path d="M17 12H17.01M17 16H17.01M12 12H12.01M12 16H12.01M7 12H7.01M7 16H7.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker([lat, lng], { icon: industryIcon })
      .addTo(map)
      .bindPopup(`
        <div class="custom-popup">
          <span class="popup-label">INDUSTRIAL SITE</span>
          <h4 class="popup-title">${lokasiPKL.nama_industri}</h4>
          <p class="popup-address">${lokasiPKL.alamat_lengkap}</p>
        </div>
      `);

    // Lingkaran radius (Minimalist technical stroke)
    L.circle([lat, lng], {
      radius: RADIUS,
      color: 'rgba(99, 102, 241, 0.4)',
      fillColor: 'rgba(99, 102, 241, 0.05)',
      fillOpacity: 1,
      weight: 1.5,
      dashArray: '4 6',
    }).addTo(map);

    // Label radius (Small technical tag)
    L.marker([lat + (RADIUS / 111320), lng], {
      icon: L.divIcon({
        html: `<div class="radius-tag">BOUNDARY: ${RADIUS}M</div>`,
        className: '',
        iconAnchor: [45, 0],
      }),
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, [mapLoaded, lokasiPKL, RADIUS]);

  // Update posisi user di peta
  const updateUserOnMap = useCallback((lat: number, lng: number) => {
    if (!leafletMap.current) return;
    const L = (window as any).L;
    if (!L) return;

    const userIcon = L.divIcon({
      html: `
        <div class="technical-marker user">
          <div class="pulse-ring"></div>
          <div class="marker-dot"></div>
        </div>
      `,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (userMarker.current) {
      userMarker.current.setLatLng([lat, lng]);
    } else {
      userMarker.current = L.marker([lat, lng], { icon: userIcon })
        .addTo(leafletMap.current)
        .bindPopup('<span class="popup-label">CURRENT POSITION</span>');
    }
  }, []);

  // GPS Tracking logic
  useEffect(() => {
    // 1. Cek browser context (Geolocation butuh HTTPS atau localhost)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setGpsStatus('error');
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const success = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setUserPos({ lat, lon });
      setGpsStatus('ok');
      onPositionUpdate?.({ lat, lon });
      updateUserOnMap(lat, lon);

      if (lokasiPKL.latitude && lokasiPKL.longitude) {
        const d = haversine(lat, lon, lokasiPKL.latitude, lokasiPKL.longitude);
        setDistance(Math.round(d));
        onStatusChange?.(d <= RADIUS, Math.round(d));
      }
    };

    const error = (err: GeolocationPositionError) => {
      if (import.meta.env.DEV) console.warn('GPS Attempt Failed:', err.code, err.message);
      
      // Stop watching if we hit a fatal error or repeated timeout
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }

      // Jika error 3 (Timeout) dan kita sedang pakai High Accuracy, 
      // coba lagi sekali tanpa High Accuracy (Standar/Wi-Fi based)
      if (err.code === 3 && options.enableHighAccuracy) {
        if (import.meta.env.DEV) console.log('Retrying with Standard Accuracy...');
        navigator.geolocation.getCurrentPosition(success, (err2) => {
          if (import.meta.env.DEV) console.error('GPS Final Failure:', err2.message);
          setGpsStatus('error');
          onPositionUpdate?.(null);
        }, { ...options, enableHighAccuracy: false, timeout: 5000 });
        return;
      }

      setGpsStatus(err.code === 1 ? 'denied' : 'error');
      onPositionUpdate?.(null);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, 
      maximumAge: 10000,
    };

    // Dapatkan posisi awal
    navigator.geolocation.getCurrentPosition(success, error, options);

    // Watch posisi real-time 
    watchId.current = navigator.geolocation.watchPosition(success, error, options);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [lokasiPKL, RADIUS, onPositionUpdate, onStatusChange, updateUserOnMap]);

  const refreshGPS = () => {
    setGpsStatus('loading');
    setUserPos(null);
    setDistance(null);
  };

  // Fungsi untuk simulasi lokasi (MOCK) - Sangat berguna untuk dev/laptop tanpa GPS
  const simulateLocation = () => {
    if (!lokasiPKL.latitude || !lokasiPKL.longitude) return;
    
    // Taruh posisi simulasi sedikit di dalam radius (misal 10 meter dari pusat)
    const mockLat = lokasiPKL.latitude + 0.0001; 
    const mockLon = lokasiPKL.longitude + 0.0001;
    
    setUserPos({ lat: mockLat, lon: mockLon });
    setGpsStatus('ok');
    updateUserOnMap(mockLat, mockLon);
    onPositionUpdate?.({ lat: mockLat, lon: mockLon });
    
    const d = haversine(mockLat, mockLon, lokasiPKL.latitude, lokasiPKL.longitude);
    setDistance(Math.round(d));
    onStatusChange?.(d <= RADIUS, Math.round(d));
    
    alert('Mode Simulasi Aktif: Posisi Anda diset di dekat industri untuk keperluan testing.');
  };

  // UI Error Messages
  const getErrorMessage = () => {
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      return 'Gagal: Akses harus via HTTPS untuk GPS';
    }
    if (gpsStatus === 'denied') return 'GPS ditolak — Aktifkan di pengaturan browser';
    return 'GPS Gagal/Timeout. Laptop mungkin tidak memiliki hardware GPS.';
  };

  // Jika industri tidak punya GPS
  if (!lokasiPKL.has_gps || !lokasiPKL.latitude || !lokasiPKL.longitude) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <p className="text-sm font-semibold">Koordinat GPS belum diset oleh Admin</p>
        </div>
        <div className="flex items-start gap-2 pl-6">
          <MapPin size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">{lokasiPKL.nama_industri}</p>
            <p className="text-xs text-amber-700 leading-relaxed">{lokasiPKL.alamat_lengkap}</p>
          </div>
        </div>
        <p className="text-[11px] text-amber-600 pl-6">
          Validasi GPS dinonaktifkan. Hubungi admin untuk mengaktifkan verifikasi lokasi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        gpsStatus === 'loading'
          ? 'bg-slate-50 border-slate-200'
          : gpsStatus === 'error' || gpsStatus === 'denied'
          ? 'bg-red-50 border-red-200'
          : inArea
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2.5">
          {gpsStatus === 'loading' && <Loader2 size={15} className="animate-spin text-slate-500" />}
          {gpsStatus === 'ok' && inArea && <CheckCircle2 size={15} className="text-emerald-600" />}
          {gpsStatus === 'ok' && !inArea && <AlertTriangle size={15} className="text-amber-600" />}
          {(gpsStatus === 'error' || gpsStatus === 'denied') && <AlertTriangle size={15} className="text-red-600" />}

          <div className="flex-1">
            {gpsStatus === 'loading' && <p className="text-xs font-semibold text-slate-600">Mendeteksi posisi GPS...</p>}
            {(gpsStatus === 'error' || gpsStatus === 'denied') && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-700">{getErrorMessage()}</p>
                <button 
                  onClick={simulateLocation}
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Gunakan Lokasi Simulasi (Dev Mode)
                </button>
              </div>
            )}
            {gpsStatus === 'ok' && (
              <>
                <p className={`text-xs font-bold ${inArea ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {inArea ? '✓ Anda berada di area PKL' : `⚠ Di luar area PKL (${distance}m dari industri)`}
                </p>
                {distance !== null && (
                  <p className={`text-[10px] ${inArea ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Jarak: {distance}m · Radius: {RADIUS}m · {inArea ? 'Jurnal dapat dikirim' : 'Pindah ke kategori WFH jika tidak bisa ke lokasi'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={refreshGPS}
          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 flex-shrink-0"
          title="Refresh GPS"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Peta Leaflet */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div ref={mapRef} style={{ height: '220px', width: '100%' }} />

        {/* Legend overlay */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-2 text-[10px] space-y-1 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-slate-600 font-medium">{lokasiPKL.nama_industri}</span>
          </div>
          {userPos && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-slate-600">Posisi Anda</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-indigo-100 flex-shrink-0" />
            <span className="text-slate-600">Area radius {RADIUS}m</span>
          </div>
        </div>

        {/* Navigate button */}
        {userPos && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lokasiPKL.latitude},${lokasiPKL.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 flex items-center gap-1.5 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md hover:bg-indigo-700 transition-colors pointer-events-auto"
          >
            <Navigation size={11} />
            Navigasi
          </a>
        )}
      </div>

      {/* Alamat fallback */}
      <div className="flex items-start gap-2 px-1">
        <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-slate-500 leading-relaxed">{lokasiPKL.alamat_lengkap}</p>
      </div>

      {/* Pulse animation & Technical Styles */}
      <style>{`
        /* Technical Marker Base */
        .technical-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .technical-marker .marker-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
          z-index: 2;
          box-shadow: 0 0 10px rgba(255,255,255,0.8);
        }

        /* Industry Marker */
        .technical-marker.industry {
          width: 40px;
          height: 40px;
          background: #ef4444;
          border-radius: 10px;
          border: 2px solid white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }
        .technical-marker.industry .marker-ring {
          position: absolute;
          inset: -6px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 14px;
        }

        /* User Marker & Pulse */
        .technical-marker.user .marker-dot {
          background: #3b82f6;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);
        }
        .technical-marker.user .pulse-ring {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          animation: technical-pulse 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
          opacity: 0;
        }

        @keyframes technical-pulse {
          0% { transform: scale(0.1); opacity: 0.8; }
          70% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        /* Radius Tag */
        .radius-tag {
          background: rgba(15, 23, 42, 0.9);
          color: rgba(255, 255, 255, 0.9);
          padding: 2px 8px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', 'Monaco', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.05em;
          border: 1px solid rgba(255, 255, 255, 0.2);
          white-space: nowrap;
          backdrop-filter: blur(4px);
        }

        /* Custom Popup */
        .custom-popup {
          padding: 4px;
        }
        .popup-label {
          display: block;
          font-size: 9px;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .popup-title {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 4px 0;
          line-height: 1.2;
        }
        .popup-address {
          font-size: 11px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        /* Overriding Leaflet Defaults */
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-tip {
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
