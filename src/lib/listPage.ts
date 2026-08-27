// 2.2 servers return { data, meta: { page, pageSize, total } } for /violations and
// /users; 2.1 servers return the same fields at the top level. Paired servers update
// lazily, so both shapes stay readable.
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

interface LegacyPage {
  page?: number;
  pageSize?: number;
  total?: number;
}

export type AnyPage = { meta?: PageMeta } & LegacyPage;

export function pageMetaOf(page: AnyPage): PageMeta {
  if (page.meta) {
    return { page: page.meta.page, pageSize: page.meta.pageSize, total: page.meta.total };
  }
  return { page: page.page ?? 1, pageSize: page.pageSize ?? 0, total: page.total ?? 0 };
}

export function pageCountOf(meta: PageMeta): number {
  return meta.pageSize > 0 ? Math.ceil(meta.total / meta.pageSize) : 0;
}

export function nextPageOf(page: AnyPage): number | undefined {
  const meta = pageMetaOf(page);
  return meta.page < pageCountOf(meta) ? meta.page + 1 : undefined;
}
