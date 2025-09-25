import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { getMarketIndexName } from "domain/synthetics/markets/utils";
import { formatAmountHuman } from "lib/numbers";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";

import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ChevronUpIcon from "img/ic_chevron_up.svg?react";

import { CompositionItem, CompositionType, getCompositionPercentage } from "../hooks/useCompositionData";

interface Props<T extends CompositionType> {
  composition: CompositionItem[];
  compositionType: T;
}

const CLOSED_COUNT = 5;

export function CompositionTable<T extends CompositionType>({ composition, compositionType }: Props<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const columns = useMemo(() => {
    if (compositionType === "market") {
      return [t`MARKET`, t`TVL/CAP`, t`COMPOSITION`];
    }

    return [t`COLLATERAL`, t`COMPOSITION`];
  }, [compositionType]);

  const sum = useMemo(() => {
    return composition.reduce(
      (acc, item) => (item.type === "market" ? acc + item.gmBalanceUsd : acc + item.amount),
      0n
    );
  }, [composition]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const isMobile = usePoolsIsMobilePage();

  const filteredComposition = useMemo(() => {
    if (isMobile && !isOpen) {
      return composition.slice(0, CLOSED_COUNT);
    }

    return composition;
  }, [composition, isMobile, isOpen]);

  return (
    <div className="w-full">
      <table className="w-full">
        <thead>
          <TableTheadTr>
            {columns.map((column) => (
              <TableTh key={column} className="sticky -top-1 bg-slate-900 first:!pl-20 last:!pr-20">
                <Trans>{column}</Trans>
              </TableTh>
            ))}
          </TableTheadTr>
        </thead>
        <tbody>
          {filteredComposition.map((item) => (
            <CompositionTableRow
              key={item.type === "market" ? item.market.marketTokenAddress : `${item.token.address}-${item.side}`}
              item={item}
              sum={sum}
            />
          ))}
        </tbody>
      </table>
      {isMobile && composition.length > CLOSED_COUNT ? (
        <div
          className="flex flex-row items-center justify-center gap-6 px-16 py-10 text-typography-secondary"
          onClick={toggleOpen}
        >
          <span>{isOpen ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}</span>
          {isOpen ? <ChevronUpIcon className="mt-2 size-12" /> : <ChevronDownIcon className="mt-2 size-12" />}
        </div>
      ) : null}
    </div>
  );
}

const CompositionTableRow = ({ item, sum }: { item: CompositionItem; sum: bigint }) => {
  const tokenColor =
    TOKEN_COLOR_MAP[item.type === "market" ? item.market.indexToken.symbol : item.token.symbol] ??
    TOKEN_COLOR_MAP.default;

  const tokenCircleStyles = useMemo(() => {
    return {
      backgroundColor: tokenColor,
    };
  }, [tokenColor]);

  return (
    <TableTr className="pointer-events-none !border-0">
      <TableTd className="!pl-20">
        <div className="flex flex-row items-center gap-4">
          <span className="mr-8 inline-block h-10 w-10 shrink-0 rounded-10" style={tokenCircleStyles} />
          <TokenIcon
            symbol={item.type === "market" ? item.market.indexToken.symbol : item.token.symbol}
            displaySize={24}
          />
          {item.type === "backing" ? <span className="capitalize text-typography-secondary">{item.side}:</span> : null}
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {item.type === "market" ? <>{getMarketIndexName(item.market)}</> : item.token.symbol}
          </span>
        </div>
      </TableTd>
      {item.type === "market" ? (
        <TableTd>
          <span className="numbers">{formatAmountHuman(item.tvl[0], USD_DECIMALS, true, 1)}</span>/
          <span className="numbers">{formatAmountHuman(item.tvl[1], USD_DECIMALS, true, 1)}</span>
        </TableTd>
      ) : null}
      <TableTd className="!pr-20">
        <span className="numbers">
          {item.type === "market"
            ? `${getCompositionPercentage(item.gmBalanceUsd, sum)}%`
            : `${getCompositionPercentage(item.amount, sum)}%`}
        </span>
      </TableTd>
    </TableTr>
  );
};
