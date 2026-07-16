export const CLIENT_SORT_LABELS = {
  createdAt: 'Fecha de alta',
  fullName: 'Nombre',
  username: 'Usuario',
  status: 'Estado',
};

export const CLIENT_LOGIN_FILTER_LABELS = {
  logged: 'Con acceso registrado',
  never: 'Sin acceso aún',
};

export const CLIENT_PAGE_SIZE_OPTIONS = [10, 20, 50];

export const DEFAULT_CLIENT_FILTERS = {
  search: '',
  status: '',
  hasLogin: '',
  createdFrom: '',
  createdTo: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  limit: 10,
};

export function countActiveClientFilters(filters) {
  let count = 0;

  if (filters.hasLogin) count += 1;
  if (filters.createdFrom) count += 1;
  if (filters.createdTo) count += 1;
  if (filters.sortBy !== DEFAULT_CLIENT_FILTERS.sortBy) count += 1;
  if (filters.sortOrder !== DEFAULT_CLIENT_FILTERS.sortOrder) count += 1;
  if (filters.limit !== DEFAULT_CLIENT_FILTERS.limit) count += 1;

  return count;
}

export function buildClientsListParams(filters, page) {
  return {
    q: filters.search.trim() || undefined,
    status: filters.status || undefined,
    hasLogin: filters.hasLogin || undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    limit: filters.limit,
    page,
  };
}
