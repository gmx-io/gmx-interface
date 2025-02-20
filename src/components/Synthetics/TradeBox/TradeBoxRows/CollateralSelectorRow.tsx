import { Trans } from "@lingui/macro";
import React, { useMemo } from "react";

import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxHasExistingLimitOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxMarketAddress,
  selectTradeboxMarketInfo,
  selectTradeboxSelectedCollateralTokenSymbol,
  selectTradeboxSetCollateralAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { CollateralSelector } from "../../CollateralSelector/CollateralSelector";
import { useCollateralInTooltipContent } from "../hooks/useCollateralInTooltipContent";
import { selectTradeboxAvailableAndDisabledTokensForCollateral } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxAvailableAndDisabledTokensForCollateral";

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
  const collateralInTooltipContent = useCollateralInTooltipContent();
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const tradeType = useSelector(selectTradeboxTradeType);

  return (
    <>
      <SyntheticsInfoRow
        label={
          <TooltipWithPortal position="left-start" content={collateralInTooltipContent}>
            <Trans>Collateral In</Trans>
          </TooltipWithPortal>
        }
        value={
          <CollateralSelector
            onSelect={onSelectCollateralAddress}
            options={availableTokens}
            disabledOptions={disabledTokens}
            selectedTokenSymbol={selectedTokenName}
            marketInfo={marketInfo}
            tradeType={tradeType}
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

  const hasExistingOrder = useSelector(selectTradeboxHasExistingLimitOrder);
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
          <AlertInfoCard key="showHasExistingPositionWithDifferentCollateral_1">
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
          </AlertInfoCard>
        );
      } else {
        messages.push(
          <AlertInfoCard key="showHasExistingPositionWithDifferentCollateral_2">
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
          </AlertInfoCard>
        );
      }
    }

    if (showHasExistingOrderWithDifferentCollateral) {
      const address = collateralWithOrder.address;
      const symbol = collateralWithOrder.symbol;

      messages.push(
        <AlertInfoCard key="showHasExistingOrderWithDifferentCollateral">
          <Trans>
            You have an existing limit order with {symbol} as collateral.{" "}
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
        </AlertInfoCard>
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
