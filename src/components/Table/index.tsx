import React from "react";
import { t } from "@lingui/macro";
import classnames from "classnames";
import Tooltip from "../Tooltip/Tooltip";
import { TableCellProps, TableProps } from "./types";

import "./index.css";

export default function Table<T extends Record<string, any>>({
  isLoading,
  error,
  content,
  titles,
  rowKey
}: TableProps<T>) {
  let errorMsg: string | null = null;
  if (error) {
    errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
  }
  return (
    <table className="Exchange-list large App-box table">
      <tbody>
        <tr className="Exchange-list-header">
          {
            Object.entries(titles).filter(([_, v]) => v).map(([k, v]) => (
              <th
                key={ `table_header_${k}` }
                onClick={ v!.onClick || (() => {}) }
                className={
                  classnames(v!.className, typeof v!.onClick === "function" && "clickable-header")
                }
              >
                {
                  v!.tooltip ? (
                    <Tooltip
                      handle={ v!.title }
                      position="center-top"
                      renderContent={() => (
                        v!.tooltip!.split("\\n").map(s => <div key={s}>{s}</div>)
                      )}
                    />
                  ) : v!.title
                }
              </th>
            ))
          }
        </tr>
        {
          isLoading ? <tr><td colSpan={5}>{ t`Loading...` }</td></tr> : (
            error ? <tr><td colSpan={9}>{ t`Error` + ": " + errorMsg }</td></tr> : (
              !content.length ? <tr><td colSpan={9}>{ t`No data yet` }</td></tr> : (
                content.map((row, i) => (
                  <tr key={row[rowKey]}>
                    { Object.keys(titles).map(k => <TableCell data={ row[k] } key={ `${row[rowKey]}_${k}` }/>) }
                  </tr>
                ))
              )
            )
          )
        }
      </tbody>
    </table>
  )
};

const TableCell = ({ data }: TableCellProps) => {
  const isObject = typeof data === "object";
  const cellClassName = classnames(isObject && data.className);
  let content;
  if (isObject) {
    content = typeof data.render === "function" ? data.render(data.value) : data.value;
  } else {
    content = data;
  }

  return <td className={ cellClassName }>{ content }</td>;
};
