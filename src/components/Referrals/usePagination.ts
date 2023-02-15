import { useEffect, useState } from "react";

export const paginate = ({ total, current, size }) => {
  const pages = Math.ceil(total / size);

  if (current < 1) {
    current = 1;
  } else if (current > pages) {
    current = pages;
  }

  const start = (current - 1) * size;
  const end = Math.min(start + size - 1, total - 1);
  return {
    start,
    end,
  };
};

export default function usePagination(items = [], size = 10) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(Math.ceil(items.length / size));

  useEffect(() => {
    setTotalPages(Math.ceil(items.length / size));
  }, [items, size]);

  function getCurrentData() {
    const { start, end } = paginate({ total: items.length, current: currentPage, size });
    return items.slice(start, end + 1);
  }

  return {
    currentPage,
    setCurrentPage,
    pageCount: totalPages,
    getCurrentData,
  };
}
