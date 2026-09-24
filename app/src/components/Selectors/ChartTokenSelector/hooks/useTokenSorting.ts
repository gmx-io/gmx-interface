import { useState } from 'react';

export type SortField =
  | 'change24h'
  | 'volume24h'
  | 'longOI'
  | 'shortOI'
  | 'longLiq'
  | 'shortLiq'
  | null;
export type SortDirection = 'asc' | 'desc';

export const useTokenSorting = () => {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: Exclude<SortField, null>) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortField(null);
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return {
    sortField,
    sortDirection,
    handleSort,
  };
};
