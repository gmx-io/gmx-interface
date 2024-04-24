import { Trans, t } from "@lingui/macro";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { convertTokenAddress } from "config/tokens";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxTradeFlags } from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxHasExistingOrder,
  selectTradeboxHasExistingPosition,
  selectTradeboxMarketInfo,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getAvailableUsdLiquidityForCollateral } from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";
import { TokenInfo } from "domain/tokens";
import { useChainId } from "lib/chains";
import pickBy from "lodash/pickBy";
import React, { useMemo } from "react";

export type Props = {
  selectedCollateralAddress?: string;
  selectedMarketAddress?: string;
  onSelectCollateralAddress: (address?: string) => void;
  isMarket: boolean;
};

export function CollateralSelectorRow(p: Props) {
  const { selectedCollateralAddress, selectedMarketAddress, onSelectCollateralAddress, isMarket } = p;
  const marketsInfo = useMarketsInfoData();
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const { isLong } = useTradeboxTradeFlags();

  const { allRelatedTokensArr, allRelatedTokensMap, getTokenState } = useMemo(() => {
    if (!marketInfo) {
      return { allRelatedTokensArr: [], allRelatedTokensMap: {} };
    }

    const allRelatedTokensMap: Record<string, TokenData> = {};
    const otherPoolsFlagMap: Record<string, boolean | undefined> = {};

    allRelatedTokensMap[marketInfo.longTokenAddress] = marketInfo.longToken;
    allRelatedTokensMap[marketInfo.shortTokenAddress] = marketInfo.shortToken;

    const relatedMarkets = pickBy(marketsInfo, (market) => market.indexTokenAddress === marketInfo.indexTokenAddress);

    Object.values(relatedMarkets).forEach((market) => {
      if (!allRelatedTokensMap[market.longTokenAddress]) {
        allRelatedTokensMap[market.longTokenAddress] = market.longToken;
        otherPoolsFlagMap[market.longTokenAddress] = true;
      }
      if (!allRelatedTokensMap[market.shortTokenAddress]) {
        allRelatedTokensMap[market.shortTokenAddress] = market.shortToken;
        otherPoolsFlagMap[market.shortTokenAddress] = true;
      }
    });

    const allRelatedTokensArr = Object.values(allRelatedTokensMap).sort((a, b) => {
      if (otherPoolsFlagMap[a.address] && !otherPoolsFlagMap[b.address]) {
        return 1;
      }

      if (!otherPoolsFlagMap[a.address] && otherPoolsFlagMap[b.address]) {
        return -1;
      }

      if (a.isStable && !b.isStable) {
        return -1;
      }

      if (!a.isStable && b.isStable) {
        return 1;
      }

      const aLiquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isLong);
      const bLiquidity = getAvailableUsdLiquidityForCollateral(marketInfo, isLong);

      return aLiquidity.gte(bLiquidity) ? -1 : 1;
    });

    const getTokenState = (info: TokenInfo) => {
      if (otherPoolsFlagMap[info.address]) {
        return { disabled: true, message: t`Select a pool containing ${info.symbol} to use it as collateral.` };
      }
    };

    return { allRelatedTokensMap, allRelatedTokensArr, getTokenState };
  }, [isLong, marketInfo, marketsInfo]);

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

  const { chainId } = useChainId();

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
      const symbol = collateralWithOrder.symbol;
      const address = collateralWithOrderShouldUnwrapNativeToken
        ? convertTokenAddress(chainId, collateralWithOrder.address, "wrapped")
        : collateralWithOrder.address;
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
    collateralWithOrder?.symbol,
    collateralWithOrder?.address,
    collateralWithOrderShouldUnwrapNativeToken,
    chainId,
  ]);

  return (
    <>
      <ExchangeInfoRow
        label={t`Collateral In`}
        className="SwapBox-info-row"
        value={
          selectedCollateralAddress &&
          allRelatedTokensArr.length !== 0 && (
            <TokenSelector
              label={t`Collateral In`}
              className="GlpSwap-from-token SwapBox-info-dropdown"
              chainId={chainId}
              tokenAddress={selectedCollateralAddress}
              onSelectToken={(token) => {
                onSelectCollateralAddress(token.address);
              }}
              tokens={allRelatedTokensArr}
              infoTokens={allRelatedTokensMap}
              showTokenImgInDropdown={true}
              getTokenState={getTokenState}
            />
          )
        }
      />
      {messages}
    </>
  );
}
