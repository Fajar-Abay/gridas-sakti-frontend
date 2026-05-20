/**
 * App.tsx
 * Entry point aplikasi React dengan React Router.
 * Mendukung routing terproteksi via DashboardLayout.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DashboardLayout from './layouts/DashboardLayout';
import MasterData from './pages/admin/MasterData';
import UserManagement from './pages/admin/UserManagement';
import ProfilePage from './pages/ProfilePage';
import JurnalPage from './pages/siswa/JurnalPage';
import PeriodePKLPage from './pages/admin/PeriodePKLPage';
import MonitoringSiswaPage from './pages/monitoring/MonitoringSiswaPage';
import JurnalVerifikasiPage from './pages/monitoring/JurnalVerifikasiPage';
import VisitasiPage from './pages/monitoring/VisitasiPage';
import PengajuanRouter from './pages/PengajuanRouter';
import ActivityLogsPage from './pages/admin/ActivityLogsPage';
import IndustryListPage from './pages/siswa/IndustryListPage';
import IndustryDetailPage from './pages/siswa/IndustryDetailPage';
import PenilaianPage from './pages/monitoring/PenilaianPage';
import AdminIndustriPage from './pages/admin/AdminIndustriPage';
import KategoriJurnalPage from './pages/admin/KategoriJurnalPage';
import AdminSuratPage from './pages/admin/AdminSuratPage';
import PresensiPage from './pages/siswa/PresensiPage';
import VerifikasiPresensiPage from './pages/pembimbing/VerifikasiPresensiPage';
import RekapPresensiPage from './pages/guru/RekapPresensiPage';
import { TahunAjarProvider } from './lib/TahunAjarContext';

/**
 * AuthGuard — menangkap event 'auth:unauthorized' dari Axios interceptor
 * dan melakukan redirect ke /login via React Router (tanpa reload halaman).
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [navigate]);

  return <>{children}</>;
}


function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <TahunAjarProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/master-data" element={<MasterData />} />
              <Route path="/admin/periode-pkl" element={<PeriodePKLPage />} />
              <Route path="/admin/logs" element={<ActivityLogsPage />} />
              <Route path="/admin/industri" element={<AdminIndustriPage />} />
              <Route path="/admin/kategori-jurnal" element={<KategoriJurnalPage />} />
              <Route path="/admin/surat" element={<AdminSuratPage />} />
              
              {/* Shared Routes */}
              <Route path="/pengajuan-pkl" element={<PengajuanRouter />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/monitoring" element={<MonitoringSiswaPage />} />
              <Route path="/jurnal-verifikasi" element={<JurnalVerifikasiPage />} />
              <Route path="/visitasi" element={<VisitasiPage />} />
              <Route path="/penilaian" element={<PenilaianPage />} />
              
              {/* Siswa Routes */}
              <Route path="/jurnal" element={<JurnalPage />} />
              <Route path="/presensi" element={<PresensiPage />} />
              <Route path="/daftar-industri" element={<IndustryListPage />} />
              <Route path="/daftar-industri/:id" element={<IndustryDetailPage />} />

              {/* Attendance Verification & Report Routes */}
              <Route path="/presensi/verifikasi" element={<VerifikasiPresensiPage />} />
              <Route path="/presensi/rekap" element={<RekapPresensiPage />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </TahunAjarProvider>
      </AuthGuard>
    </BrowserRouter>
  );
}

export default App;

