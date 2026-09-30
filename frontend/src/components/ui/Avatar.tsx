import styles from './Avatar.module.css';

/**
 * Doctor / patient avatar. Shows the photo when there is one; otherwise the
 * person's initials on a colour picked from their name, so seeded demo
 * doctors never share the same stock face.
 */
const TONES = ['#283779', '#1b71a1', '#0e7c86', '#6a4c93', '#2f6f4f', '#8a4b2a'];

export default function Avatar({
  name,
  src,
  size = 64,
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const clean = name.replace(/^(dr|prof)\.?\s+/i, '');
  const initials = clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const tone = TONES[[...clean].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${styles.avatar} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`${styles.avatar} ${styles.initials} ${className}`}
      style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }}
      role="img"
      aria-label={name}
    >
      {initials}
    </span>
  );
}
