import { ReactNode } from 'react';

export default function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '56px 20px',
        color: 'var(--muted)',
      }}
    >
      {icon && (
        <div style={{ color: 'var(--secondary)', marginBottom: 14 }}>{icon}</div>
      )}
      <h3 style={{ color: 'var(--navy)', marginBottom: 8 }}>{title}</h3>
      {message && <p style={{ maxWidth: 420, margin: '0 auto' }}>{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
