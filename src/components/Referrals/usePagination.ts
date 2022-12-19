import { useEffect, useState } from "react";

export default function usePagination(data = [], postPerPage = 10) {
  const [currentData, setCurrentData] = useState<any>([]);
  const [page, setPage] = useState<number>(1);
  const pageCount = Math.round(data.length / postPerPage);

  useEffect(() => {
    const startIndex = (page - 1) * postPerPage;
    const endIndex = page * postPerPage;
    setCurrentData(data.slice(startIndex, endIndex));
  }, [page, data, postPerPage]);

  return {
    currentData,
    page,
    setPage,
    pageCount,
  };
}
