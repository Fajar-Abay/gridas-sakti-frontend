/**
 * lib/api.ts
 * Axios client terpusat untuk GRIDAS SAKTI.
 *
 * Fitur:
 * — Base URL dari env variable (VITE_API_URL)
 * — Request interceptor: attach Bearer token otomatis
 * — Response interceptor: normalisasi error, auto-logout jika 401
 * — Helper functions per resource endpoint
 */

import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getToken, removeToken } from './auth';
import type {
  ApiResponse,
  LoginPayload,
  AuthLoginResponse,
  User,
  CreateUserPayload,
  Jurusan,
  Kelas,
  TahunAjar,
  Industri,
  PeriodePkl,
  PengajuanPkl,
  Jurnal,
  MonitoringSiswa,
  MonitoringProfil,
  SiswaPortofolio,
  ActivityLog,
  KategoriJurnal,
  Penilaian,
  SuratTemplate,
  Visitasi,
} from './types';

/* ── Base URL — fallback ke localhost jika env tidak diset ── */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

/* ── Buat instance Axios ── */
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 detik (2 menit) untuk menangani data besar
});

/* ════════════════════════════════════════════
   REQUEST INTERCEPTOR
   Attach token Bearer ke setiap request
   ════════════════════════════════════════════ */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const activeTahunAjarId = localStorage.getItem('active_tahun_ajaran_id');
    if (activeTahunAjarId) {
      config.headers['X-Tahun-Ajaran-Id'] = activeTahunAjarId;
    }

    // [FIX M-2] Hanya log di mode development — mencegah kebocoran data di production
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
    }
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error(`[API Request Error]`, error);
    }
    return Promise.reject(error);
  }
);

/* ════════════════════════════════════════════
   RESPONSE INTERCEPTOR
   Normalisasi error dan handle 401 (token expired)
   ════════════════════════════════════════════ */
api.interceptors.response.use(
  (response) => {
    // [FIX M-2] Hanya log di mode development — mencegah data response bocor ke console
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    if (import.meta.env.DEV) {
      console.error(`[API Response Error] ${error.config?.url}`, error.response?.data || error.message);
    }
    /* Jika 401 Unauthorized → hapus token dan redirect ke login.
       KECUALI jika request berasal dari endpoint login itu sendiri,
       karena error login harus ditangani oleh form (tampilkan toast). */
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');

      if (!isLoginRequest) {
        removeToken();
        // Dispatch custom event agar App.tsx bisa navigate tanpa reload
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

/* ════════════════════════════════════════════
   AUTH ENDPOINTS
   ════════════════════════════════════════════ */
export const authApi = {
  /** Login dan dapatkan token */
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<AuthLoginResponse>>('/auth/login', payload),

  /** Ambil data user saat ini (dari token) */
  me: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  /** Logout — invalidate token di server */
  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),

  /** Ganti password */
  changePassword: (current_password: string, new_password: string) =>
    api.post<ApiResponse<null>>('/auth/change-password', { current_password, new_password }),
};

/* ════════════════════════════════════════════
   USER MANAGEMENT (Admin)
   ════════════════════════════════════════════ */
export const userApi = {
  /** List semua user */
  list: (params?: Record<string, any>) => api.get<ApiResponse<User[]>>('/users', { params }),

  /** Detail satu user */
  show: (id: number) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  /** Buat user baru */
  create: (payload: CreateUserPayload) =>
    api.post<ApiResponse<User>>('/users', payload),

  /** Update user */
  update: (id: number, payload: Partial<CreateUserPayload>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, payload),

  /** Hapus user */
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/users/${id}`),

  /** Import massal dari file Excel/CSV */
  importExcel: (file: File, role: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('role', role);
    return api.post<ApiResponse<{ success_count: number; error_count: number; errors: string[] }>>('/users/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Download template import Excel (per role, dengan contoh & petunjuk) */
  downloadImportTemplate: (role: string) =>
    api.get(`/users/import-template?role=${role}`, { responseType: 'blob' }),

  /** Download template lama (deprecated) */
  downloadTemplate: (role: string) =>
    api.get(`/users/template?role=${role}`, { responseType: 'blob' }),

  /** Reset password ke default */
  resetPassword: (id: number) =>
    api.post<ApiResponse<null>>(`/users/${id}/reset-password`),
};

/* ════════════════════════════════════════════
   DASHBOARD & STATS
   ════════════════════════════════════════════ */
export const dashboardApi = {
  getAdminStats: () => api.get<ApiResponse<any>>('/admin/dashboard/stats'),
};

/* ════════════════════════════════════════════
   MASTER DATA — JURUSAN
   ════════════════════════════════════════════ */
export const jurusanApi = {
  list:   ()                           => api.get<ApiResponse<Jurusan[]>>('/jurusan?per_page=1000'),
  show:   (id: number)                 => api.get<ApiResponse<Jurusan>>(`/jurusan/${id}`),
  create: (payload: Omit<Jurusan, 'id'>) => api.post<ApiResponse<Jurusan>>('/jurusan', payload),
  update: (id: number, payload: Omit<Jurusan, 'id'>) => api.put<ApiResponse<Jurusan>>(`/jurusan/${id}`, payload),
  delete: (id: number)                 => api.delete<ApiResponse<null>>(`/jurusan/${id}`),
};

/* ════════════════════════════════════════════
   MASTER DATA — KELAS
   ════════════════════════════════════════════ */
export const kelasApi = {
  list:   ()                          => api.get<ApiResponse<Kelas[]>>('/kelas?per_page=1000'),
  show:   (id: number)                => api.get<ApiResponse<Kelas>>(`/kelas/${id}`),
  create: (payload: { nama_kelas: string; jurusan_id: number }) =>
    api.post<ApiResponse<Kelas>>('/kelas', payload),
  update: (id: number, payload: { nama_kelas: string; jurusan_id: number }) =>
    api.put<ApiResponse<Kelas>>(`/kelas/${id}`, payload),
  delete: (id: number)                => api.delete<ApiResponse<null>>(`/kelas/${id}`),
  /** Generate default classes for a year */
  generateDefault: (tahun_ajaran_id: number) =>
    api.post<ApiResponse<null>>('/kelas/generate', { tahun_ajaran_id }),
};

/* ════════════════════════════════════════════
   MASTER DATA — TAHUN AJAR
   ════════════════════════════════════════════ */
export const tahunAjarApi = {
  list:   ()                           => api.get<ApiResponse<TahunAjar[]>>('/tahun-ajar?per_page=1000'),
  show:   (id: number)                 => api.get<ApiResponse<TahunAjar>>(`/tahun-ajar/${id}`),
  create: (payload: Omit<TahunAjar, 'id'>) => api.post<ApiResponse<TahunAjar>>('/tahun-ajar', payload),
  update: (id: number, payload: Partial<TahunAjar>) => api.put<ApiResponse<TahunAjar>>(`/tahun-ajar/${id}`, payload),
  delete: (id: number)                 => api.delete<ApiResponse<null>>(`/tahun-ajar/${id}`),
  setActive: (id: number)              => api.post<ApiResponse<TahunAjar>>(`/tahun-ajar/${id}/activate`),
};

/* ════════════════════════════════════════════
   MASTER DATA — INDUSTRI
   ════════════════════════════════════════════ */
export const industriApi = {
  list: (params?: any) => api.get<ApiResponse<Industri[]>>('/industri', { params: { per_page: 1000, ...params } }),
  show: (id: number) => api.get<ApiResponse<Industri>>(`/industri/${id}`),
  create: (payload: any) => api.post<ApiResponse<Industri>>('/industri', payload),
  update: (id: number, payload: any) => api.put<ApiResponse<Industri>>(`/industri/${id}`, payload),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/industri/${id}`),
  /** Toggle active status */
  toggleStatus: (id: number) => api.post<ApiResponse<null>>(`/industri/${id}/toggle-status`),
  /** Import massal */
  importExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<{ imported: number }>>('/industri/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () => api.get('/users/template?role=industri', { responseType: 'blob' }),
};

/* ════════════════════════════════════════════
   PERIODE PKL (Penempatan)
   ════════════════════════════════════════════ */
export const periodePklApi = {
  list:   ()           => api.get<ApiResponse<PeriodePkl[]>>('/periode-pkl?per_page=10000'),
  show:   (id: number) => api.get<ApiResponse<PeriodePkl>>(`/periode-pkl/${id}`),
  create: (payload: Omit<PeriodePkl, 'id'>) =>
    api.post<ApiResponse<PeriodePkl>>('/periode-pkl', payload),
  update: (id: number, payload: Partial<PeriodePkl>) =>
    api.put<ApiResponse<PeriodePkl>>(`/periode-pkl/${id}`, payload),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/periode-pkl/${id}`),
  /** Bulk update penempatan */
  bulkUpdate: (ids: number[], payload: Partial<PeriodePkl>) =>
    api.post<ApiResponse<any>>('/periode-pkl/bulk-update', { ids, ...payload }),
  /** Export ke Excel — respons berupa blob */
  exportExcel: ()           => api.get('/periode-pkl/export', { responseType: 'blob' }),
};

/* ════════════════════════════════════════════
   PENGAJUAN PKL
   ════════════════════════════════════════════ */
export const pengajuanApi = {
  /** List semua pengajuan (Admin) */
  listAll: () => api.get<ApiResponse<PengajuanPkl[]>>('/admin/pengajuan-pkl?per_page=10000'),

  /** List pengajuan milik siswa sendiri */
  list: () => api.get<ApiResponse<PengajuanPkl[]>>('/pengajuan-pkl?per_page=1000'),

  /** Pengajuan oleh siswa sendiri (siswa_id otomatis dari backend) */
  create: (payload: { industri_id: number }) =>
    api.post<ApiResponse<PengajuanPkl>>('/pengajuan-pkl', payload),

  show: (id: number) => api.get<ApiResponse<PengajuanPkl>>(`/pengajuan-pkl/${id}`),

  /** Download surat permohonan (PDF) */
  downloadSuratPermohonan: (id: number) => 
    api.get(`/pengajuan-pkl/${id}/surat-permohonan`, { responseType: 'blob' }),

  /** Upload surat balasan (finalisasi on-site) */
  uploadSuratBalasan: (id: number, file: File) => {
    const form = new FormData();
    form.append('surat_balasan', file);
    return api.post<ApiResponse<PengajuanPkl>>(`/pengajuan-pkl/${id}/on-site`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Pengajuan mandiri (Tambah Instansi Baru) */
  createMandiri: (payload: { 
    nama_industri: string; 
    bidang_industri: string; 
    alamat_lengkap: string; 
    kontak_person?: string;
    telepon?: string;
    email?: string;
    deskripsi?: string;
    kuota?: number;
    longitude?: number;
    latitude?: number;
  }) => api.post<ApiResponse<PengajuanPkl>>('/pengajuan-pkl/mandiri', payload),

  /** Admin: approve pengajuan (single) */
  approve: (id: number) =>
    api.post<ApiResponse<null>>(`/pengajuan-pkl/${id}/approve`),

  /** Admin: reject pengajuan (single) */
  reject: (id: number, alasan_penolakan: string) =>
    api.post<ApiResponse<null>>(`/pengajuan-pkl/${id}/reject`, { alasan_penolakan }),

  /** Admin: Bulk actions */
  bulkApprove: (ids: number[]) =>
    api.post<ApiResponse<any>>('/pengajuan-pkl/bulk-approve', { ids }),
  
  bulkReject: (ids: number[], alasan_penolakan: string) =>
    api.post<ApiResponse<any>>('/pengajuan-pkl/bulk-reject', { ids, alasan_penolakan }),

  /** Siswa: Kirim pengajuan yang masih draft */
  submitDraft: (id: number) =>
    api.post<ApiResponse<null>>(`/pengajuan-pkl/${id}/submit`),
};

/* ════════════════════════════════════════════
   SURAT & TEMPLATE
   ════════════════════════════════════════════ */
export const suratApi = {
  /** List templates */
  listTemplates: () => api.get<ApiResponse<SuratTemplate[]>>('/surat/templates'),

  /** Upload template baru */
  uploadTemplate: (payload: { nama_template: string; jenis_surat: string; file_template: File; deskripsi?: string }) => {
    const form = new FormData();
    form.append('nama_template', payload.nama_template);
    form.append('jenis_surat', payload.jenis_surat);
    form.append('file_template', payload.file_template);
    if (payload.deskripsi) form.append('deskripsi', payload.deskripsi);
    return api.post<ApiResponse<SuratTemplate>>('/surat/templates', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Hapus template */
  deleteTemplate: (id: number) => api.delete<ApiResponse<null>>(`/surat/templates/${id}`),

  /** Generate Surat Permohonan (DOCX) */
  generatePermohonan: (payload: {
    pengajuan_ids: number[];
    nomor_surat: string;
    tanggal_surat: string;
    nama_penandatangan: string;
    nip_penandatangan: string;
    jabatan_penandatangan: string;
    kop_sekolah?: string;
  }) => api.post('/surat/generate-permohonan', payload, { responseType: 'blob' }),
};

/* ════════════════════════════════════════════
   JURNAL
   ════════════════════════════════════════════ */
export const jurnalApi = {
  /** List jurnal milik siswa yang sedang login */
  list: () => api.get<ApiResponse<Jurnal[]>>('/jurnal?per_page=10000'),

  /** Detail satu jurnal */
  show: (id: number) => api.get<ApiResponse<Jurnal>>(`/jurnal/${id}`),

  /** Buat jurnal baru — multipart/form-data */
  create: (payload: FormData) =>
    api.post<ApiResponse<Jurnal>>('/jurnal', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** List jurnal spesifik satu siswa (untuk Guru/Pembimbing) */
  bySiswa: (siswaId: number) =>
    api.get<ApiResponse<Jurnal[]>>(`/siswa/${siswaId}/jurnal`),

  /** Verifikasi jurnal */
  verify: (id: number, catatan_pembimbing?: string) =>
    api.post<ApiResponse<Jurnal>>(`/jurnal/${id}/verify`, { catatan_pembimbing }),

  /** Minta revisi jurnal */
  revision: (id: number, catatan_pembimbing: string) =>
    api.post<ApiResponse<Jurnal>>(`/jurnal/${id}/revision`, { catatan_pembimbing }),

  /** Update jurnal — mendukung file upload via _method=PUT */
  update: (id: number, payload: FormData) =>
    api.post<ApiResponse<Jurnal>>(`/jurnal/${id}?_method=PUT`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Hapus jurnal */
  delete: (id: number) => api.delete<ApiResponse<null>>(`/jurnal/${id}`),
};

/* ════════════════════════════════════════════
   MONITORING
   ════════════════════════════════════════════ */
export const monitoringApi = {
  /** List siswa bimbingan (untuk Guru/Pembimbing) */
  siswa: () => api.get<ApiResponse<MonitoringSiswa[]>>('/bimbingan/siswa'),

  /** Profil bimbingan siswa (siapa guru & pembimbing) */
  profil: () => api.get<ApiResponse<MonitoringProfil>>('/bimbingan/saya'),

  /** Portofolio siswa bimbingan (foto + CV + surat) — untuk rekrutmen */
  portofolio: (tahunAjarId?: number) =>
    api.get<ApiResponse<SiswaPortofolio[]>>('/bimbingan/portofolio', {
      params: tahunAjarId ? { tahun_ajar_id: tahunAjarId } : {},
    }),

  /** Lokasi GPS industri & radius (untuk peta jurnal siswa) */
  lokasiPKL: () => api.get<ApiResponse<any>>('/bimbingan/lokasi-pkl'),
};

/* ════════════════════════════════════════════
   PROFILE (Siswa)
   ════════════════════════════════════════════ */
export const profileApi = {
  /** Update biodata dasar */
  update: (payload: { name: string; no_hp?: string }) =>
    api.post<ApiResponse<User>>('/profile/update', payload),

  /** Upload dokumen PKL (foto, CV, surat pernyataan) */
  uploadDocuments: (files: { foto?: File; cv?: File; surat_pernyataan?: File }) => {
    const form = new FormData();
    if (files.foto)             form.append('foto', files.foto);
    if (files.cv)               form.append('cv', files.cv);
    if (files.surat_pernyataan) form.append('surat_pernyataan', files.surat_pernyataan);
    return api.post<ApiResponse<User>>('/profile/upload-documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

/* ════════════════════════════════════════════
   ACTIVITY LOGS (Admin)
   ════════════════════════════════════════════ */
export const logsApi = {
  list: () => api.get<ApiResponse<ActivityLog[]>>('/logs?per_page=1000'),
};

/* ════════════════════════════════════════════
   KATEGORI JURNAL
   ════════════════════════════════════════════ */
export const kategoriJurnalApi = {
  list:   ()                           => api.get<ApiResponse<KategoriJurnal[]>>('/kategori-jurnal'),
  show:   (id: number)                 => api.get<ApiResponse<KategoriJurnal>>(`/kategori-jurnal/${id}`),
  create: (payload: { nama_kategori: string; deskripsi?: string }) =>
    api.post<ApiResponse<KategoriJurnal>>('/kategori-jurnal', payload),
  update: (id: number, payload: { nama_kategori: string; deskripsi?: string }) =>
    api.put<ApiResponse<KategoriJurnal>>(`/kategori-jurnal/${id}`, payload),
  delete: (id: number)                 => api.delete<ApiResponse<null>>(`/kategori-jurnal/${id}`),
};

/* ════════════════════════════════════════════
   PENILAIAN PKL
   ════════════════════════════════════════════ */
export const penilaianApi = {
  list:    ()            => api.get<ApiResponse<Penilaian[]>>('/penilaian'),
  show:    (id: number)  => api.get<ApiResponse<Penilaian>>(`/penilaian/${id}`),
  create:  (payload: Omit<Penilaian, 'id' | 'nilai_akhir' | 'created_at'>) =>
    api.post<ApiResponse<Penilaian>>('/penilaian', payload),
  update:  (id: number, payload: Partial<Penilaian>) =>
    api.put<ApiResponse<Penilaian>>(`/penilaian/${id}`, payload),
  bySiswa: (siswaId: number) =>
    api.get<ApiResponse<Penilaian[]>>(`/siswa/${siswaId}/penilaian`),
};


/* ════════════════════════════════════════════
   VISITASI
   ════════════════════════════════════════════ */
export const visitasiApi = {
  list:   (params?: any) => api.get<ApiResponse<Visitasi[]>>('/visitasi', { params: { per_page: 1000, ...params } }),
  show:   (id: number) => api.get<ApiResponse<Visitasi>>(`/visitasi/${id}`),
  create: (payload: FormData) => 
    api.post<ApiResponse<Visitasi>>('/visitasi', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, payload: FormData) => 
    api.post<ApiResponse<Visitasi>>(`/visitasi/${id}?_method=PUT`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/visitasi/${id}`),
};

/* ════════════════════════════════════════════
   PRESENSI (ABSENSI) PKL
   ════════════════════════════════════════════ */
export const presensiApi = {
  today: () => api.get<ApiResponse<any>>('/presensi/today'),
  submit: (payload: { status: 'hadir' | 'sakit' | 'izin'; latitude?: number; longitude?: number; keterangan_izin?: string; lampiran_izin?: File }) => {
    const form = new FormData();
    form.append('status', payload.status);
    if (payload.latitude !== undefined) form.append('latitude', payload.latitude.toString());
    if (payload.longitude !== undefined) form.append('longitude', payload.longitude.toString());
    if (payload.keterangan_izin) form.append('keterangan_izin', payload.keterangan_izin);
    if (payload.lampiran_izin) form.append('lampiran_izin', payload.lampiran_izin);
    return api.post<ApiResponse<any>>('/presensi', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  submitPulang: (payload: { latitude: number; longitude: number }) =>
    api.post<ApiResponse<any>>('/presensi/pulang', payload),
  riwayat: () => api.get<ApiResponse<any[]>>('/presensi/riwayat'),
  siswa: (params?: { date?: string; start_date?: string; end_date?: string }) => api.get<ApiResponse<any[]>>('/presensi/siswa', { params }),
  verify: (id: number | 'create-manual', payload: { is_verified: boolean; catatan_pembimbing?: string; siswa_id?: number; tanggal?: string; status?: string }) =>
    api.post<ApiResponse<any>>(`/presensi/${id}/verify`, payload),
  rekap: (params?: { month: number; year: number }) => api.get<ApiResponse<any[]>>('/presensi/rekap', { params }),
};

export default api;
