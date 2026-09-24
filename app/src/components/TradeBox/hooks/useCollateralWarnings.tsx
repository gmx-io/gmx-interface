import { AlertInfo } from '@/components/Common/AlertInfo/AlertInfo';
import { selectSetTradeboxCollateralTokenAddress } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxAvailableMarketsOptions } from '@/selectors/tradebox/selectTradeboxAvailableMarketsOptions';
import { selectTradeboxCollateralTokenAddress } from '@/selectors/tradebox/selectTradeboxCollateralTokenAddress';
import { selectTradeboxHasExistingOrdersForSelectedPosition } from '@/selectors/tradebox/selectTradeboxHasExistingOrdersForSelectedPosition';
import { selectTradeboxHasExistingPosition } from '@/selectors/tradebox/selectTradeboxHasExistingPosition';
import { selectTradeboxMarketTokenAddress } from '@/selectors/tradebox/selectTradeboxMarketTokenAddress';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans } from '@lingui/macro';
import { useMemo } from 'react';

export function useCollateralWarnings() {
  const selectedMarketAddress = useAppStore(selectTradeboxMarketTokenAddress);
  const selectedCollateralAddress = useAppStore(
    selectTradeboxCollateralTokenAddress
  );
  const { isMarket } = useAppStore(selectTradeboxTradeFlags);
  const onSelectCollateralAddress = useAppStore(
    selectSetTradeboxCollateralTokenAddress
  );

  const marketsOptions = useAppStore(selectTradeboxAvailableMarketsOptions);

  const hasExistingOrder = useAppStore(
    selectTradeboxHasExistingOrdersForSelectedPosition
  );
  const hasExistingPosition = useAppStore(selectTradeboxHasExistingPosition);
  const {
    collateralWithOrder,
    marketWithOrder,
    marketWithPosition,
    collateralWithPosition,
  } = marketsOptions || {};

  const showHasExistingPositionWithDifferentCollateral =
    !hasExistingPosition &&
    collateralWithPosition &&
    selectedMarketAddress === marketWithPosition?.marketTokenAddress &&
    collateralWithPosition?.address.toBase58() !== selectedCollateralAddress;

  const showHasExistingOrderWithDifferentCollateral =
    !hasExistingPosition &&
    !hasExistingOrder &&
    !collateralWithPosition &&
    marketWithOrder &&
    selectedMarketAddress === marketWithOrder?.marketTokenAddress.toBase58() &&
    collateralWithOrder &&
    collateralWithOrder.address.toBase58() !== selectedCollateralAddress;

  const messages = useMemo<React.ReactNode[]>(() => {
    const messages: React.ReactNode[] = [];
    if (showHasExistingPositionWithDifferentCollateral) {
      if (isMarket) {
        messages.push(
          <AlertInfo
            key="showHasExistingPositionWithDifferentCollateral_1"
            type="info"
            compact
          >
            <Trans>
              You have an existing position with {collateralWithPosition.symbol}{' '}
              as collateral. This action will not apply for that position.{' '}
              <span
                className="clickable muted underline"
                onClick={() => {
                  onSelectCollateralAddress(
                    collateralWithPosition.address.toBase58()
                  );
                }}
              >
                Switch to {collateralWithPosition.symbol} collateral
              </span>
              .
            </Trans>
          </AlertInfo>
        );
      } else {
        messages.push(
          <AlertInfo
            key="showHasExistingPositionWithDifferentCollateral_2"
            type="info"
            compact
          >
            <Trans>
              You have an existing position with {collateralWithPosition.symbol}{' '}
              as collateral. This Order will not be valid for that Position.{' '}
              <span
                className="clickable muted underline"
                onClick={() => {
                  onSelectCollateralAddress(
                    collateralWithPosition.address.toBase58()
                  );
                }}
              >
                Switch to {collateralWithPosition.symbol} collateral
              </span>
              .
            </Trans>
          </AlertInfo>
        );
      }
    }

    if (showHasExistingOrderWithDifferentCollateral) {
      const address = collateralWithOrder.address;
      const symbol = collateralWithOrder.symbol;

      messages.push(
        <AlertInfo
          key="showHasExistingOrderWithDifferentCollateral"
          type="info"
          compact
        >
          <Trans>
            You have an existing limit order with {symbol} as collateral.{' '}
            <span
              className="clickable muted underline"
              onClick={() => {
                onSelectCollateralAddress(address.toBase58());
              }}
            >
              Switch to {symbol} collateral
            </span>
            .
          </Trans>
        </AlertInfo>
      );
    }

    return messages;
  }, [
    showHasExistingPositionWithDifferentCollateral,
    showHasExistingOrderWithDifferentCollateral,
    isMarket,
    collateralWithPosition?.symbol,
    collateralWithPosition?.address,
    onSelectCollateralAddress,
    collateralWithOrder?.address,
    collateralWithOrder?.symbol,
  ]);

  return messages;
}
