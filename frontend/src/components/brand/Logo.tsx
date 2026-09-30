/**
 * Vita Care brand mark: a speech bubble with a pulse line (a conversation that cares)
 * with a pulse line running through it (health). Pure SVG, scales anywhere.
 */
export function LogoMark({ size = 36, tone = 'color' }: { size?: number; tone?: 'color' | 'light' }) {
  const bubble = tone === 'light' ? '#ffffff' : 'var(--navy)';
  const pulse = tone === 'light' ? 'var(--navy)' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        d="M24 4C12.4 4 4 11.9 4 21.6c0 5.4 2.6 10.2 6.8 13.4L9 43.2c-.2 1 .8 1.7 1.7 1.2l8.3-4.6c1.6.4 3.3.6 5 .6 11.6 0 20-7.9 20-17.8S35.6 4 24 4Z"
        fill={bubble}
      />
      <path
        d="M10 23h7l3-7 5 14 3.5-9 2 2H38"
        fill="none"
        stroke={pulse}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="23" r="2.6" fill="var(--saffron)" />
    </svg>
  );
}

export default function Logo({ tone = 'color', size = 36 }: { tone?: 'color' | 'light'; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} tone={tone} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: size * 0.62,
            letterSpacing: '-0.02em',
            color: tone === 'light' ? '#fff' : 'var(--navy)',
          }}
        >
          Vita<span style={{ color: tone === 'light' ? '#7fe3f2' : 'var(--cyan)' }}>Care</span>
        </span>
        <span
          lang="ur"
          style={{
            fontFamily: 'var(--font-urdu), serif',
            fontSize: size * 0.3,
            color: tone === 'light' ? 'rgba(255,255,255,.75)' : 'var(--blue)',
            marginTop: 2,
          }}
        >
          آپ کی صحت، ہماری ترجیح
        </span>
      </span>
    </span>
  );
}
