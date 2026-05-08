/**
 * pages/LoginPage.tsx
 * Halaman Login — redesign v2, modern split layout.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api';
import { setToken, setUser, isAuthenticated } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Helmet } from 'react-helmet-async';
import { Zap, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (isAuthenticated()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!email.trim())           e.email    = 'Email wajib diisi.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Format email tidak valid.';
    
    if (!password) e.password = 'Password wajib diisi.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      setToken(res.data.data.token);
      setUser(res.data.data.user);
      showToast('Berhasil masuk!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Email atau password salah.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login | GRIDAS SAKTI</title>
        <meta name="description" content="Masuk ke dashboard GRIDAS SAKTI SMKN 2 Sumedang untuk mengelola kegiatan PKL." />
      </Helmet>
      {toast}
      <div className="min-h-dvh flex flex-col" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}>

        {/* Top branding area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center mb-2"
          >
            <h1 className="text-3xl font-black text-white tracking-tight">
              GRIDAS<span className="text-indigo-400">SAKTI</span>
            </h1>
            <p className="text-sm text-white/50 mt-1 font-medium">Sistem Manajemen PKL Terpadu</p>
          </motion.div>
        </div>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-t-[32px] p-6 pb-safe shadow-2xl"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <h2 className="text-xl font-black text-slate-800 mb-1">Masuk ke Akun</h2>
          <p className="text-sm text-slate-400 mb-6">Masukkan email dan password Anda.</p>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="form-label">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nama@sekolah.sch.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`form-input ${errors.email ? 'border-red-400 bg-red-50' : ''}`}
                disabled={loading}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`form-input pr-12 ${errors.password ? 'border-red-400 bg-red-50' : ''}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  id="toggle-password-btn"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.password}</p>}
            </div>

            <motion.button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary w-full h-12 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  Masuk...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">Masuk</span>
              )}
            </motion.button>
          </form>

          <p className="text-center text-[11px] text-slate-300 mt-4">
            GRIDAS SAKTI · SMKN 2 Sumedang © 2026
          </p>
        </motion.div>
      </div>
    </>
  );
}
