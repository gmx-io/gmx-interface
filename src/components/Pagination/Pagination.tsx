import TransparentButton from "components/Buttons/TransparentButton";
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
          key={currentPage}
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

  if (pageCount <= 1) {
    return <></>;
  }

  return (
    <div className="pagination">
      <div className="pagination-buttons">
        <TransparentButton onClick={() => onPageChange(1)} disabled={page <= 1}>
          {"|<"}
        </TransparentButton>
        <TransparentButton onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {"<"}
        </TransparentButton>
        <div className="pagination-btn-middle">{middleButtons()}</div>
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
