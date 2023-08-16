import React from "react";
import { Trans, t } from "@lingui/macro";
import { TableProps } from "./types";
import classnames from "classnames";
import "./index.css";
import { Link } from "react-router-dom";

export default function Table<T extends Record<string, any>>({
  enumerate = false,
  offset = 0,
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
            enumerate && <th key={`table_header_rank`}><Trans>Rank</Trans></th>
          }
          {
            Object.keys(titles).filter(k => titles[k]).map(k => (
              <th key={`table_header_${k}`} className={titles[k]!.className}>
                <Trans>{titles[k]!.title}</Trans>
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
                    { enumerate && (<td key={`${row[rowKey]}_rank`}>{`${offset + i + 1}`}</td>) }
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

type TableCellData = {
  value: string | number;
  className?: string;
  linkTo?: string;
  target?: string;
};

type TableCellProps = {
  data: string | TableCellData | Array<TableCellData>
  key: string;
}

const TableCell = ({ data, key }: TableCellProps) => {
  const multipleValues = Array.isArray(data);
  const cellClassName = classnames(!multipleValues && typeof data !== "string" && data.className);
  const renderValue = d => d.value || d
  const renderLink = (d: TableCellData, key: string) => (
    <Link key={ key } to={ d.linkTo! } target={ d.target } className={ d.className }>{ d.value }</Link>
  );

  let cellContent;
  if (multipleValues) {
    cellContent = data.map((c, i) => c.linkTo ? renderLink(c, `${key}_${i}`) : (
      <span key={ `${key}_${i}` } className={ classnames(c.className) }>{ renderValue(c) }</span>
    ));
  } else {
    cellContent = typeof data !== "string" && data.linkTo ? renderLink(data, key) : renderValue(data);
  }

  return <td className={ cellClassName } key={ key }>{ cellContent }</td>;
};
