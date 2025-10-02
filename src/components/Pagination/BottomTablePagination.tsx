import Pagination, { PaginationProps } from "./Pagination";

export function BottomTablePagination({ page, pageCount, onPageChange }: Omit<PaginationProps, "topMargin">) {
  if (pageCount <= 1) {
    return <></>;
  }

  return (
    <div className="p-8">
      <Pagination topMargin={false} page={page} pageCount={pageCount} onPageChange={onPageChange} />
    </div>
  );
}
