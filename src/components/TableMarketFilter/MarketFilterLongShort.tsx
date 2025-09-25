import { t } from "@lingui/macro";
import values from "lodash/values";
import { useCallback, useMemo } from "react";
import type { Address } from "viem";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectChainId,
  selectOrdersInfoData,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectPositionsInfoDataSortedByMarket } from "context/SyntheticsStateContext/selectors/positionsSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getMarketIndexName, getGlvOrMarketAddress, getMarketPoolName } from "domain/synthetics/markets/utils";
import { isOrderForPosition } from "domain/synthetics/orders";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { mustNeverExist } from "lib/types";
import { getNormalizedTokenSymbol, getToken } from "sdk/configs/tokens";

import { MarketWithDirectionLabel } from "components/MarketWithDirectionLabel/MarketWithDirectionLabel";
import { TableOptionsFilter } from "components/TableOptionsFilter/TableOptionsFilter";
import type { Group, Item } from "components/TableOptionsFilter/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

export type MarketFilterLongShortDirection = "long" | "short" | "swap" | "any";
export type MarketFilterLongShortItemData = {
  marketAddress: Address | "any";
  direction: MarketFilterLongShortDirection;
  collateralAddress?: Address;
};

export type MarketFilterLongShortProps = {
  value: MarketFilterLongShortItemData[];
  onChange: (value: MarketFilterLongShortItemData[]) => void;
  withPositions?: "all" | "withOrders";
  asButton?: boolean;
};

const selectPositionsWithOrders = createSelector((q) => {
  const positions = q(selectPositionsInfoDataSortedByMarket);
  const ordersInfoData = q(selectOrdersInfoData);

  const orders = values(ordersInfoData);

  return positions.filter((position) => {
    return orders.some((order) => isOrderForPosition(order, position.key));
  });
});

export function MarketFilterLongShort({ value, onChange, withPositions, asButton }: MarketFilterLongShortProps) {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const marketsInfoData = useMarketsInfoData();
  const allPositions = useSelector(selectPositionsInfoDataSortedByMarket);
  const filteredPositions = useSelector(selectPositionsWithOrders);
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, srcChainId, {
    isDeposit: true,
    withGlv: false,
  });
  const { marketsInfo: allMarkets } = useSortedPoolsWithIndexToken(marketsInfoData, depositMarketTokensData);

  const marketsOptions = useMemo<Group<MarketFilterLongShortItemData>[]>(() => {
    let strippedOpenPositions: Item<MarketFilterLongShortItemData>[] | undefined = undefined;
    if (withPositions !== undefined) {
      const positions = withPositions === "all" ? allPositions : filteredPositions;
      strippedOpenPositions = positions.map((position) => ({
        text: (position.isLong ? "long" : "short") + " " + position.market.name + " " + position.collateralToken.symbol,
        data: {
          marketAddress: position.market.marketTokenAddress as Address,
          direction: position.isLong ? "long" : "short",
          collateralAddress: position.collateralTokenAddress as Address,
        },
      }));
    }

    const strippedMarkets: Item<MarketFilterLongShortItemData>[] = allMarkets.map((market) => {
      return {
        text: "any " + market.name,
        data: {
          marketAddress: getGlvOrMarketAddress(market) as Address,
          direction: "any",
        },
      };
    });

    const anyMarketDirectedGroup: Group<MarketFilterLongShortItemData> = {
      groupName: t`Direction`,
      items: [
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
      ],
    };

    if (withPositions) {
      return [
        {
          groupName: withPositions === "all" ? t`Open positions` : t`Open positions with orders`,
          items: strippedOpenPositions!,
        },
        anyMarketDirectedGroup,
        {
          groupName: t`Markets`,
          items: strippedMarkets,
        },
      ];
    }

    return [
      anyMarketDirectedGroup,
      {
        groupName: t`Markets`,
        items: strippedMarkets,
      },
    ];
  }, [allMarkets, allPositions, filteredPositions, withPositions]);

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

      const collateralToken = props.item.collateralAddress && getToken(chainId, props.item.collateralAddress);
      const collateralSymbol = collateralToken?.symbol;

      if (props.item.direction === "long" || props.item.direction === "short") {
        return (
          <>
            <MarketWithDirectionLabel
              isLong={props.item.direction === "long"}
              indexName={indexName}
              tokenSymbol={iconName}
              iconImportSize={40}
            />
            <div className="inline-flex items-center">
              <span className="subtext">[{poolName}]</span>
            </div>
            {collateralSymbol && <span className="text-typography-secondary"> ({collateralSymbol})</span>}
          </>
        );
      }

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
    [chainId, marketsInfoData]
  );

  return (
    <TableOptionsFilter<MarketFilterLongShortItemData>
      multiple
      label={t`Market`}
      placeholder={t`Search Market`}
      onChange={onChange}
      options={marketsOptions}
      ItemComponent={ItemComponent}
      value={value}
      asButton={asButton}
      popupPlacement="bottom-start"
    />
  );
}
