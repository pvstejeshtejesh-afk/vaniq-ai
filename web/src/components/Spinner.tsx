export function Spinner({ full = false }: { full?: boolean }) {
  const el = (
    <div className="flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  );
  if (full) return <div className="flex min-h-screen items-center justify-center">{el}</div>;
  return el;
}
