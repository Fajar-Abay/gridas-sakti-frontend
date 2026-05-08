/**
 * App.tsx
 * Entry point aplikasi React dengan React Router.
 * Mendukung routing terproteksi via DashboardLayout.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { TahunAjarProvider } from './lib/TahunAjarContext';


function App() {
  return (
    <BrowserRouter>
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
            <Route path="/daftar-industri" element={<IndustryListPage />} />
            <Route path="/daftar-industri/:id" element={<IndustryDetailPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TahunAjarProvider>
    </BrowserRouter>
  );
}

export default App;
