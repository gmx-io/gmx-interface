/* eslint-disable @typescript-eslint/no-unsafe-return */
import './Pagination.css';

import Button from '@/components/Common/Button/Button';
import cx from 'classnames';
import LeftBtn from "@/img/pagination/left_btn.svg";
import LeftBtnMax from "@/img/pagination/left_btn_max.svg";
import RightBtn from "@/img/pagination/right_btn.svg";
import RightBtnMax from "@/img/pagination/right_btn_max.svg";

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  topMargin?: boolean;
  showBoundaryButtons?: boolean;
};

function getPageNumbers(current: number, max = 1) {
  if (max === 1) return [];
  if (current === 1) {
    return max >= 3 ? [1, 2, 3] : [1, 2];
  } else if (current === max) {
    return max >= 3
      ? [current - 2, current - 1, current]
      : [current - 1, current];
  } else {
    return [current - 1, current, current + 1];
  }
}

export default function Pagination({
  page,
  pageCount,
  topMargin = true,
  onPageChange,
  showBoundaryButtons = true,
}: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const arrowButtonClassName =
    '!bg-fill-surface-elevated !text-secondary hover:!bg-[#323232] hover:!text-white disabled:!bg-fill-surface-base disabled:!text-slate-500 disabled:hover:!bg-fill-surface-base disabled:hover:!text-slate-500';

  const middleButtons = getPageNumbers(page, pageCount).map((pageNumber) => {
    return (
      <button
        key={pageNumber}
        className={cx(
          'pagination-btn bg-transparent text-secondary hover:bg-[#323232] hover:text-white',
          pageNumber === page && '!bg-primary-500 !text-white hover:!bg-primary-500'
        )}
        onClick={() => onPageChange(pageNumber)}
      >
        {pageNumber}
      </button>
    );
  });

  return (
    <div
      className={cx('pagination', {
        'mt-25': topMargin,
      })}
    >
      <div className="pagination-buttons">
        {showBoundaryButtons && (
          <Button
            variant="secondary"
            className={arrowButtonClassName}
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
          >
            <img src={LeftBtnMax} height={16} width={16} />
          </Button>
        )}
        <Button
          variant="secondary"
          className={arrowButtonClassName}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <img src={LeftBtn} height={16} width={16} />
        </Button>
        <div className="pagination-btn-middle">{middleButtons}</div>
        <Button
          variant="secondary"
          className={arrowButtonClassName}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          <img src={RightBtn} height={16} width={16} />
        </Button>
        {showBoundaryButtons && (
          <Button
            variant="secondary"
            className={arrowButtonClassName}
            onClick={() => onPageChange(pageCount)}
            disabled={page >= pageCount}
          >
            <img src={RightBtnMax} height={16} width={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
