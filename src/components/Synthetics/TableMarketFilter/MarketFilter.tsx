import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";

import { getNormalizedTokenSymbol } from "config/tokens";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { useChainId } from "lib/chains";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";
import type { Item } from "components/Synthetics/TableOptionsFilter/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

type Props = {
  /**
   * Market addresses
   */
  value: string[];
  onChange: (value: string[]) => void;
  excludeSpotOnly?: boolean;
};

export function MarketFilter({ value, onChange, excludeSpotOnly }: Props) {
  const marketsInfoData = useMarketsInfoData();
  const { chainId } = useChainId();
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketsInfo: markets } = useSortedPoolsWithIndexToken(marketsInfoData, depositMarketTokensData);

  const marketsOptions = useMemo<Item<string>[]>(() => {
    return markets
      .filter((market) => {
        if (excludeSpotOnly !== undefined) {
          return !market.isSpotOnly;
        }

        return true;
      })
      .map((market) => {
        return {
          text: market.name,
          data: market.marketTokenAddress,
        };
      });
  }, [excludeSpotOnly, markets]);

  const ItemComponent = useCallback(
    (props: { item: string }) => {
      if (!marketsInfoData) {
        return <></>;
      }

      const market = marketsInfoData[props.item];
      const indexName = getMarketIndexName(market);
      const poolName = getMarketPoolName(market);

      const iconName = market?.isSpotOnly
        ? getNormalizedTokenSymbol(market.longToken.symbol) + getNormalizedTokenSymbol(market.shortToken.symbol)
        : market.indexToken.symbol;

      return (
        <>
          <TokenIcon symbol={iconName} displaySize={16} importSize={40} className="mr-xs" />
          <div className="items-center">
            <span>{indexName}</span>
            <span className="subtext">[{poolName}]</span>
          </div>
        </>
      );
    },
    [marketsInfoData]
  );

  return (
    <TableOptionsFilter<string>
      multiple
      label={t`Market`}
      placeholder={t`Search market`}
      onChange={onChange}
      options={marketsOptions}
      ItemComponent={ItemComponent}
      value={value}
    />
  );
}
