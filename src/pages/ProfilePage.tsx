/**
 * pages/ProfilePage.tsx
 * Halaman Profil — tab Info | Dokumen PKL | Keamanan
 * Foto siswa tampil sebagai avatar. Upload dokumen di tab Dokumen.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { getUser, removeToken, setUser as setLocalUser } from '@/lib/auth';
import { profileApi, authApi, industriApi, jurusanApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import {
  User, Mail, Phone, Shield, LogOut, ChevronRight,
  Camera, FileText, Upload, CheckCircle, Lock, Eye, EyeOff, Save,
  GraduationCap, Building, BookOpen, Award, Hash, ImageIcon,
  FileBadge, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ActiveTab = 'info' | 'dokumen' | 'keamanan';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getUser();
  const { toast, showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [noHp, setNoHp] = useState(user?.no_hp || '');
  const [nis, setNis] = useState(user?.siswa?.nis || '');
  const [nisn, setNisn] = useState(user?.siswa?.nisn || '');
  const [saving, setSaving] = useState(false);

  // Password state
  const [showPwModal, setShowPwModal] = useState(false);
  const [pw, setPw] = useState({ current: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Upload states
  const [uploading, setUploading] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [extraInfo, setExtraInfo] = useState<{ industri?: string; jurusan?: string }>({});

  useEffect(() => {
    const refreshUser = async () => {
      try {
        const res = await authApi.me();
        const fullUser = res.data.data;
        setCurrentUser(fullUser);
        setLocalUser(fullUser);
        setName(fullUser.name);
        setNoHp(fullUser.no_hp || '');
        setNis(fullUser.siswa?.nis || '');
        setNisn(fullUser.siswa?.nisn || '');

        // Fetch extra info if relation is missing
        if (fullUser.role === 'pembimbing' && fullUser.pembimbing) {
          const p = fullUser.pembimbing;
          if (p.industri?.nama_industri) {
            setExtraInfo(prev => ({ ...prev, industri: p.industri?.nama_industri }));
          } else if (p.industri_id) {
            const indRes = await industriApi.show(p.industri_id);
            setExtraInfo(prev => ({ ...prev, industri: indRes.data.data.nama_industri }));
          }
        }
        
        if (fullUser.role === 'guru' && fullUser.guru) {
          const g = fullUser.guru;
          if (g.jurusan?.nama_jurusan) {
            setExtraInfo(prev => ({ ...prev, jurusan: g.jurusan?.nama_jurusan }));
          } else if (g.jurusan_id) {
            const jurRes = await jurusanApi.show(g.jurusan_id);
            setExtraInfo(prev => ({ ...prev, jurusan: jurRes.data.data.nama_jurusan }));
          }
        }
      } catch (err) {
        console.error("Gagal refresh profil:", err);
      }
    };
    refreshUser();
  }, []);

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000';

  const getDocUrl = (path: string | undefined) =>
    path ? `${BASE_URL}/storage/${path}` : null;

  const fotoUrl = getDocUrl(currentUser?.siswa?.foto);
  const cvUrl = getDocUrl(currentUser?.siswa?.cv_path);
  const suratUrl = getDocUrl(currentUser?.siswa?.surat_pernyataan_path);

  const isSiswa = currentUser?.role === 'siswa';
  const isGuru = currentUser?.role === 'guru';
  const isPembimbing = currentUser?.role === 'pembimbing';

  const handleLogout = () => {
    removeToken();
    navigate('/login', { replace: true });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await profileApi.update({ 
        name, 
        no_hp: noHp,
        ...(isSiswa ? { nis, nisn } : {}) 
      });
      showToast('Profil berhasil diperbarui!', 'success');
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.name = name; u.no_hp = noHp;
        localStorage.setItem('user', JSON.stringify(u));
      }
      setEditMode(false);
    } catch {
      showToast('Gagal memperbarui profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (type: 'foto' | 'cv' | 'surat_pernyataan', file: File) => {
    setUploading(type);
    try {
      const files: Record<string, File> = {};
      files[type] = file;
      await profileApi.uploadDocuments(files as any);
      const label = type === 'foto' ? 'Foto' : type === 'cv' ? 'CV' : 'Surat Pernyataan';
      showToast(`${label} berhasil diunggah!`, 'success');
      // Refresh page data
      setTimeout(() => window.location.reload(), 800);
    } catch {
      showToast('Gagal mengunggah dokumen.', 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleChangePassword = async () => {
    if (pw.new_password !== pw.confirm) { showToast('Konfirmasi password tidak cocok.', 'error'); return; }
    if (pw.new_password.length < 8) { showToast('Password minimal 8 karakter.', 'error'); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword?.(pw.current, pw.new_password);
      showToast('Password berhasil diubah!', 'success');
      setShowPwModal(false);
      setPw({ current: '', new_password: '', confirm: '' });
    } catch {
      showToast('Gagal mengubah password. Periksa password lama Anda.', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  if (!user) return null;

  const getRoleLabel = () => {
    if (isGuru) return 'Pembimbing Sekolah';
    if (isPembimbing) return 'Pembimbing Industri';
    if (isSiswa) return 'Peserta PKL';
    return 'Administrator';
  };

  const getRoleColor = () => {
    if (isGuru) return 'bg-blue-100 text-blue-700';
    if (isPembimbing) return 'bg-emerald-100 text-emerald-700';
    if (isSiswa) return 'bg-amber-100 text-amber-700';
    return 'bg-purple-100 text-purple-700';
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Info', icon: <User size={14} /> },
    ...(isSiswa ? [{ key: 'dokumen' as ActiveTab, label: 'Dokumen PKL', icon: <FileText size={14} /> }] : []),
    { key: 'keamanan', label: 'Keamanan', icon: <Lock size={14} /> },
  ];

  // Count uploaded docs
  const docCount = [fotoUrl, cvUrl, suratUrl].filter(Boolean).length;

  return (
    <div className="min-h-screen">
      {toast}
      <TopBar title="Profil Saya" subtitle="Kelola data dan dokumen" />

      <div className="page-container py-6 max-w-2xl mx-auto">

        {/* ── Profile Header Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6 overflow-hidden relative"
        >
          {/* Decorative gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={currentUser?.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-lg">
                  {(currentUser?.name || 'U').charAt(0)}
                </div>
              )}
              {isSiswa && (
                <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-700 transition-colors">
                  <Camera size={13} />
                  <input type="file" className="hidden" accept="image/*"
                    onChange={e => e.target.files?.[0] && handleUpload('foto', e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-slate-900 truncate mb-1">{currentUser?.name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getRoleColor()}`}>
                  {getRoleLabel()}
                </span>
                {isSiswa && currentUser?.siswa && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                    {currentUser.siswa.nisn}
                  </span>
                )}
              </div>
              {isSiswa && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${(docCount / 3) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{docCount}/3 dokumen</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Tab Bar ── */}
        <div className="tab-bar mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }} className="space-y-4">

              {/* Role-specific info */}
              {(isGuru || isPembimbing || isSiswa) && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="section-title mb-0">
                      {isGuru ? 'Informasi Guru' : isPembimbing ? 'Informasi Pembimbing' : 'Informasi Siswa'}
                    </p>
                  </div>
                  {isGuru && currentUser?.guru && (
                    <>
                      <InfoItem icon={<Hash size={16} />} label="NIP" value={currentUser.guru.nip || '-'} />
                      <InfoItem icon={<Award size={16} />} label="Jabatan" value={currentUser.guru.jabatan || '-'} />
                      <InfoItem icon={<BookOpen size={16} />} label="Jurusan" value={extraInfo.jurusan || currentUser.guru.jurusan?.nama_jurusan || '-'} last />
                    </>
                  )}
                  {isPembimbing && currentUser?.pembimbing && (
                    <>
                      <InfoItem icon={<Building size={16} />} label="Instansi" value={extraInfo.industri || currentUser.pembimbing.industri?.nama_industri || '-'} />
                      <InfoItem icon={<Award size={16} />} label="Jabatan" value={currentUser.pembimbing.jabatan || '-'} last />
                    </>
                  )}
                  {isSiswa && currentUser?.siswa && (
                    <>
                      <InfoItem icon={<Hash size={16} />} label="NISN" value={currentUser.siswa.nisn} />
                      <InfoItem icon={<Hash size={16} />} label="NIS" value={currentUser.siswa.nis} />
                      <InfoItem icon={<GraduationCap size={16} />} label="Kelas" value={currentUser.siswa.kelas?.nama_kelas || '-'} />
                      <InfoItem icon={<BookOpen size={16} />} label="Jurusan" value={currentUser.siswa.jurusan?.nama_jurusan || '-'} />
                      <InfoItem icon={<Shield size={16} />} label="Status PKL" value={
                        currentUser.siswa.status === 'sudah_ditempatkan' ? '✅ Sudah Ditempatkan'
                          : currentUser.siswa.status === 'selesai_pkl' ? '🎓 Selesai PKL'
                            : '⏳ Belum Ditempatkan'
                      } last />
                    </>
                  )}
                </div>
              )}

              {/* Kontak */}
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <p className="section-title mb-0">Informasi Kontak</p>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    {editMode ? 'Batal' : '✏️ Edit'}
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  {editMode ? (
                    <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="p-5 space-y-4">
                      <div>
                        <label className="form-label">Nama Lengkap</label>
                        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label">Nomor HP</label>
                        <input type="text" className="form-input" value={noHp} onChange={e => setNoHp(e.target.value)} placeholder="08xx" />
                      </div>
                      {isSiswa && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">NIS</label>
                            <input type="text" className="form-input" value={nis} onChange={e => setNis(e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label">NISN</label>
                            <input type="text" className="form-input" value={nisn} onChange={e => setNisn(e.target.value)} />
                          </div>
                        </div>
                      )}
                      <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary w-full">
                        <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <InfoItem icon={<Mail size={16} />} label="Email" value={currentUser?.email || '-'} />
                      <InfoItem icon={<Phone size={16} />} label="No. HP" value={currentUser?.no_hp || 'Belum diatur'} last />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="btn btn-danger w-full mt-2"
              >
                <LogOut size={18} /> Keluar dari Aplikasi
              </button>
              <p className="text-center text-slate-300 text-[10px] mt-4">GRIDAS SAKTI v2.0 • SMKN 2 Sumedang</p>
            </motion.div>
          )}

          {/* ── Tab Dokumen (Siswa) ── */}
          {activeTab === 'dokumen' && isSiswa && (
            <motion.div key="dokumen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }} className="space-y-4">

              <div className="card bg-indigo-50 border-indigo-100 p-4">
                <p className="text-sm font-semibold text-indigo-800 mb-1">📋 Dokumen PKL Anda</p>
                <p className="text-xs text-indigo-600/80">Unggah dokumen berikut untuk melengkapi profil PKL. Dokumen ini dapat dilihat oleh pembimbing sebagai bahan pertimbangan rekrutmen.</p>
              </div>

              <DocUploadCard
                icon={<ImageIcon size={22} />}
                title="Foto Formal"
                desc="JPG/PNG maks 2MB — foto resmi seragam"
                uploadedUrl={fotoUrl}
                loading={uploading === 'foto'}
                onUpload={f => handleUpload('foto', f)}
                accept="image/*"
                type="image"
              />

              <DocUploadCard
                icon={<FileBadge size={22} />}
                title="Curriculum Vitae (CV)"
                desc="Format PDF, maks 2MB"
                uploadedUrl={cvUrl}
                loading={uploading === 'cv'}
                onUpload={f => handleUpload('cv', f)}
                accept=".pdf"
                type="pdf"
              />

              <DocUploadCard
                icon={<FileText size={22} />}
                title="Surat Pernyataan Orang Tua"
                desc="PDF / Foto, maks 2MB"
                uploadedUrl={suratUrl}
                loading={uploading === 'surat_pernyataan'}
                onUpload={f => handleUpload('surat_pernyataan', f)}
                accept=".pdf,image/*"
                type="pdf"
              />
            </motion.div>
          )}

          {/* ── Tab Keamanan ── */}
          {activeTab === 'keamanan' && (
            <motion.div key="keamanan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }} className="space-y-4">
              <div className="card p-0 overflow-hidden">
                <button
                  onClick={() => setShowPwModal(true)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                      <Lock size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800">Ganti Password</p>
                      <p className="text-xs text-slate-400">Amankan akun dengan password baru</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
              <div className="card bg-amber-50 border-amber-100 p-4">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={14} /> Keamanan Akun
                </p>
                <p className="text-xs text-amber-700/80 mt-1">Gunakan password yang kuat (minimal 8 karakter). Jangan bagikan password Anda kepada siapa pun.</p>
              </div>
              <button onClick={handleLogout} className="btn btn-danger w-full">
                <LogOut size={18} /> Keluar dari Aplikasi
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal Ganti Password ── */}
      <AnimatePresence>
        {showPwModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowPwModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="modal-sheet relative max-w-md w-full mx-auto"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800">Ganti Password</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Password Lama</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} className="form-input pr-12"
                      value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Password Baru</label>
                  <input type="password" className="form-input"
                    value={pw.new_password} onChange={e => setPw({ ...pw, new_password: e.target.value })} placeholder="Min. 8 karakter" />
                </div>
                <div>
                  <label className="form-label">Konfirmasi Password</label>
                  <input type="password" className="form-input"
                    value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPwModal(false)} className="btn btn-secondary flex-1">Batal</button>
                <button onClick={handleChangePassword} disabled={pwSaving} className="btn btn-primary flex-1">
                  {pwSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function InfoItem({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`info-item ${!last ? '' : ''}`}>
      <div className="info-icon">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}

function DocUploadCard({
  icon, title, desc, uploadedUrl, loading, onUpload, accept, type
}: {
  icon: React.ReactNode; title: string; desc: string;
  uploadedUrl: string | null; loading: boolean;
  onUpload: (f: File) => void; accept: string; type: 'image' | 'pdf';
}) {
  const uploaded = !!uploadedUrl;
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`card transition-all ${uploaded ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Preview or icon */}
        <div className="flex-shrink-0">
          {uploaded && type === 'image' ? (
            <img src={uploadedUrl!} alt={title}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-emerald-200" />
          ) : (
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center
              ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {uploaded ? <CheckCircle size={26} /> : icon}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm mb-0.5">{title}</p>
          <p className="text-xs text-slate-500 mb-3">
            {uploaded ? <span className="text-emerald-600 font-semibold">✓ Sudah diunggah</span> : desc}
          </p>

          <div className="flex gap-2 flex-wrap">
            {uploaded && (
              <a href={uploadedUrl!} target="_blank" rel="noopener noreferrer"
                className="btn btn-sm btn-secondary gap-1">
                <ExternalLink size={13} /> Lihat
              </a>
            )}
            <label className={`btn btn-sm ${uploaded ? 'btn-ghost border border-slate-200' : 'btn-primary'} gap-1 cursor-pointer`}>
              {loading ? (
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Mengupload...</span>
              ) : (
                <><Upload size={13} /> {uploaded ? 'Ganti' : 'Unggah'}</>
              )}
              <input
                type="file" className="hidden" accept={accept} ref={fileRef}
                onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
