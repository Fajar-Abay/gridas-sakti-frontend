/**
 * pages/PengajuanRouter.tsx
 * Router kondisional untuk halaman pengajuan PKL berdasarkan role.
 */

import { getUser } from '@/lib/auth';
import PengajuanPage from './siswa/PengajuanPage';
import AdminPengajuanPage from './admin/AdminPengajuanPage';

export default function PengajuanRouter() {
  const user = getUser();

  if (user?.role === 'admin') {
    return <AdminPengajuanPage />;
  }

  return <PengajuanPage />;
}
