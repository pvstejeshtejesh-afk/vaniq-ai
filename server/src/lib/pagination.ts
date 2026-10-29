/** Shared list-pagination helper (spec §15). */

export interface PageQuery {
  page: number;
  limit: number;
  q: string;
}

export function parsePageQuery(query: Record<string, unknown>, defaultLimit = 25): PageQuery {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = Number(query.limit) || defaultLimit;
  const limit = Math.min(200, Math.max(1, rawLimit));
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
  return { page, limit, q };
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): { items: T[]; total: number; page: number; pages: number; limit: number } {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, pages, limit };
}
