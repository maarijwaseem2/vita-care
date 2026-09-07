export default function Loader({ label }: { label?: string }) {
  return (
    <div className="page-loader">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
        {label && (
          <p className="text-muted mt-2" style={{ fontSize: '0.92rem' }}>
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
