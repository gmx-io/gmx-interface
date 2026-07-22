import { t } from "@lingui/macro";
import { ReactNode, useCallback, useMemo } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getMarketIndexName, getGlvOrMarketAddress, getMarketPoolName } from "domain/synthetics/markets/utils";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";
import type { Item } from "components/TableOptionsFilter/types";
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
  asButton?: boolean;
  availableMarketAddresses?: string[];
};

export function MarketFilterBase({
  value,
  onChange,
  excludeSpotOnly,
  beforeContent,
  forceIsActive,
  asButton,
  availableMarketAddresses,
}: MarketFilterBaseProps) {
  const marketsInfoData = useMarketsInfoData();
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, srcChainId, {
    isDeposit: true,
    withGlv: false,
    enabled: availableMarketAddresses === undefined,
  });
  const { marketsInfo: markets } = useSortedPoolsWithIndexToken(marketsInfoData, depositMarketTokensData);

  const availableMarkets = useMemo(() => {
    if (availableMarketAddresses === undefined) {
      return markets;
    }

    return availableMarketAddresses.flatMap((address) => {
      const market = marketsInfoData?.[address];
      return market ? [market] : [];
    });
  }, [availableMarketAddresses, markets, marketsInfoData]);

  const marketsOptions = useMemo<Item<string>[]>(() => {
    return availableMarkets
      .filter((market) => {
        if (excludeSpotOnly !== undefined) {
          return !market.isSpotOnly;
        }

        return true;
      })
      .map((market) => {
        return {
          text: market.name,
          data: getGlvOrMarketAddress(market),
        };
      });
  }, [availableMarkets, excludeSpotOnly]);

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
          <TokenIcon symbol={iconName} displaySize={16} className="mr-5" />
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
      asButton={asButton}
    />
  );
}
