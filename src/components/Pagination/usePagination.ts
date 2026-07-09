import { useCallback, useEffect, useMemo, useState } from "react";

import { usePrevious } from "lib/usePrevious";

type PaginateParams = {
  total: number;
  current: number;
  size: number;
};

const paginate = ({ total, current, size }: PaginateParams) => {
  const pages = Math.ceil(total / size);
  let currentPage = current;

  if (currentPage < 1) {
    currentPage = 1;
  } else if (currentPage > pages) {
    currentPage = pages;
  }

  const start = (currentPage - 1) * size;
  const end = Math.min(start + size - 1, total - 1);
  return {
    start,
    end,
  };
};

export const DEFAULT_PAGE_SIZE = 10;

export default function usePagination<T>(
  paginationKey: string,
  items: T[] = [],
  size = DEFAULT_PAGE_SIZE,
  totalItems?: number
) {
  const total = totalItems ?? items.length;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(Math.ceil(total / size));
  const prevPaginationKey = usePrevious(paginationKey);

  useEffect(() => {
    setTotalPages(Math.ceil(total / size));
  }, [size, total]);

  useEffect(() => {
    if (paginationKey !== prevPaginationKey) {
      setCurrentPage(1);
    }
  }, [paginationKey, prevPaginationKey]);

  const getCurrentData = useCallback((): T[] => {
    const { start, end } = paginate({ total, current: currentPage, size });
    return items.slice(start, end + 1);
  }, [items, currentPage, size, total]);

  const currentData = useMemo(() => getCurrentData(), [getCurrentData]);

  return {
    currentPage,
    setCurrentPage,
    pageCount: totalPages,
    getCurrentData,
    currentData,
  };
}
