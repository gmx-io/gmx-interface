import cx from "classnames";

import Pagination, { PaginationProps } from "./Pagination";

export function BottomTablePagination({
  page,
  pageCount,
  onPageChange,
  className,
}: Omit<PaginationProps, "topMargin"> & { className?: string }) {
  if (pageCount <= 1) {
    return <></>;
  }

  return (
    <div className={cx("p-8", className)}>
      <Pagination topMargin={false} page={page} pageCount={pageCount} onPageChange={onPageChange} />
    </div>
  );
}
