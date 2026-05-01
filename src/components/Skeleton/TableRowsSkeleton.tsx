import cx from "classnames";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

import { TableTd, TableTr } from "components/Table/Table";

import "react-loading-skeleton/dist/skeleton.css";
import "./Skeleton.scss";

type TableCellPadding = "all" | "compact" | "compact-one-column";
type SkeletonColumn =
  | number
  | string
  | {
      width?: number | string;
      className?: string;
    };

type Props = {
  columns: SkeletonColumn[];
  count: number;
  cellClassName?: string;
  invisible?: boolean;
  padding?: TableCellPadding;
  rowClassName?: string;
};

function getColumnWidth(column: SkeletonColumn) {
  return typeof column === "object" ? column.width : column;
}

function getColumnClassName(column: SkeletonColumn) {
  return typeof column === "object" ? column.className : undefined;
}

export function TableRowsSkeleton({ columns, count, cellClassName, invisible = false, padding, rowClassName }: Props) {
  if (count <= 0) return null;

  return (
    <SkeletonTheme
      baseColor={invisible ? "transparent" : "#B4BBFF1A"}
      highlightColor={invisible ? "transparent" : "#B4BBFF1A"}
      enableAnimation={!invisible}
    >
      {Array.from({ length: count }).map((_, rowIndex) => (
        <TableTr key={rowIndex} className={rowClassName}>
          {columns.map((column, columnIndex) => (
            <TableTd key={columnIndex} padding={padding} className={cx(cellClassName, getColumnClassName(column))}>
              <Skeleton width={getColumnWidth(column)} inline />
            </TableTd>
          ))}
        </TableTr>
      ))}
    </SkeletonTheme>
  );
}
