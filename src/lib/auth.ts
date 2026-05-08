/**
 * lib/auth.ts
 * Helper untuk manajemen autentikasi:
 * — simpan/ambil/hapus token di localStorage
 * — decode role dari data user
 */

import type { User, UserRole } from './types.ts';

/* ── Key konstanta untuk localStorage ── */
const TOKEN_KEY = 'gridas_token';
const USER_KEY = 'gridas_user';

/* ── Simpan token setelah login berhasil ── */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax`;
  }
}

/* ── Ambil token dari localStorage ── */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/* ── Hapus token saat logout ── */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/* ── Simpan data user ke localStorage ── */
export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/* ── Ambil data user dari localStorage ── */
export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as User;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/* ── Cek apakah user sudah login ── */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/* ── Helper: dapatkan role user saat ini ── */
export function getCurrentRole(): UserRole | null {
  const user = getUser();
  return user ? user.role : null;
}

/* ── Helper: dapatkan route default berdasarkan role setelah login ── */
export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'admin': return '/dashboard';
    case 'guru': return '/dashboard';
    case 'pembimbing': return '/dashboard';
    case 'siswa': return '/dashboard';
    default: return '/dashboard';
  }
}
