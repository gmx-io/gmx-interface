import Button from "components/Button/Button";
import "./Pagination.css";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: any;
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
        <Button variant="secondary" onClick={() => onPageChange(1)} disabled={page <= 1}>
          {"|<"}
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {"<"}
        </Button>
        <div className="pagination-btn-middle">{middleButtons}</div>
        <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          {">"}
        </Button>
        <Button variant="secondary" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount}>
          {">|"}
        </Button>
      </div>
    </div>
  );
}
