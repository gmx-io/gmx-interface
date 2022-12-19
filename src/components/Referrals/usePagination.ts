import { useEffect, useState } from "react";

export default function usePagination(data = [], postPerPage = 10) {
  const [currentData, setCurrentData] = useState<any>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = Math.round(data.length / postPerPage);

  useEffect(() => {
    const startIndex = (currentPage - 1) * 10;
    const endIndex = currentPage * 10;
    setCurrentData(data.slice(startIndex, endIndex));
  }, [currentPage, data]);

  function onNextClick() {
    setCurrentPage((prev) => {
      if (totalPages > currentPage) {
        return prev + 1;
      }
      return prev;
    });
  }

  function onPrevClick() {
    setCurrentPage((prev) => {
      if (currentPage > 1 && currentPage <= totalPages) {
        return prev - 1;
      }
      return prev;
    });
  }

  function isNextEnabled() {
    if (totalPages > currentPage) {
      return true;
    }
  }
  function isPrevEnabled() {
    if (currentPage > 1) {
      return true;
    }
  }
  return {
    currentData,
    currentPage,
    onNextClick,
    onPrevClick,
    isNextEnabled,
    isPrevEnabled,
  };
}
