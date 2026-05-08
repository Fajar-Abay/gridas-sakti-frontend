/**
 * components/ui/Spinner.tsx
 * Loading spinner dengan animasi Framer Motion.
 * Digunakan untuk state loading pada tombol dan overlay halaman.
 */

import { motion } from 'framer-motion';

interface SpinnerProps {
  /** Ukuran spinner dalam pixel */
  size?: number;
  /** Warna lingkaran spinner */
  color?: string;
  /** Tambahan class CSS */
  className?: string;
}

export default function Spinner({
  size = 24,
  color = 'var(--primary-600)',
  className = '',
}: SpinnerProps) {
  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid ${color}20`,
        borderTopColor: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.75,
        ease: 'linear',
        repeat: Infinity,
      }}
      aria-label="Memuat..."
      role="status"
    />
  );
}

/**
 * FullPageSpinner
 * Overlay loading seluruh layar — dipakai di page-level loading.
 */
export function FullPageSpinner() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 9999,
      }}
    >
      <Spinner size={40} />
      <p style={{ color: 'var(--gray-500)', fontSize: 14, fontWeight: 500 }}>
        Memuat data...
      </p>
    </motion.div>
  );
}
