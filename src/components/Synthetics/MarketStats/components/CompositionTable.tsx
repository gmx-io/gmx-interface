import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

import { USD_DECIMALS } from "config/factors";
import { formatAmountHuman } from "lib/numbers";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { TOKEN_COLOR_MAP } from "sdk/configs/tokens";

import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

import { getMarketIndexName } from "../../../../domain/synthetics/markets/utils";
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
          <TableTheadTr bordered>
            {columns.map((column) => (
              <TableTh key={column} className="sticky top-0 bg-slate-800">
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
        <div className="flex flex-row items-center justify-between px-16 pb-20" onClick={toggleOpen}>
          <span className="text-slate-100">{isOpen ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}</span>
          {isOpen ? <FaChevronUp size={8} /> : <FaChevronDown size={8} />}
        </div>
      ) : null}
    </div>
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
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {item.type === "market" ? <>{getMarketIndexName(item.market)}</> : item.token.symbol}
          </span>
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
