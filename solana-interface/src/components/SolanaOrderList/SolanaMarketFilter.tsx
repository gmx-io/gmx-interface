import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";
import type { Group } from "components/TableOptionsFilter/types";

import { getSolanaTokenConfig } from "../../config/solanaProgram";
import type { SolanaMarketFilterItem } from "../../hooks/orders/orderFilters";
import { getSolanaPoolName, shortenAddress } from "../../hooks/positions/solanaPositionAdapter";
import type { SolanaPositionViewModel } from "../../hooks/positions/types";
import type { SolanaMarketInfo } from "../../markets/solanaMarketSocketStore";
import { useSolanaMarkets } from "../../markets/useSolanaMarkets";
import { SolanaTokenIcon } from "../SolanaTokenIcon";

export type SolanaMarketFilterProps = {
  value: SolanaMarketFilterItem[];
  onChange: (value: SolanaMarketFilterItem[]) => void;
  /** Positions that currently have linked orders: the "Open positions with orders" group. */
  positionsWithOrders: readonly SolanaPositionViewModel[];
  asButton?: boolean;
};

function getMarketDisplayName(market: SolanaMarketInfo): string {
  const indexToken = getSolanaTokenConfig(market.indexToken);
  const symbol = indexToken?.displaySymbol ?? indexToken?.symbol;
  return indexToken?.displayMarketName ?? (symbol ? `${symbol}/USD` : shortenAddress(market.marketToken));
}

/**
 * GMX `MarketFilterLongShort` on Solana market data: the EVM component is bound to the synthetics state
 * selectors, so only the generic `TableOptionsFilter` is shared. Options come from the full market list and
 * the full order list, so they never shrink with the current filter result.
 */
export function SolanaMarketFilter({ value, onChange, positionsWithOrders, asButton }: SolanaMarketFilterProps) {
  const { marketInfoByToken } = useSolanaMarkets();

  const markets = useMemo(
    () =>
      [...marketInfoByToken.values()]
        .map((market) => ({ market, name: getMarketDisplayName(market) }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.market.marketToken.localeCompare(b.market.marketToken)),
    [marketInfoByToken]
  );

  const options = useMemo<Group<SolanaMarketFilterItem>[]>(() => {
    const positionItems = positionsWithOrders.map((position) => ({
      text: `${position.isLong ? "long" : "short"} ${position.displayMarketName} ${position.collateralSymbol}`,
      data: {
        marketAddress: position.marketTokenAddress,
        direction: position.isLong ? ("long" as const) : ("short" as const),
        collateralAddress: position.collateralTokenAddress,
      },
    }));
    const directionItems = [
      { text: t`Longs`, data: { marketAddress: "any" as const, direction: "long" as const } },
      { text: t`Shorts`, data: { marketAddress: "any" as const, direction: "short" as const } },
      { text: t`Swaps`, data: { marketAddress: "any" as const, direction: "swap" as const } },
    ];
    const marketItems = markets.map(({ market, name }) => ({
      text: `any ${name}`,
      data: { marketAddress: market.marketToken, direction: "any" as const },
    }));
    return [
      { groupName: t`Open positions with orders`, items: positionItems },
      { groupName: t`Direction`, items: directionItems },
      { groupName: t`Markets`, items: marketItems },
    ];
  }, [markets, positionsWithOrders]);

  const ItemComponent = useCallback(
    ({ item }: { item: SolanaMarketFilterItem }) => {
      if (item.marketAddress === "any") {
        if (item.direction === "long") return <>{t`Longs`}</>;
        if (item.direction === "short") return <>{t`Shorts`}</>;
        return <>{t`Swaps`}</>;
      }
      const market = marketInfoByToken.get(item.marketAddress);
      const name = market ? getMarketDisplayName(market) : shortenAddress(item.marketAddress);
      const indexSymbol = getSolanaTokenConfig(market?.indexToken)?.displaySymbol ?? getSolanaTokenConfig(market?.indexToken)?.symbol;
      const poolName = getSolanaPoolName(market);
      const collateralSymbol = item.collateralAddress
        ? getSolanaTokenConfig(item.collateralAddress)?.displaySymbol ?? getSolanaTokenConfig(item.collateralAddress)?.symbol
        : undefined;
      const isDirected = item.direction === "long" || item.direction === "short";
      return (
        <>
          <SolanaTokenIcon symbol={indexSymbol} displaySize={isDirected ? 20 : 16} className="mr-5" />
          <div className="inline-flex items-center gap-4">
            <span className={isDirected ? "font-medium text-typography-primary" : undefined}>{name}</span>
            {isDirected && (
              <span className={item.direction === "long" ? "text-green-500" : "text-red-500"}>
                {item.direction === "long" ? t`Long` : t`Short`}
              </span>
            )}
            {poolName && <span className="subtext">[{poolName}]</span>}
          </div>
          {collateralSymbol && <span className="text-typography-secondary"> ({collateralSymbol})</span>}
        </>
      );
    },
    [marketInfoByToken]
  );

  return (
    <TableOptionsFilter<SolanaMarketFilterItem>
      multiple
      label={t`Market`}
      placeholder={t`Search market`}
      onChange={onChange}
      options={options}
      ItemComponent={ItemComponent}
      value={value}
      asButton={asButton}
      popupPlacement="bottom-start"
    />
  );
}
