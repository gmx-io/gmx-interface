import { Trans } from "@lingui/macro";
import React, { useMemo, useRef } from "react";

import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxHasExistingLimitOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxMarketAddress,
  selectTradeboxSelectedCollateralTokenSymbol,
  selectTradeboxSetCollateralAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxAvailableAndDisabledTokensForCollateral } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxAvailableAndDisabledTokensForCollateral";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { BlockField } from "components/BlockField/BlockField";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { CollateralSelector } from "../../CollateralSelector/CollateralSelector";
import { useCollateralInTooltipContent } from "../hooks/useCollateralInTooltipContent";

export type Props = {
  selectedMarketAddress?: string;
  onSelectCollateralAddress: (address?: string) => void;
  isMarket: boolean;
};

export function CollateralSelectorField(p: Props) {
  const { onSelectCollateralAddress } = p;
  const selectedTokenName = useSelector(selectTradeboxSelectedCollateralTokenSymbol);
  const popoverReferenceRef = useRef<HTMLDivElement | null>(null);

  const { availableTokens, disabledTokens } = useSelector(selectTradeboxAvailableAndDisabledTokensForCollateral);

  const collateralInTooltipContent = useCollateralInTooltipContent();

  return (
    <BlockField
      containerRef={popoverReferenceRef}
      forwardClickToSelector
      label={
        <TooltipWithPortal
          position="bottom-end"
          content={collateralInTooltipContent}
          variant="none"
          className="overflow-hidden"
          handleClassName="!flex overflow-hidden"
          contentClassName="overflow-hidden"
        >
          <span className="overflow-hidden text-ellipsis">
            <Trans>Collateral</Trans>
          </span>
        </TooltipWithPortal>
      }
      labelClassName="overflow-hidden shrink-1 grow-0 flex"
      contentClassName="shrink-0 min-w-[unset]"
      className="group/selector-field overflow-hidden"
      content={
        <CollateralSelector
          onSelect={onSelectCollateralAddress}
          options={availableTokens}
          disabledOptions={disabledTokens}
          selectedTokenSymbol={selectedTokenName}
          popoverReferenceRef={popoverReferenceRef}
        />
      }
    />
  );
}

export function useCollateralWarnings() {
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
              <ColorfulButtonLink
                color="blue"
                onClick={() => {
                  onSelectCollateralAddress(collateralWithPosition.address);
                }}
              >
                Switch to {collateralWithPosition.symbol} collateral
              </ColorfulButtonLink>
            </Trans>
          </AlertInfoCard>
        );
      } else {
        messages.push(
          <AlertInfoCard key="showHasExistingPositionWithDifferentCollateral_2">
            <Trans>
              You have an existing position with {collateralWithPosition.symbol} as collateral. This Order will not be
              valid for that Position.{" "}
              <ColorfulButtonLink
                color="blue"
                onClick={() => {
                  onSelectCollateralAddress(collateralWithPosition.address);
                }}
              >
                Switch to {collateralWithPosition.symbol} collateral
              </ColorfulButtonLink>
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
            <ColorfulButtonLink
              color="blue"
              onClick={() => {
                onSelectCollateralAddress(address);
              }}
            >
              Switch to {symbol} collateral
            </ColorfulButtonLink>
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
