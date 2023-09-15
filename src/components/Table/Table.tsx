import React from "react";
import isObject from "lodash/isObject";
import { t } from "@lingui/macro";
import cx from "classnames";
import Tooltip from "../Tooltip/Tooltip";
import { TableCellData, TableCellProps, TableProps } from "./types";

import "./Table.css";
import { createBreakpoint } from "react-use";

export default function Table<T extends Record<string, any>>({
  isLoading,
  error,
  content,
  titles,
  rowKey,
  className,
}: TableProps<T>) {
  let errorMsg: string | null = null;
  if (error) {
    errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
  }
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  return (
    <div className="TableBox">
      <table className={cx("Exchange-list", /*"large", */"App-box", "Table", className)}>
        <tbody>
          <tr className="Exchange-list-header">
            {Object.entries(titles)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <th
                  key={`table_header_${k}`}
                  onClick={v!.onClick || (() => {})}
                  className={cx("TableHeader", v!.className)}
                  style={ v && v.width ? { width: `${v!.width}%` } : undefined }
                >
                  {v?.tooltip ? (
                    <Tooltip
                      handle={<span className="TableHeaderTitle">{v?.title}</span>}
                      isPopupClickable={false}
                      position="right-bottom"
                      className="TableHeaderTooltip"
                      renderContent={typeof v.tooltip === "function" ? v.tooltip : () => <p>{v.tooltip as string}</p>}
                    />
                  ) : (
                    <span className="TableHeaderTitle">{v?.title}</span>
                  )}
                </th>
              ))}
          </tr>
          {isLoading ? (
            <tr>
              <td colSpan={5}>{t`Loading...`}</td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={9}>{t`Error` + ": " + errorMsg}</td>
            </tr>
          ) : !content.length ? (
            <tr>
              <td colSpan={9}>{t`No data yet`}</td>
            </tr>
          ) : (
            content.map((row: T) => (
              <tr key={row[rowKey]}>
                {Object.keys(titles).map((k) => (
                  <TableCell key={`${row[rowKey]}_${k}`} breakpoint={breakpoint} data={row[k]} />
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const TableCell = ({ data, breakpoint }: TableCellProps) => {
  const isObj = isObject(data);
  const cellClassName = cx(isObj && (data as TableCellData).className);
  let content;
  if (isObj) {
    const { value } = data as TableCellData;
    content = typeof value === "function" ? value(breakpoint) : value;
  } else {
    content = data;
  }

  return <td className={cellClassName}>{content}</td>;
};
