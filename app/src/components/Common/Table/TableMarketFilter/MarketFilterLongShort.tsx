import { MarketWithDirectionLabel } from '@/components/Common/Table/TableMarketFilter/MarketWithDirectionLabel';
import { TableOptionsFilter } from '@/components/Common/Table/TableOptionsFilter/TableOptionsFilter';
import {
  Group,
  Item,
} from '@/components/Common/Table/TableOptionsFilter/types';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import { useSortedPoolsWithIndexToken } from '@/hooks/marketHooks/useSortedPoolsWithIndexToken';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectPositionsInfoSortedByMarket } from '@/selectors/position/selectPositionsInfoSortedByMarket';
import { selectPositionsInfoWithOrdersInfo } from '@/selectors/position/selectPositionsInfoWithOrdersInfo';
import { selectMarketTokensData } from '@/selectors/token/selectMarketTokensData';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { getGlvOrMarketAddress } from '@/utils/glv/getGlvOrMarketAddress';
import { mustNeverExist } from '@/utils/lib/assertions';
import { getMarketIndexName } from '@/utils/market/getMarketIndexName';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';
import { getTokenData } from '@/utils/token/getTokenData';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useCallback, useMemo } from 'react';

export type MarketFilterLongShortDirection = 'long' | 'short' | 'swap' | 'any';
export type MarketFilterLongShortItemData = {
  marketAddress: string;
  direction: MarketFilterLongShortDirection;
  collateralAddress?: string;
};

export type MarketFilterLongShortProps = {
  value: MarketFilterLongShortItemData[];
  onChange: (value: MarketFilterLongShortItemData[]) => void;
  withPositions?: 'all' | 'withOrders';
  asButton?: boolean;
};

export function MarketFilterLongShort({
  value,
  onChange,
  withPositions,
  asButton,
}: MarketFilterLongShortProps) {
  const tokensData = useAppStore(selectTokensData);
  const marketsInfoData = useAppStore(selectMarketsInfo);
  const allPositions = useAppStore(selectPositionsInfoSortedByMarket);
  const filteredPositions = useAppStore(selectPositionsInfoWithOrdersInfo);
  const marketTokensData = useAppStore(selectMarketTokensData);
  const { marketsInfo: allMarkets } = useSortedPoolsWithIndexToken(
    marketsInfoData,
    marketTokensData
  );

  const marketsOptions = useMemo<Group<MarketFilterLongShortItemData>[]>(() => {
    let strippedOpenPositions:
      | Item<MarketFilterLongShortItemData>[]
      | undefined = undefined;
    if (withPositions !== undefined) {
      const positions =
        withPositions === 'all' ? allPositions : filteredPositions;
      strippedOpenPositions = positions.map((position) => ({
        text:
          (position.isLong ? 'long' : 'short') +
          ' ' +
          position.marketInfo.name +
          ' ' +
          position.collateralToken.symbol,
        data: {
          marketAddress: position.marketInfo.marketTokenAddress.toBase58(),
          direction: position.isLong ? 'long' : 'short',
          collateralAddress: position.collateralTokenAddress.toBase58(),
        },
      }));
    }

    const strippedMarkets: Item<MarketFilterLongShortItemData>[] =
      allMarkets.map((market) => {
        return {
          text: 'any ' + market.name,
          data: {
            marketAddress: getGlvOrMarketAddress(market) ?? '',
            direction: 'any',
          },
        };
      });

    const anyMarketDirectedGroup: Group<MarketFilterLongShortItemData> = {
      groupName: t`Direction`,
      items: [
        {
          text: t`Longs`,
          data: {
            marketAddress: 'any',
            direction: 'long',
          },
        },
        {
          text: t`Shorts`,
          data: {
            marketAddress: 'any',
            direction: 'short',
          },
        },
        {
          text: t`Swaps`,
          data: {
            marketAddress: 'any',
            direction: 'swap',
          },
        },
      ],
    };

    if (withPositions) {
      return [
        {
          groupName:
            withPositions === 'all'
              ? t`Open Positions`
              : t`Open Positions with Orders`,
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

      if (props.item.marketAddress === 'any') {
        if (props.item.direction === 'long') {
          return t`Longs`;
        } else if (props.item.direction === 'short') {
          return t`Shorts`;
        } else if (props.item.direction === 'swap') {
          return t`Swaps`;
        }
        mustNeverExist(props.item.direction as never);
      }

      let longOrShortText = '';
      if (props.item.direction === 'long') {
        longOrShortText = t`Long`;
      } else if (props.item.direction === 'short') {
        longOrShortText = t`Short`;
      }

      const market = marketsInfoData[props.item.marketAddress];
      const indexName = getMarketIndexName(market);
      const poolName = getMarketPoolName(market);

      const iconName = market?.isSpotOnly
        ? getNormalizedTokenSymbol(market.longToken.symbol) +
          getNormalizedTokenSymbol(market.shortToken.symbol)
        : market.indexToken.symbol;

      const collateralToken = props.item.collateralAddress
        ? getTokenData(tokensData, props.item.collateralAddress)
        : undefined;
      const collateralSymbol = collateralToken?.symbol;

      if (props.item.direction === 'long' || props.item.direction === 'short') {
        return (
          <>
            <MarketWithDirectionLabel
              isLong={props.item.direction === 'long'}
              indexName={indexName}
              tokenSymbol={iconName}
              iconImportSize={40}
            />
            <div className="inline-flex items-center">
              <span className="subtext">[{poolName}]</span>
            </div>
            {collateralSymbol && (
              <span className="text-slate-100"> ({collateralSymbol})</span>
            )}
          </>
        );
      }

      return (
        <>
          <TokenIcon
            symbol={iconName}
            displaySize={16}
            importSize={40}
            className="mr-5 min-h-16 min-w-16"
          />
          <div className="inline-flex items-center">
            {longOrShortText && <span className="mr-3">{longOrShortText}</span>}
            <span>{indexName}</span>
            <span className="subtext">[{poolName}]</span>
          </div>
        </>
      );
    },
    [marketsInfoData, tokensData]
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
