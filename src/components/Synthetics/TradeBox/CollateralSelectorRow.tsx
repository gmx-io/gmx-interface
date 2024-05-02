import { Trans, t } from "@lingui/macro";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { convertTokenAddress, getToken } from "config/tokens";
import {
  selectChainId,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxHasExistingOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxMarketAddress,
  selectTradeboxMarketInfo,
  selectTradeboxSetCollateralAddress,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";

import { filter, flatMap, pickBy, uniqBy, values } from "lodash";
import React, { useMemo } from "react";
import { NewCollateralSelector } from "./NewCollateralSelector/NewCollateralSelector";

export type Props = {
  selectedCollateralAddress?: string;
  selectedMarketAddress?: string;
  onSelectCollateralAddress: (address?: string) => void;
  isMarket: boolean;
};

const selectSelectedCollateralTokenSymbol = createSelector((q) => {
  const selectedCollateralAddress = q(selectTradeboxCollateralTokenAddress);
  const tokensData = q(selectTokensData);
  const symbol = tokensData?.[selectedCollateralAddress]?.symbol;

  return symbol;
});

const selectAvailableAndDisabledTokens = createSelector((q) => {
  const marketsInfo = q(selectMarketsInfoData);

  if (!marketsInfo) {
    return {
      availableTokens: [],
      disabledTokens: [],
    };
  }

  const currentMarket = q(selectTradeboxMarketInfo);

  if (!currentMarket) {
    return {
      availableTokens: [],
      disabledTokens: [],
    };
  }

  const availableTokens = currentMarket.isSameCollaterals
    ? [currentMarket.longToken]
    : [currentMarket.longToken, currentMarket.shortToken];

  const disabledTokens = filter(
    uniqBy(
      flatMap(
        values(pickBy(marketsInfo, (market) => market.indexTokenAddress === currentMarket.indexTokenAddress)),
        (market) => [market.longToken, market.shortToken]
      ),
      (token) => token.address
    ),
    (token) => token.address !== currentMarket.longToken.address && token.address !== currentMarket.shortToken.address
  ).sort((a, b) => {
    if (a.isStable && !b.isStable) {
      return -1;
    }

    if (!a.isStable && b.isStable) {
      return 1;
    }

    return 0;
  });

  return {
    availableTokens: availableTokens,
    disabledTokens: disabledTokens,
  };
});

export function CollateralSelectorRow(p: Props) {
  const { selectedCollateralAddress, onSelectCollateralAddress } = p;
  const selectedTokenName = useSelector(selectSelectedCollateralTokenSymbol);

  const { availableTokens, disabledTokens } = useSelector(selectAvailableAndDisabledTokens);

  const warnings = useCollateralWarnings();

  return (
    <>
      <ExchangeInfoRow
        label={t`Collateral In`}
        className="SwapBox-info-row"
        value={
          <NewCollateralSelector
            onSelect={onSelectCollateralAddress}
            options={availableTokens}
            disabledOptions={disabledTokens}
            selectedTokenAddress={selectedCollateralAddress}
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
  const chainId = useSelector(selectChainId);

  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);

  const hasExistingOrder = useSelector(selectTradeboxHasExistingOrder);
  const hasExistingPosition = useSelector(selectTradeboxHasExistingPosition);
  const {
    collateralWithOrder,
    marketWithOrder,
    marketWithPosition,
    collateralWithPosition,
    collateralWithOrderShouldUnwrapNativeToken,
  } = marketsOptions || {};

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
            textColor="text-warning"
          >
            <Trans>
              You have an existing position with {collateralWithPosition.symbol} as collateral. This action will not
              apply for that position.{" "}
              <span
                className="clickable underline muted"
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
            textColor="text-warning"
          >
            <Trans>
              You have an existing position with {collateralWithPosition.symbol} as collateral. This Order will not be
              valid for that Position.{" "}
              <span
                className="clickable underline muted"
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
        <AlertInfo key="showHasExistingOrderWithDifferentCollateral" type="warning" textColor="text-warning" compact>
          <Trans>
            You have an existing order with {symbol} as collateral.{" "}
            <span
              className="clickable underline muted"
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
    collateralWithOrderShouldUnwrapNativeToken,
    chainId,
  ]);

  return messages;
}
