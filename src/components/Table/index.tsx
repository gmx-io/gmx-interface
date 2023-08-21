import React from "react";
import { t } from "@lingui/macro";
import classnames from "classnames";
import Davatar from "@davatar/react";
import { Link } from "react-router-dom";
import { createBreakpoint } from "react-use";
import { TableProps } from "./types";
import { useJsonRpcProvider } from "lib/rpc";
import { shortenAddress } from "lib/legacy";
import { ETH_MAINNET } from "config/chains";
import Tooltip from "../Tooltip/Tooltip";

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
            Object.keys(titles).filter(k => titles[k]).map(k => (
              <th key={`table_header_${k}`} className={titles[k]!.className}>
                {
                  titles[k]!.tooltip ? (
                    <Tooltip
                      handle={ titles[k]!.title }
                      position="center-top"
                      renderContent={() => (
                        titles[k]!.tooltip!.split("\\n").map(s => <div key={s}>{s}</div>)
                      )}
                    />
                  ) : titles[k]!.title
                }
              </th>
            ))
          }
        </tr>
        {
          isLoading ? <tr><td colSpan={5}>{ t`Loading...` }</td></tr> : (
            error ? <tr><td colSpan={9}>{ t`Error` + ": " + errorMsg }</td></tr> : (
              !content.length ? <tr><td colSpan={9}>{ t`No data yet` }</td></tr> : (
                content.map(row => (
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

type TableCellData = {
  value: string | number;
  className?: string;
  linkTo?: string;
  target?: string;
  isAddress?: boolean;
};

type TableCellProps = {
  data: string | TableCellData | Array<TableCellData>;
};

const TableCell = ({ data }: TableCellProps) => {
  const multipleValues = Array.isArray(data);
  const cellClassName = classnames(!multipleValues && typeof data !== "string" && data.className);
  const renderValue = d => typeof d.render === "function" ? d.render(d.value) : d.value || d
  const renderLink = (d: TableCellData) => (
    <Link to={ d.linkTo! } target={ d.target } className={ d.className }>{ renderValue(d) }</Link>
  );

  let cellContent;
  if (multipleValues) {
    cellContent = data.map(c => c.linkTo ? renderLink(c) : (
      <span key={ c.value } className={ classnames(c.className) }>{ renderValue(c) }</span>
    ));
  } else if (typeof data !== 'string' && data.isAddress) {
    cellContent = <AddressTableCell address={ data.value as string }/>
  } else {
    cellContent = typeof data !== "string" && data.linkTo ? renderLink(data) : renderValue(data);
  }

  return <td className={ cellClassName }>{ cellContent }</td>;
};

const AddressTableCell = ({ address }: { address: string }) => {
  const { provider } = useJsonRpcProvider(ETH_MAINNET);
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();

  return (
    <Link className="trader-account-lable" to={`/actions/v2/${address}`} target="_blank">
      { provider ? <Davatar size={20} address={address} provider={provider}/> : null }
      <span>{ shortenAddress(address, breakpoint === "S" ? 20 :42) }</span>
    </Link>
  );
};
