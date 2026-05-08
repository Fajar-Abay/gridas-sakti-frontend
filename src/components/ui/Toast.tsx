/**
 * components/ui/Toast.tsx
 * Notifikasi toast — muncul di bagian atas layar.
 * Mendukung variant: success, error, warning, info.
 *
 * Cara pakai:
 * const { toast, showToast } = useToast();
 * showToast('Berhasil disimpan!', 'success');
 * return <>{toast}</>;
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  variant: ToastVariant;
}

/* ── Icon per variant ── */
const icons: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

/* ── Warna per variant ── */
const colors: Record<ToastVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'var(--success-100)',
    border: 'var(--success-500)',
    icon: 'var(--success-700)',
    text: 'var(--success-700)',
  },
  error: {
    bg: 'var(--danger-100)',
    border: 'var(--danger-500)',
    icon: 'var(--danger-700)',
    text: 'var(--danger-700)',
  },
  warning: {
    bg: 'var(--warning-100)',
    border: 'var(--warning-500)',
    icon: 'var(--warning-700)',
    text: 'var(--warning-700)',
  },
  info: {
    bg: 'var(--primary-50)',
    border: 'var(--primary-500)',
    icon: 'var(--primary-700)',
    text: 'var(--primary-700)',
  },
};

/* ── Komponen Toast ── */
interface ToastProps {
  message: string;
  variant: ToastVariant;
}

function ToastNotification({ message, variant }: ToastProps) {
  const c = colors[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 18px',
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        maxWidth: 'min(90vw, 400px)',
        width: 'max-content',
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Ikon */}
      <span
        style={{
          width: 22,
          height: 22,
          background: c.border,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {icons[variant]}
      </span>
      {/* Pesan */}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: c.text, lineHeight: 1.4 }}>
        {message}
      </p>
    </motion.div>
  );
}

/* ── Custom Hook: useToast ── */
export function useToast() {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: '',
    variant: 'info',
  });

  /* Timer ref untuk auto-hide */
  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 3500) => {
      setState({ visible: true, message, variant });
      setTimeout(() => {
        setState((prev) => ({ ...prev, visible: false }));
      }, duration);
    },
    []
  );

  /* Elemen toast yang di-render di JSX */
  const toast = (
    <AnimatePresence>
      {state.visible && (
        <ToastNotification key="toast" message={state.message} variant={state.variant} />
      )}
    </AnimatePresence>
  );

  return { toast, showToast };
}
