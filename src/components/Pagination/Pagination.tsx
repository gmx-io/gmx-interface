import cx from "classnames";

import Button from "components/Button/Button";

import ChevronEdgeLeft from "img/ic_chevron_edge_left.svg?react";
import ChevronEdgeRight from "img/ic_chevron_edge_right.svg?react";

import "./Pagination.css";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  topMargin?: boolean;
};

function getPageNumbers(current, max = 1) {
  if (max === 1) return [];
  if (current === 1) {
    return max >= 3 ? [1, 2, 3] : [1, 2];
  } else if (current === max) {
    return max >= 3 ? [current - 2, current - 1, current] : [current - 1, current];
  } else {
    return [current - 1, current, current + 1];
  }
}

export default function Pagination({ page, pageCount, topMargin = true, onPageChange }: PaginationProps) {
  if (pageCount <= 1) {
    return <></>;
  }

  const middleButtons = getPageNumbers(page, pageCount).map((pageNumber) => {
    return (
      <button
        key={pageNumber}
        className={cx("p-8 flex items-center justify-center w-40 h-40 max-md:w-32 max-md:h-32 rounded-8 font-tthoves-native font-medium", {
          "bg-blue-400": pageNumber === page,
        })}
        onClick={() => onPageChange(pageNumber)}
      >
        {pageNumber}
      </button>
    );
  });

  return (
    <div
      className={cx("pagination", {
        "mt-25": topMargin,
      })}
    >
      <div className="flex gap-8 text-body-medium max-md:text-[13px]">
        <Button variant="secondary" onClick={() => onPageChange(1)} className="w-40 h-40 max-md:w-32 max-md:h-32" disabled={page <= 1}>
          <div className="size-14"><ChevronEdgeLeft /></div>
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} className="w-40 h-40 max-md:w-32 max-md:h-32" disabled={page <= 1}>
          <FaChevronLeft size={12} />
        </Button>
        <div className="flex gap-8">{middleButtons}</div>
        <Button variant="secondary" onClick={() => onPageChange(page + 1)} className="w-40 h-40 max-md:w-32 max-md:h-32" disabled={page >= pageCount}>
          <FaChevronRight size={12} />
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(pageCount)} className="w-40 h-40 max-md:w-32 max-md:h-32" disabled={page >= pageCount}>
          <div className="size-14"><ChevronEdgeRight /></div>
        </Button>
      </div>
    </div>
  );
}
