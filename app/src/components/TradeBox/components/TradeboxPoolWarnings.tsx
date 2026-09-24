import { Trans } from '@lingui/macro';
import { ReactNode, useCallback } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { BN_ZERO } from '@/config/constants';
import { selectTradeboxHasExistingPosition } from '@/selectors/tradebox/selectTradeboxHasExistingPosition';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxMarketInfo } from '@/selectors/tradebox/selectTradeboxMarketInfo';
import { selectTradeboxFromTokenInputValue } from '@/selectors/tradebox/baseSelectors';
import { selectSetTradeboxCollateralTokenAddress } from '@/selectors/tradebox/baseSelectors';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectTradeboxAvailableMarketsOptions } from '@/selectors/tradebox/selectTradeboxAvailableMarketsOptions';
import { selectSetTradeboxMarketTokenAddress } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxHasExistingOrdersForSelectedPosition } from '@/selectors/tradebox/selectTradeboxHasExistingOrdersForSelectedPosition';
import { Market, MarketInfo } from '@/selectors/market/types';
import { getByKey } from '@/utils/lib/object';
import { getMarketAvailableLiquidityUsdForPosition } from '@/utils/market/getMarketAvailableLiquidityUsdForPosition';
import { getFeeItem } from '@/utils/fee/getFeeItem';
import { formatPercentage } from '@/utils/legacy/format';
import { AlertInfo } from '@/components/Common/AlertInfo/AlertInfo';
import { selectTradeboxToTokenInputValue } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxIncreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxIncreasePositionAmounts';
import { getMarketPoolName } from '@/utils/market/getMarketPoolName';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';

const SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS = 1; // +0.01%
const SPACE = ' ';

const useTradeboxPoolWarnings = (
  withActions = true,
  textColor: 'text-yellow-500' | 'text-gray-300' = 'text-gray-300'
) => {
  const marketsInfo = useAppStore(selectMarketsInfo);
  const marketsOptions = useAppStore(selectTradeboxAvailableMarketsOptions);
  const increaseAmounts = useAppStore(selectTradeboxIncreasePositionAmounts);
  const marketInfo = useAppStore(selectTradeboxMarketInfo);
  const setCollateralAddress = useAppStore(
    selectSetTradeboxCollateralTokenAddress
  );
  const setMarketAddress = useAppStore(selectSetTradeboxMarketTokenAddress);
  const { isLong, isIncrease } = useAppStore(selectTradeboxTradeFlags);
  const hasExistingPosition = useAppStore(selectTradeboxHasExistingPosition);
  const hasExistingOrder = useAppStore(
    selectTradeboxHasExistingOrdersForSelectedPosition
  );
  const fromTokenInputValue = useAppStore(selectTradeboxFromTokenInputValue);
  const toTokenInputValue = useAppStore(selectTradeboxToTokenInputValue);

  const isSelectedMarket = useCallback(
    (market: Market) => {
      return (
        marketInfo &&
        isSameTokenAddress(
          market.marketTokenAddress,
          marketInfo.marketTokenAddress
        )
      );
    },
    [marketInfo]
  );

  const WithActon = useCallback(
    ({ children }: { children: ReactNode }) =>
      withActions ? (
        <>
          {SPACE}
          {children}
        </>
      ) : null,
    [withActions]
  );

  if (!marketInfo) {
    return null;
  }

  if (!fromTokenInputValue && !toTokenInputValue) {
    return null;
  }

  const indexToken = marketInfo.indexToken;
  const marketWithPosition = marketsOptions?.marketWithPosition;
  const collateralWithPosition = marketsOptions?.collateralWithPosition;

  const isNoSufficientLiquidityInAnyMarket =
    marketsOptions?.isNoSufficientLiquidityInAnyMarket;
  const isNoSufficientLiquidityInMarketWithPosition =
    marketsOptions?.isNoSufficientLiquidityInMarketWithPosition;
  const minOpenFeesMarket =
    (marketsOptions?.minOpenFeesAvailableMarketAddress &&
      getByKey(
        marketsInfo,
        marketsOptions?.minOpenFeesAvailableMarketAddress
      )) as MarketInfo | undefined;
  const longLiquidity = getMarketAvailableLiquidityUsdForPosition(
    marketInfo,
    true
  );
  const shortLiquidity = getMarketAvailableLiquidityUsdForPosition(
    marketInfo,
    false
  );
  const isOutPositionLiquidity = isLong
    ? longLiquidity.lt(increaseAmounts?.sizeDeltaUsd || BN_ZERO)
    : shortLiquidity.lt(increaseAmounts?.sizeDeltaUsd || BN_ZERO);
  const marketWithOrder = marketsOptions?.marketWithOrder;

  const positionFeeBeforeDiscountBps =
    increaseAmounts &&
    getFeeItem(
      increaseAmounts.positionFeeUsd.neg(),
      increaseAmounts.sizeDeltaUsd
    )?.bps;

  const improvedOpenFeesDeltaBps =
    increaseAmounts?.acceptablePriceDeltaBps !== undefined
      ? (marketsOptions.minOpenFeesBps ?? 0) -
        (positionFeeBeforeDiscountBps ?? 0) -
        increaseAmounts.acceptablePriceDeltaBps
      : undefined;

  const showHasExistingPositionButNotEnoughLiquidityWarning =
    !hasExistingPosition &&
    marketWithPosition &&
    !isSelectedMarket(marketWithPosition) &&
    isNoSufficientLiquidityInMarketWithPosition;
  const showHasExistingPositionWarning =
    !showHasExistingPositionButNotEnoughLiquidityWarning &&
    !hasExistingPosition &&
    marketWithPosition &&
    !isSelectedMarket(marketWithPosition);
  const showHasNoSufficientLiquidityInAnyMarketWarning =
    isNoSufficientLiquidityInAnyMarket;
  const showHasInsufficientLiquidityAndPositionWarning =
    isOutPositionLiquidity &&
    minOpenFeesMarket &&
    !isSelectedMarket(minOpenFeesMarket) &&
    hasExistingPosition;
  const showHasInsufficientLiquidityAndNoPositionWarning =
    isOutPositionLiquidity &&
    minOpenFeesMarket &&
    !isSelectedMarket(minOpenFeesMarket) &&
    !hasExistingPosition;

  const showHasExistingOrderWarning =
    !hasExistingPosition &&
    !marketWithPosition &&
    !hasExistingOrder &&
    marketWithOrder &&
    !isSelectedMarket(marketWithOrder);

  const canShowHasBetterExecutionFeesWarning =
    !showHasExistingPositionWarning &&
    !hasExistingPosition &&
    !hasExistingOrder &&
    !collateralWithPosition &&
    !marketWithOrder &&
    isIncrease &&
    minOpenFeesMarket &&
    !isSelectedMarket(minOpenFeesMarket) &&
    (improvedOpenFeesDeltaBps !== undefined
      ? improvedOpenFeesDeltaBps >= SHOW_HAS_BETTER_FEES_WARNING_THRESHOLD_BPS
      : undefined);

  const showHasBetterOpenFeesWarning = canShowHasBetterExecutionFeesWarning;

  if (
    !showHasExistingPositionWarning &&
    !showHasNoSufficientLiquidityInAnyMarketWarning &&
    !showHasInsufficientLiquidityAndPositionWarning &&
    !showHasInsufficientLiquidityAndNoPositionWarning &&
    !showHasExistingOrderWarning &&
    !showHasBetterOpenFeesWarning &&
    !showHasExistingPositionButNotEnoughLiquidityWarning
  ) {
    return null;
  }

  const warning: ReactNode[] = [];

  if (showHasExistingPositionWarning) {
    warning.push(
      <AlertInfo
        key="showHasExistingPositionWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          You have an existing position in the{' '}
          {getMarketPoolName(marketWithPosition)} market pool.
          <WithActon>
            <span
              className="clickable muted underline"
              onClick={() => {
                setMarketAddress(
                  marketWithPosition.marketTokenAddress.toBase58()
                );
                setCollateralAddress(
                  marketsOptions.collateralWithPosition?.address.toBase58()
                );
              }}
            >
              Switch to {getMarketPoolName(marketWithPosition)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasExistingPositionButNotEnoughLiquidityWarning) {
    warning.push(
      <AlertInfo
        key="showHasExistingPositionButNotEnoughLiquidityWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          You have an existing position in the{' '}
          {getMarketPoolName(marketWithPosition)} market pool, but it lacks
          liquidity for this order.
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasNoSufficientLiquidityInAnyMarketWarning) {
    warning.push(
      <AlertInfo
        key="showHasNoSufficientLiquidityInAnyMarketWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          Insufficient liquidity in any {indexToken?.symbol}/USD market pools
          for your order.
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityAndNoPositionWarning) {
    warning.push(
      <AlertInfo
        key="showHasInsufficientLiquidityAndNoPositionWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          Insufficient liquidity in the{' '}
          {marketInfo ? getMarketPoolName(marketInfo) : '...'} market pool.
          Select a different pool for this market.
          <WithActon>
            <span
              className="clickable muted underline"
              onClick={() =>
                setMarketAddress(
                  minOpenFeesMarket.marketTokenAddress.toBase58()
                )
              }
            >
              Switch to {getMarketPoolName(minOpenFeesMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasInsufficientLiquidityAndPositionWarning) {
    warning.push(
      <AlertInfo
        key="showHasInsufficientLiquidityAndPositionWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          Insufficient liquidity in the{' '}
          {marketInfo ? getMarketPoolName(marketInfo) : '...'} market pool.
          Select a different pool for this market. Choosing a different pool
          would open a new position different from the existing one.
          <WithActon>
            <span
              className="clickable muted underline"
              onClick={() =>
                setMarketAddress(
                  minOpenFeesMarket.marketTokenAddress.toBase58()
                )
              }
            >
              Switch to {getMarketPoolName(minOpenFeesMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasExistingOrderWarning) {
    const address = marketsOptions.collateralWithOrder!.address;

    warning.push(
      <AlertInfo
        key="showHasExistingOrderWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          You have an existing limit order in the{' '}
          {getMarketPoolName(marketWithOrder)} market pool.
          <WithActon>
            <span
              className="clickable muted cursor-pointer underline"
              onClick={() => {
                setMarketAddress(marketWithOrder.marketTokenAddress.toBase58());
                setCollateralAddress(address.toBase58());
              }}
            >
              Switch to {getMarketPoolName(marketWithOrder)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  if (showHasBetterOpenFeesWarning) {
    warning.push(
      <AlertInfo
        key="showHasBetterOpenFeesWarning"
        type="info"
        compact
        textColor={textColor}
      >
        <Trans>
          You can get{' '}
          {formatPercentage(improvedOpenFeesDeltaBps, 2, {
            fallbackToZero: true,
          })}{' '}
          better open cost in the {getMarketPoolName(minOpenFeesMarket)} market
          pool.
          <WithActon>
            <span
              className="clickable muted cursor-pointer underline"
              onClick={() =>
                setMarketAddress(
                  minOpenFeesMarket.marketTokenAddress.toBase58()
                )
              }
            >
              Switch to {getMarketPoolName(minOpenFeesMarket)} market pool
            </span>
            .
          </WithActon>
        </Trans>
      </AlertInfo>
    );
  }

  return warning;
};

export function TradeboxPoolWarnings() {
  const warnings = useTradeboxPoolWarnings();
  return <>{warnings}</>;
}
