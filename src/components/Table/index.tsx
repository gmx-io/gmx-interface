import React from "react";
import { t } from "@lingui/macro";
import classnames from "classnames";
import Tooltip from "../Tooltip/Tooltip";
import { TableCellProps, TableProps } from "./types";

import "./index.css";
import { createBreakpoint } from "react-use";

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
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
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
                  v && v.tooltip ? (
                    <Tooltip
                      handle={ v.title }
                      position="center-top"
                      renderContent={
                        typeof v.tooltip === "function"
                          ? v.tooltip
                          : () => <p>{ v.tooltip as string }</p>
                      }
                    />
                  ) : v?.title
                }
              </th>
            ))
          }
        </tr>
        {
          isLoading ? <tr><td colSpan={5}>{ t`Loading...` }</td></tr> : (
            error ? <tr><td colSpan={9}>{ t`Error` + ": " + errorMsg }</td></tr> : (
              !content.length ? <tr><td colSpan={9}>{ t`No data yet` }</td></tr> : (
                content.map((row: T) => (
                  <tr key={ row[rowKey] }>
                    {
                      Object.keys(titles).map(k => (
                        <TableCell
                          key={ `${ row[rowKey] }_${ k }` }
                          breakpoint={ breakpoint }
                          data={ row[k] }
                        />
                      ))
                    }
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

const TableCell = ({ data, breakpoint }: TableCellProps) => {
  const isObject = data && typeof data === "object";
  const cellClassName = classnames(isObject && data.className);
  let content;
  if (isObject) {
    content = typeof data.render === "function" ? data.render(data.value, breakpoint) : data.value;
  } else {
    content = data;
  }

  return <td className={ cellClassName }>{ content }</td>;
};
