import { t } from "@lingui/macro";
import { ReactNode, useCallback, useMemo } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";

import { getNormalizedTokenSymbol } from "config/tokens";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";
import type { Item } from "components/Synthetics/TableOptionsFilter/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

export type MarketFilterBaseProps = {
  /**
   * Market addresses
   */
  value: string[];
  /**
   * Callback when the market selection changes
   */
  onChange: (value: string[]) => void;
  excludeSpotOnly?: boolean;
  beforeContent?: ReactNode | undefined;
  /**
   * If `true`, the filter will be active regardless of the selected value
   */
  forceIsActive?: boolean;
};

export function MarketFilterBase({
  value,
  onChange,
  excludeSpotOnly,
  beforeContent,
  forceIsActive,
}: MarketFilterBaseProps) {
  const marketsInfoData = useMarketsInfoData();
  const chainId = useSelector(selectChainId);
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
          <TokenIcon symbol={iconName} displaySize={16} importSize={40} className="mr-5" />
          <div className="inline-flex items-center">
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
      beforeContent={beforeContent}
      multiple
      label={t`Market`}
      placeholder={t`Search market`}
      onChange={onChange}
      options={marketsOptions}
      ItemComponent={ItemComponent}
      value={value}
      forceIsActive={forceIsActive}
    />
  );
}
