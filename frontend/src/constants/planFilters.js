export const PLAN_PAGE_SIZE_OPTIONS = [10, 20, 50];

export const DEFAULT_PLAN_FILTERS = {
  search: '',
  status: 'active',
  limit: 10,
};

export function countActivePlanFilters(filters) {
  let count = 0;

  if (filters.limit !== DEFAULT_PLAN_FILTERS.limit) count += 1;

  return count;
}

export function buildPlansListParams(filters, page) {
  return {
    q: filters.search.trim() || undefined,
    status: filters.status || undefined,
    limit: filters.limit,
    page,
  };
}
