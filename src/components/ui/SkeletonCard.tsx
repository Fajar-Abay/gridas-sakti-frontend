/**
 * components/ui/SkeletonCard.tsx
 * Skeleton loading placeholder dengan animasi shimmer.
 * Gunakan saat data sedang diambil dari API.
 */

/* ── Single skeleton block ── */
interface SkeletonBlockProps {
  height?: number | string;
  width?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBlock({
  height = 16,
  width = '100%',
  className = '',
  style,
}: SkeletonBlockProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width, ...style }}
      aria-hidden="true"
    />
  );
}

/* ── Skeleton untuk card list item ── */
export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <SkeletonBlock height={44} width="44px" className="skeleton" style={{ borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBlock height={14} width="60%" />
          <SkeletonBlock height={12} width="40%" />
        </div>
        <SkeletonBlock height={22} width="70px" style={{ borderRadius: 999 }} />
      </div>
      {/* Body */}
      <SkeletonBlock height={12} width="90%" />
      <SkeletonBlock height={12} width="75%" />
    </div>
  );
}

/* ── Skeleton list — beberapa card sekaligus ── */
interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 4 }: SkeletonListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── Skeleton untuk stat card di dashboard ── */
export function SkeletonStat() {
  return (
    <div
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}
    >
      <SkeletonBlock height={12} width="50%" />
      <SkeletonBlock height={32} width="40%" />
    </div>
  );
}

/* ── Skeleton untuk header profil ── */
export function SkeletonHeader() {
  return (
    <div
      style={{
        background: 'var(--primary-700)',
        padding: '24px 20px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      <div
        className="skeleton-dark"
        style={{ width: 64, height: 64, borderRadius: '50%' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-dark" style={{ height: 18, width: '55%', borderRadius: 8 }} />
        <div className="skeleton-dark" style={{ height: 13, width: '40%', borderRadius: 8 }} />
      </div>
    </div>
  );
}
