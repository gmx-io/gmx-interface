import React from "react";
import { Trans } from "@lingui/macro";
import { TableProps } from "./types";

export default function Table<T extends Record<string, any>>({
  enumerate = false,
  enumerateFrom = 0,
  isLoading,
  error,
  content,
  titles,
  rowKey
}: TableProps<T>) {
  return (
    <table className="Exchange-list large App-box">
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
          isLoading ? <tr><td colSpan={5}>Loading...</td></tr> : (
            error ? <tr><td colSpan={9}>{`Error: ${error}`}</td></tr> : (
              !content.length ? <tr><td colSpan={9}>Not data yet</td></tr> : (
                content.map((row, i) => (
                  <tr key={row[rowKey]}>
                    {
                      enumerate && (
                        <td key={`${row[rowKey]}_rank`}>{`${enumerateFrom + i + 1}`}</td>
                      )
                    }
                    {
                      Object.keys(titles).map(k => (
                        <td className={titles[k]!.className} key={`${row[rowKey]}_${k}`}>
                          {row[k]}
                        </td>
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
