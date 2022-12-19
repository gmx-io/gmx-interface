import TransparentButton from "components/Buttons/TransparentButton";
import "./Pagination.css";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: any;
};

function range(start, end) {
  let length = end - start + 1;
  return Array.from({ length }, (_, idx) => idx + start);
}

function getPageNumbers(current, max) {
  if (max === 2) {
    return [1, 2];
  }
  if (current <= 1) {
    return range(current, current + 2);
  }

  if (current + 1 <= max) {
    return range(current - 1, current + 1);
  }

  if (current <= max) {
    return range(current - 2, current);
  }
  return [];
}

export default function Pagination({ page, pageCount, onPageChange }: Props) {
  if (pageCount <= 1) {
    return <></>;
  }

  const middleButtons = getPageNumbers(page, pageCount).map((pageNumber) => {
    return (
      <button
        key={pageNumber}
        className={"pagination-btn" + (pageNumber === page ? " active" : "")}
        onClick={() => onPageChange(pageNumber)}
      >
        {pageNumber}
      </button>
    );
  });

  return (
    <div className="pagination">
      <div className="pagination-buttons">
        <TransparentButton onClick={() => onPageChange(1)} disabled={page <= 1}>
          {"|<"}
        </TransparentButton>
        <TransparentButton onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {"<"}
        </TransparentButton>
        <div className="pagination-btn-middle">{middleButtons}</div>
        <TransparentButton onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          {">"}
        </TransparentButton>
        <TransparentButton onClick={() => onPageChange(pageCount)} disabled={page >= pageCount}>
          {">|"}
        </TransparentButton>
      </div>
    </div>
  );
}
