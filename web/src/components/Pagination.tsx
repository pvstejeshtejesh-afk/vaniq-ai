export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) {
    return <p className="px-4 py-3 text-xs text-slate-400">{total} item{total === 1 ? '' : 's'}</p>;
  }
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <span className="text-xs text-slate-500">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ← Prev
        </button>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
