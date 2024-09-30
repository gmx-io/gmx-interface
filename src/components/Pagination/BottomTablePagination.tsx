import Pagination, { PaginationProps } from "./Pagination";

export function BottomTablePagination({ page, pageCount, onPageChange }: Omit<PaginationProps, "topMargin">) {
  if (pageCount <= 1) {
    return <></>;
  }

  return (
    <>
      <div className="h-1 bg-slate-700"></div>
      <div className="p-8">
        <Pagination topMargin={false} page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </div>
    </>
  );
}
