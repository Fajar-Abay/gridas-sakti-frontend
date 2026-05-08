/**
 * components/ui/Badge.tsx
 * Badge/chip status — digunakan untuk menampilkan status jurnal,
 * pengajuan PKL, dan role user dengan warna yang konsisten.
 */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/** Mapping variant ke class CSS dari globals.css */
const variantClass: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
  gray:    'badge-gray',
};

export default function Badge({
  children,
  variant = 'gray',
  className = '',
}: BadgeProps) {
  return (
    <span className={`badge ${variantClass[variant]} ${className}`}>
      {children}
    </span>
  );
}

/* ── Helper: mapping status jurnal ke variant badge ── */
export function getJurnalBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'verified':  return 'success';
    case 'pending':   return 'warning';
    case 'revision':  return 'danger';
    case 'draft':     return 'gray';
    default:          return 'gray';
  }
}

/* ── Helper: teks status jurnal dalam Bahasa Indonesia ── */
export function getJurnalStatusLabel(status: string): string {
  switch (status) {
    case 'verified':  return 'Terverifikasi';
    case 'pending':   return 'Menunggu Verifikasi';
    case 'revision':  return 'Perlu Revisi';
    case 'draft':     return 'Draft';
    default:          return status;
  }
}

/* ── Helper: mapping status pengajuan PKL ke variant badge ── */
export function getPengajuanBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'approved':  return 'success';
    case 'pending':   return 'warning';
    case 'rejected':  return 'danger';
    case 'on_site':   return 'info';
    case 'draft':     return 'gray';
    default:          return 'gray';
  }
}

/* ── Helper: teks status pengajuan dalam Bahasa Indonesia ── */
export function getPengajuanStatusLabel(status: string): string {
  switch (status) {
    case 'approved':  return 'Disetujui';
    case 'pending':   return 'Menunggu Review';
    case 'rejected':  return 'Ditolak';
    case 'on_site':   return 'Aktif PKL';
    case 'draft':     return 'Draft';
    default:          return status;
  }
}

/* ── Helper: mapping role user ke variant ── */
export function getRoleBadgeVariant(role: string): BadgeVariant {
  switch (role) {
    case 'admin':      return 'danger';
    case 'guru':       return 'info';
    case 'pembimbing': return 'success';
    case 'siswa':      return 'gray';
    default:           return 'gray';
  }
}
