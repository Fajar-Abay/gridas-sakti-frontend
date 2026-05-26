/**
 * lib/types.ts
 * TypeScript interfaces untuk semua entitas GRIDAS SAKTI API.
 * Sesuai dengan standar respons: { status, code, data, message }
 */

/* ── Standar Response dari Backend ── */
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  code: number;
  data: T;
  message: string;
}

/* ── Pagination Wrapper (jika ada) ── */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/* ── ============================================================ ── */
/* ── Auth ── */
/* ── ============================================================ ── */

export type UserRole = 'admin' | 'guru' | 'pembimbing' | 'siswa';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  no_hp?: string;
  created_at: string;
  updated_at: string;
  /* Relasi spesifik role */
  guru?: Guru;
  siswa?: Siswa;
  pembimbing?: Pembimbing;
}

export interface AuthLoginResponse {
  token: string;
  user: User;
}

/* ── ============================================================ ── */
/* ── Master Data ── */
/* ── ============================================================ ── */

export interface Jurusan {
  id: number;
  nama_jurusan: string;
  kode_jurusan: string;
  created_at?: string;
}

export interface Kelas {
  id: number;
  nama_kelas: string;
  jurusan_id: number;
  jurusan?: Jurusan;
  created_at?: string;
}

export interface TahunAjar {
  id: number;
  tahun_ajaran: string;
  semester: 'Ganjil' | 'Genap';
  is_active: number;
  created_at?: string;
}

export interface Industri {
  id: number;
  nama_industri: string;
  bidang_industri: string;
  deskripsi?: string;
  mou?: string;
  alamat_lengkap: string;
  longitude?: number;
  latitude?: number;
  telepon?: string;
  email?: string;
  kontak_person?: string;
  kuota: number;
  kuota_terpakai: number;
  sisa_kuota: number;
  is_verified: boolean;
  is_active: boolean;
  created_at?: string;
}

/* ── ============================================================ ── */
/* ── User Profiles (Relasi) ── */
/* ── ============================================================ ── */

export interface Guru {
  id: number;
  user_id: number;
  nip: string;
  jabatan: string;
  no_hp?: string;
  jurusan_id?: number;
  jurusan?: Jurusan;
  user?: User;
}

export interface Siswa {
  id: number;
  user_id: number;
  nisn: string;
  nis: string;
  kelas_id: number;
  jurusan_id: number;
  kelas?: Kelas;
  jurusan?: Jurusan;
  no_hp?: string;
  status: 'belum_ditempatkan' | 'sudah_ditempatkan' | 'selesai_pkl';
  foto?: string;
  cv_path?: string;
  surat_pernyataan_path?: string;
  user?: User;
}

export interface Pembimbing {
  id: number;
  user_id: number;
  industri_id: number;
  jabatan: string;
  no_hp?: string;
  industri?: Industri;
  user?: User;
}

/* ── ============================================================ ── */
/* ── PKL Management ── */
/* ── ============================================================ ── */

export type StatusPengajuan = 'draft' | 'pending' | 'approved' | 'rejected' | 'on_site';

export interface PengajuanPkl {
  id: number;
  siswa_id: number;
  industri_id: number;
  periode_pkl_id?: number;
  status: StatusPengajuan;
  alasan_penolakan?: string;
  surat_balasan?: string;
  siswa?: Siswa;
  industri?: Industri;
  periode_pkl?: PeriodePkl;
  created_at: string;
  updated_at: string;
}

export interface PeriodePkl {
  id: number;
  tahun_ajaran_id: number;
  industri_id: number;
  siswa_id: number;
  pembimbing_id: number;
  guru_id: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status?: 'active' | 'completed';
  tahun_ajaran?: TahunAjar;
  industri?: Industri;
  siswa?: Siswa;
  pembimbing?: Pembimbing;
  guru?: Guru;
  created_at?: string;
}

/* ── ============================================================ ── */
/* ── Jurnal ── */
/* ── ============================================================ ── */

export type StatusJurnal = 'draft' | 'pending' | 'verified' | 'revision';

export interface KategoriJurnal {
  id: number;
  nama_kategori: string;
  deskripsi?: string;
}

export interface Jurnal {
  id: number;
  siswa_id: number;
  kategori_jurnal_id: number;
  judul_kegiatan: string;
  deskripsi_pekerjaan: string;
  alat_bahan?: string;
  foto_kegiatan?: string;
  latitude?: number;
  longitude?: number;
  status: StatusJurnal;
  catatan_pembimbing?: string;
  catatan_guru?: string;
  is_verified_pembimbing: boolean;
  is_verified_guru: boolean;
  siswa?: User;
  kategori?: KategoriJurnal;
  created_at: string;
}

export interface Visitasi {
  id: number;
  industri_id: number;
  siswa_id?: number;
  guru_id: number;
  tanggal_visitasi: string;
  catatan: string;
  dokumentasi_foto?: string;
  industri?: Industri;
  siswa?: User;
  guru?: User;
  created_at?: string;
}

export interface SuratTemplate {
  id: number;
  nama_template: string;
  jenis_surat: 'surat_permohonan' | 'surat_tugas' | 'sertifikat';
  path_template: string;
  deskripsi?: string;
  is_active: boolean;
  created_at: string;
}

/* ── ============================================================ ── */
/* ── Monitoring ── */
/* ── ============================================================ ── */

export interface MonitoringSiswa {
  id: number;
  periode_pkl_id: number;
  nama: string;
  nisn: string;
  kelas: string;
  jurusan: string;
  industri: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jurnal_verified: number;
  jurnal_pending: number;
  jurnal_revision: number;
}

export interface SiswaPortofolio {
  id: number;
  nama: string;
  nisn: string;
  nis: string;
  kelas: string;
  jurusan: string;
  industri: string;
  tahun_ajaran: string;
  semester: string;
  status: string;
  foto_url: string | null;
  cv_url: string | null;
  surat_url: string | null;
  has_foto: boolean;
  has_cv: boolean;
  has_surat: boolean;
  tanggal_mulai: string;
  tanggal_selesai: string;
}

export interface MonitoringProfil {
  industri?: {
    nama: string;
    alamat: string;
    bidang: string;
  };
  guru_pembimbing?: {
    nama: string;
    nip: string;
    no_hp: string;
  };
  pembimbing_instansi?: {
    nama: string;
    jabatan: string;
    no_hp: string;
  };
  periode?: {
    mulai: string;
    selesai: string;
  };
}

/* ── ============================================================ ── */
/* ── Activity Log ── */
/* ── ============================================================ ── */

export interface ActivityLog {
  id: number;
  user_id: number;
  description: string;
  subject_type?: string;
  subject_id?: number;
  properties?: Record<string, unknown>;
  created_at: string;
  user?: User;
}

/* ── ============================================================ ── */
/* ── Penilaian PKL ── */
/* ── ============================================================ ── */

export interface Penilaian {
  id: number;
  siswa_id: number;
  periode_pkl_id: number;
  penilai_id: number;
  tipe_penilai: 'guru' | 'pembimbing';
  /* Hard Skill */
  pengetahuan: number;
  keterampilan_teknis: number;
  pemecahan_masalah: number;
  /* Soft Skill */
  kedisiplinan: number;
  kejujuran: number;
  kerjasama: number;
  inisiatif: number;
  komunikasi: number;
  /* Hasil */
  nilai_akhir?: number;
  catatan?: string;
  /* Relasi */
  siswa?: Siswa;
  penilai?: User;
  created_at?: string;
}

/* ── ============================================================ ── */
/* ── Form Payloads ── */
/* ── ============================================================ ── */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  no_hp?: string;
  /* Guru */
  nip?: string;
  jabatan?: string;
  jurusan_id?: number;
  /* Siswa */
  nisn?: string;
  nis?: string;
  kelas_id?: number;
  /* Pembimbing */
  industri_id?: number;
}

export interface CreateJurnalPayload {
  kategori_jurnal_id: number;
  judul_kegiatan: string;
  deskripsi_pekerjaan: string;
  alat_bahan?: string;
  latitude?: number;
  longitude?: number;
  foto_kegiatan?: File;
}
