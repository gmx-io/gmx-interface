import { ReactElement } from "react";
import "./Pagination.css";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: any;
};

export default function Pagination({ page, pageCount, onPageChange }: Props) {
  const middleButtons = () => {
    const buttons: ReactElement[] = [];

    let i = -1;
    while (true) {
      if (page + i < 1) {
        i++;
        continue;
      }

      if (page + i > pageCount) {
        break;
      }

      let currentPage = page + i;

      buttons.push(
        <button
          className={"pagination-btn" + (currentPage === page ? " active" : "")}
          onClick={() => onPageChange(currentPage)}
        >
          {currentPage}
        </button>
      );

      i++;

      if (buttons.length === 3) {
        break;
      }
    }

    return buttons;
  };

  return (
    <div className="pagination">
      <div className="pagination-buttons">
        <button className="pagination-btn" onClick={() => onPageChange(1)} disabled={page <= 1}>
          {"|<"}
        </button>
        <button className="pagination-btn" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {"<<"}
        </button>
        {middleButtons()}
        <button className="pagination-btn" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          {">>"}
        </button>
        <button className="pagination-btn" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount}>
          {">|"}
        </button>
      </div>
    </div>
  );
}
