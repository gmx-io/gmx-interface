import { t } from "@lingui/macro";
import { values } from "lodash";
import { useCallback, useMemo } from "react";
import type { Address } from "viem";

import { getNormalizedTokenSymbol } from "config/tokens";
import { useMarketsInfoData, usePositionsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { mustNeverExist } from "lib/types";

import { TableOptionsFilter } from "components/Synthetics/TableOptionsFilter/TableOptionsFilter";
import type { Group, Item } from "components/Synthetics/TableOptionsFilter/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

export type MarketFilterLongShortDirection = "long" | "short" | "swap" | "any";
export type MarketFilterLongShortItemData = {
  marketAddress: Address | "any";
  direction: MarketFilterLongShortDirection;
};

export type MarketFilterLongShortProps = {
  value: MarketFilterLongShortItemData[];
  onChange: (value: MarketFilterLongShortItemData[]) => void;
};

export function MarketFilterLongShort({ value, onChange }: MarketFilterLongShortProps) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
  const positions = usePositionsInfoData();
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketsInfo: allMarkets } = useSortedPoolsWithIndexToken(marketsInfoData, depositMarketTokensData);

  const marketsOptions = useMemo<Group<MarketFilterLongShortItemData>[]>(() => {
    const strippedOpenPositions: Item<MarketFilterLongShortItemData>[] = values(positions).map((position) => ({
      text: (position.isLong ? "long " : "short ") + position.marketInfo.name,
      data: {
        marketAddress: position.marketInfo.marketTokenAddress as Address,
        direction: position.isLong ? "long" : "short",
      },
    }));

    const strippedMarkets: Item<MarketFilterLongShortItemData>[] = allMarkets.map((market) => {
      return {
        text: "any " + market.name,
        data: {
          marketAddress: market.marketTokenAddress as Address,
          direction: "any",
        },
      };
    });

    const anyMarketDirected: Item<MarketFilterLongShortItemData>[] = [
      {
        text: t`Longs`,
        data: {
          marketAddress: "any",
          direction: "long",
        },
      },
      {
        text: t`Shorts`,
        data: {
          marketAddress: "any",
          direction: "short",
        },
      },
      {
        text: t`Swaps`,
        data: {
          marketAddress: "any",
          direction: "swap",
        },
      },
    ];

    return [
      {
        groupName: t`Open Positions`,
        items: strippedOpenPositions,
      },
      {
        groupName: t`Markets`,
        items: anyMarketDirected.concat(strippedMarkets),
      },
    ];
  }, [allMarkets, positions]);

  const ItemComponent = useCallback(
    (props: { item: MarketFilterLongShortItemData }) => {
      if (!marketsInfoData) {
        return <></>;
      }

      if (props.item.marketAddress === "any") {
        if (props.item.direction === "long") {
          return t`Longs`;
        } else if (props.item.direction === "short") {
          return t`Shorts`;
        } else if (props.item.direction === "swap") {
          return t`Swaps`;
        }
        mustNeverExist(props.item.direction as never);
      }

      let longOrShortText = "";
      if (props.item.direction === "long") {
        longOrShortText = t`Long`;
      } else if (props.item.direction === "short") {
        longOrShortText = t`Short`;
      }

      const market = marketsInfoData[props.item.marketAddress];
      const indexName = getMarketIndexName(market);
      const poolName = getMarketPoolName(market);

      const iconName = market?.isSpotOnly
        ? getNormalizedTokenSymbol(market.longToken.symbol) + getNormalizedTokenSymbol(market.shortToken.symbol)
        : market.indexToken.symbol;

      return (
        <>
          <TokenIcon symbol={iconName} displaySize={16} importSize={40} className="mr-5" />
          <div className="inline-flex items-center">
            {longOrShortText && <span className="mr-3">{longOrShortText}</span>}
            <span>{indexName}</span>
            <span className="subtext">[{poolName}]</span>
          </div>
        </>
      );
    },
    [marketsInfoData]
  );

  return (
    <TableOptionsFilter<MarketFilterLongShortItemData>
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
