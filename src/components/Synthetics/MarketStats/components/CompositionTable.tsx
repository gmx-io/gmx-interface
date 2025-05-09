import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";

import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { getMarketIndexName } from "../../../../domain/synthetics/markets/utils";
import { CompositionItem, CompositionType, getCompositionPercentage } from "../hooks/useCompositionData";

interface Props<T extends CompositionType> {
  composition: CompositionItem[];
  compositionType: T;
}

export function CompositionTable<T extends CompositionType>({ composition, compositionType }: Props<T>) {
  const columns = useMemo(() => {
    if (compositionType === "market") {
      return [t`MARKET`, t`TVL/CAP`, t`COMP.`];
    }

    return [t`COLLATERAL`, t`COMP.`];
  }, [compositionType]);

  const sum = useMemo(() => {
    return composition.reduce(
      (acc, item) => (item.type === "market" ? acc + item.gmBalanceUsd : acc + item.amount),
      0n
    );
  }, [composition]);

  return (
    <table className="w-full">
      <thead>
        <TableTheadTr bordered>
          {columns.map((column) => (
            <TableTh key={column} className="sticky top-0 bg-slate-800">
              <Trans>{column}</Trans>
            </TableTh>
          ))}
        </TableTheadTr>
      </thead>
      <tbody>
        {composition.map((item) => (
          <CompositionTableRow
            key={item.type === "market" ? item.market.marketTokenAddress : item.token.address}
            item={item}
            sum={sum}
          />
        ))}
      </tbody>
    </table>
  );
}

const CompositionTableRow = ({ item, sum }: { item: CompositionItem; sum: bigint }) => {
  return (
    <TableTr className="!border-0">
      <TableTd>
        <div className="flex flex-row items-center gap-8">
          <span
            className="inline-block h-10 w-10 shrink-0 rounded-10"
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            style={{
              backgroundColor:
                TOKEN_COLOR_MAP[item.type === "market" ? item.market.indexToken.symbol : item.token.symbol] ??
                TOKEN_COLOR_MAP.default,
            }}
          />
          <TokenIcon
            symbol={item.type === "market" ? item.market.indexToken.symbol : item.token.symbol}
            displaySize={24}
          />
          <div>{item.type === "market" ? <>{getMarketIndexName(item.market)}</> : item.token.symbol}</div>
        </div>
      </TableTd>
      {item.type === "market" ? (
        <TableTd>
          {formatAmountHuman(item.tvl[0], USD_DECIMALS, true, 1)}/
          {formatAmountHuman(item.tvl[1], USD_DECIMALS, true, 1)}
        </TableTd>
      ) : null}
      <TableTd>
        {item.type === "market"
          ? `${getCompositionPercentage(item.gmBalanceUsd, sum)}%`
          : `${getCompositionPercentage(item.amount, sum)}%`}
      </TableTd>
    </TableTr>
  );
};
