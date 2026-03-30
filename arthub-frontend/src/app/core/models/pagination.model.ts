export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  lastPage: number;
  itemsPerPage: number;
}