import { Trans, t } from "@lingui/macro";
import React, { useMemo } from "react";

import {
  selectTradeboxAvailableAndDisabledTokensForCollateral,
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxHasExistingOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxMarketAddress,
  selectTradeboxSelectedCollateralTokenSymbol,
  selectTradeboxSetCollateralAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { CollateralSelector } from "../CollateralSelector/CollateralSelector";

export type Props = {
  selectedMarketAddress?: string;
  onSelectCollateralAddress: (address?: string) => void;
  isMarket: boolean;
};

export function CollateralSelectorRow(p: Props) {
  const { onSelectCollateralAddress } = p;
  const selectedTokenName = useSelector(selectTradeboxSelectedCollateralTokenSymbol);

  const { availableTokens, disabledTokens } = useSelector(selectTradeboxAvailableAndDisabledTokensForCollateral);

  const warnings = useCollateralWarnings();

  return (
    <>
      <ExchangeInfoRow
        label={t`Collateral In`}
        className="SwapBox-info-row"
        value={
          <CollateralSelector
            onSelect={onSelectCollateralAddress}
            options={availableTokens}
            disabledOptions={disabledTokens}
            selectedTokenSymbol={selectedTokenName}
          />
        }
      />
      {warnings}
    </>
  );
}

function useCollateralWarnings() {
  const selectedMarketAddress = useSelector(selectTradeboxMarketAddress);
  const selectedCollateralAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const { isMarket } = useSelector(selectTradeboxTradeFlags);
  const onSelectCollateralAddress = useSelector(selectTradeboxSetCollateralAddress);

  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);

  const hasExistingOrder = useSelector(selectTradeboxHasExistingOrder);
  const hasExistingPosition = useSelector(selectTradeboxHasExistingPosition);
  const { collateralWithOrder, marketWithOrder, marketWithPosition, collateralWithPosition } = marketsOptions || {};

  const showHasExistingPositionWithDifferentCollateral =
    !hasExistingPosition &&
    collateralWithPosition &&
    selectedMarketAddress === marketWithPosition?.marketTokenAddress &&
    collateralWithPosition?.address !== selectedCollateralAddress;

  const showHasExistingOrderWithDifferentCollateral =
    !hasExistingPosition &&
    !hasExistingOrder &&
    !collateralWithPosition &&
    marketWithOrder &&
    selectedMarketAddress === marketWithOrder?.marketTokenAddress &&
    collateralWithOrder &&
    collateralWithOrder.address !== selectedCollateralAddress;

  const messages = useMemo<React.ReactNode[]>(() => {
    const messages: React.ReactNode[] = [];
    if (showHasExistingPositionWithDifferentCollateral) {
      if (isMarket) {
        messages.push(
          <AlertInfo
            key="showHasExistingPositionWithDifferentCollateral_1"
            type="warning"
            compact
            textColor="text-yellow-500"
          >
            <Trans>
              You have an existing position with {collateralWithPosition.symbol} as collateral. This action will not
              apply for that position.{" "}
              <span
                className="clickable muted underline"
                onClick={() => {
                  onSelectCollateralAddress(collateralWithPosition.address);
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
            type="warning"
            compact
            textColor="text-yellow-500"
          >
            <Trans>
              You have an existing position with {collateralWithPosition.symbol} as collateral. This Order will not be
              valid for that Position.{" "}
              <span
                className="clickable muted underline"
                onClick={() => {
                  onSelectCollateralAddress(collateralWithPosition.address);
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
        <AlertInfo key="showHasExistingOrderWithDifferentCollateral" type="warning" textColor="text-yellow-500" compact>
          <Trans>
            You have an existing order with {symbol} as collateral.{" "}
            <span
              className="clickable muted underline"
              onClick={() => {
                onSelectCollateralAddress(address);
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
