import Pagination, { PaginationProps } from './Pagination';

export function BottomTablePagination({
  page,
  pageCount,
  onPageChange,
  showBoundaryButtons,
}: Omit<PaginationProps, 'topMargin'>) {
  if (pageCount <= 1) {
    return <></>;
  }

  return (
    <>
      <div className="py-[1.6rem]">
        <Pagination
          topMargin={false}
          page={page}
          pageCount={pageCount}
          onPageChange={onPageChange}
          showBoundaryButtons={showBoundaryButtons}
        />
      </div>
    </>
  );
}
