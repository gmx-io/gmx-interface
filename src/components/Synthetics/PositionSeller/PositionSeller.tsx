import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { InfoRow } from "components/InfoRow/InfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { KEEP_LEVERAGE_FOR_DECREASE_KEY, SLIPPAGE_BPS_KEY } from "config/localStorage";
import { convertTokenAddress } from "config/tokens";
import cx from "classnames";
import {
  FeeItem,
  TradeFees,
  estimateExecuteDecreaseOrderGasLimit,
  getMarketFeesConfig,
  getMinExecutionFee,
  getPriceImpactForPosition,
  getTotalFeeItem,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  getAcceptbalePrice,
  getCollateralDeltaUsdForDecreaseOrder,
  getCollateralOutForDecreaseOrder,
  getNextCollateralUsdForDecreaseOrder,
} from "domain/synthetics/orders";
import {
  AggregatedPositionData,
  formatLeverage,
  formatPnl,
  getLeverage,
  getLiquidationPrice,
  getMarkPrice,
} from "domain/synthetics/positions";
import {
  adaptToInfoTokens,
  convertToTokenAmount,
  convertToUsd,
  getTokenData,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import {
  BASIS_POINTS_DIVISOR,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  DEFAULT_SLIPPAGE_AMOUNT,
  DUST_USD,
  MAX_ALLOWED_LEVERAGE,
  USD_DECIMALS,
} from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  applyFactor,
  expandDecimals,
  formatAmount,
  formatDeltaUsd,
  formatTokenAmountWithUsd,
  formatUsd,
  getBasisPoints,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

import { useSyntheticsEvents } from "context/SyntheticsEvents";
import "./PositionSeller.scss";
import "components/Exchange/PositionSeller.css";
import { OrderStatus } from "../OrderStatus/OrderStatus";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarket,
  useMarketsData,
  useMarketsPoolsData,
  useOpenInterestData,
} from "domain/synthetics/markets";
import { Token } from "domain/tokens";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { useAvailableSwapOptions } from "domain/synthetics/trade";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";

function isEquivalentTokens(token1: Token, token2: Token) {
  if (token1.address === token2.address) {
    return true;
  }

  if (token1.wrappedAddress === token2.address || token2.wrappedAddress === token1.address) {
    return true;
  }
}

type Props = {
  position: AggregatedPositionData;
  savedIsPnlInLeverage: boolean;
  onClose: () => void;
};

export function PositionSeller(p: Props) {
  const { position } = p;
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const [isProcessing, setIsProcessing] = useState(false);
  const { setPendingPositionUpdate } = useSyntheticsEvents();
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimitsConfig(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
  const { maxLeverage, minCollateralUsd } = usePositionsConstants(chainId);
  const infoTokens = adaptToInfoTokens(tokensData);

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const { availableSwapTokens } = useAvailableSwapOptions({});
  const feesConfig = getMarketFeesConfig(marketsFeesConfigs, position.marketAddress);

  const [closeUsdInputValue, setCloseUsdInputValue] = useState("");
  const maxCloseSize = position.sizeInUsd;
  const closeSizeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS)!;

  const isClosing = closeSizeUsd.gt(0) && maxCloseSize?.sub(closeSizeUsd).lt(DUST_USD);

  const sizeDeltaUsd = isClosing ? maxCloseSize : closeSizeUsd;
  const nextSizeUsd = position.sizeInUsd.sub(sizeDeltaUsd);

  const collateralDeltaUsd = getCollateralDeltaUsdForDecreaseOrder({
    isClosing,
    keepLeverage,
    positionCollateralUsd: position.collateralUsd,
    positionSizeInUsd: position.sizeInUsd,
    sizeDeltaUsd,
  });

  const collateralDeltaAmount = convertToTokenAmount(
    collateralDeltaUsd,
    position.collateralToken?.decimals,
    position.collateralToken?.prices?.maxPrice
  );

  const nextCollateralUsd = getNextCollateralUsdForDecreaseOrder({
    isClosing,
    collateralUsd: position.collateralUsd,
    collateralDeltaUsd,
    sizeDeltaUsd,
    pnl: position.pnl,
  });

  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>(p.position.collateralTokenAddress);
  const receiveToken = getTokenData(tokensData, receiveTokenAddress);

  const { findSwapPath } = useSwapRoute({
    initialColltaralAddress: position.collateralTokenAddress,
    targetCollateralAddress: receiveTokenAddress,
  });

  const { swapPath, swapPathStats, receiveTokenMarket } = useMemo(() => {
    if (!collateralDeltaUsd?.gt(0)) {
      return {};
    }

    const { swapPath, swapPathStats } = findSwapPath(collateralDeltaUsd) || {};

    return {
      swapPathStats,
      swapPath,
      receiveTokenMarket: swapPath ? getMarket(marketsData, swapPath[swapPath.length - 1]) : position.market,
    };
  }, [collateralDeltaUsd, findSwapPath, marketsData, position.market]);

  const fees = useMemo(() => {
    if (!collateralDeltaUsd?.gt(0) || !feesConfig) return undefined;

    const priceImpactDeltaUsd = getPriceImpactForPosition(
      openInterestData,
      marketsFeesConfigs,
      position.marketAddress,
      sizeDeltaUsd,
      position.isLong
    );

    const positionPriceImpact = priceImpactDeltaUsd
      ? {
          deltaUsd: priceImpactDeltaUsd,
          bps: getBasisPoints(priceImpactDeltaUsd, collateralDeltaUsd),
        }
      : undefined;

    const positionFeeUsd = applyFactor(sizeDeltaUsd, feesConfig.positionFeeFactor);

    const positionFee = positionFeeUsd
      ? { deltaUsd: positionFeeUsd.mul(-1), bps: getBasisPoints(positionFeeUsd, collateralDeltaUsd) }
      : undefined;

    return {
      totalFees: getTotalFeeItem(
        [swapPathStats?.totalFee, positionFee, positionPriceImpact].filter(Boolean) as FeeItem[]
      ),
      positionFee,
      positionPriceImpact,
      swapFees: swapPathStats,
    } as TradeFees;
  }, [
    collateralDeltaUsd,
    feesConfig,
    marketsFeesConfigs,
    openInterestData,
    position.isLong,
    position.marketAddress,
    sizeDeltaUsd,
    swapPathStats,
  ]);

  const acceptablePrice = getAcceptbalePrice({
    isIncrease: false,
    isLong: p.position.isLong,
    indexPrice: getMarkPrice(p.position.indexToken?.prices, false, p.position.isLong),
    sizeDeltaUsd,
    priceImpactDeltaUsd: fees?.positionPriceImpact?.deltaUsd,
    allowedSlippage,
  });

  const collateralOutAmount = getCollateralOutForDecreaseOrder({
    position,
    indexToken: position.indexToken,
    collateralToken: position.collateralToken,
    sizeDeltaUsd,
    collateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
    pnlToken: position.pnlToken,
    feesUsd: position.pendingBorrowingFees
      .add(position.pendingFundingFeesUsd || 0)
      .add(fees?.positionFee?.deltaUsd.abs() || 0),
    priceImpactUsd: fees?.positionPriceImpact?.deltaUsd || BigNumber.from(0),
  });

  const receiveUsd = convertToUsd(
    collateralOutAmount,
    position.collateralToken?.decimals,
    position.collateralToken?.prices?.maxPrice
  );

  const receiveTokenAmount = convertToTokenAmount(receiveUsd, receiveToken?.decimals, receiveToken?.prices?.maxPrice);

  const receiveTokenLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    receiveTokenMarket?.marketTokenAddress,
    receiveToken?.address ? convertTokenAddress(chainId, receiveToken.address, "wrapped") : undefined
  );

  const isSwapReceiveToken =
    receiveToken && position.collateralToken && !isEquivalentTokens(receiveToken, position.collateralToken);

  const isNotEnoughReceiveTokenLiquidity = isSwapReceiveToken ? receiveTokenLiquidity?.lt(receiveUsd || 0) : false;

  const shouldSwapPnlToCollateralToken =
    !p.position.market && p.position.pnlToken?.address !== p.position.collateralToken?.address;

  const nextLiqPrice =
    nextSizeUsd?.gt(0) && !keepLeverage
      ? getLiquidationPrice({
          sizeUsd: nextSizeUsd,
          collateralUsd: nextCollateralUsd,
          averagePrice: position.averagePrice,
          isLong: position.isLong,
        })
      : undefined;

  const nextPnl = position.pnl;

  const nextLeverage =
    nextSizeUsd?.gt(0) && !keepLeverage
      ? getLeverage({
          sizeUsd: nextSizeUsd,
          collateralUsd: nextCollateralUsd,
          pnl: p.savedIsPnlInLeverage ? nextPnl : undefined,
        })
      : undefined;

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      swapPath,
    });

    return getMinExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, swapPath, tokensData]);

  useEffect(() => {
    if (!receiveTokenAddress && position.collateralToken?.address) {
      const convertedAddress = convertTokenAddress(chainId, position.collateralToken.address, "native");
      setReceiveTokenAddress(convertedAddress);
    }
  }, [chainId, position.collateralToken, receiveTokenAddress]);

  //  TODO: common validation
  function getError() {
    // TODO:
    // if (isSwapAllowed && isContractAccount && isAddressZero(receiveToken?.address)) {
    //   return t`${nativeTokenSymbol} can not be sent to smart contract addresses. Select another token.`;
    // }

    if (!closeSizeUsd?.gt(0)) {
      return [t`Enter a size`];
    }

    if (closeSizeUsd.gt(position.sizeInUsd)) {
      return [t`Max close amount exceeded`];
    }

    if (nextLeverage && nextLeverage.gt(maxLeverage || MAX_ALLOWED_LEVERAGE)) {
      const maxValue = Number(maxLeverage) || MAX_ALLOWED_LEVERAGE;
      return [t`Max leverage: ${(maxValue / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    if (!isClosing && position.sizeInUsd && closeSizeUsd) {
      if (position.sizeInUsd.sub(closeSizeUsd).lt(expandDecimals(10, USD_DECIMALS))) {
        return [t`Leftover position below 10 USD`];
      }

      const minCollateral = minCollateralUsd || expandDecimals(5, USD_DECIMALS);

      if (nextCollateralUsd && nextCollateralUsd.lt(minCollateral)) {
        return [t`Leftover collateral below ${formatAmount(minCollateral, USD_DECIMALS, 2)} USD`];
      }
    }

    const collateralAddress = position.collateralToken?.address
      ? convertTokenAddress(chainId, position.collateralToken.address, "wrapped")
      : undefined;

    const receiveAddress = receiveToken ? convertTokenAddress(chainId, receiveToken.address, "wrapped") : undefined;

    const needSwap = collateralAddress && receiveAddress && collateralAddress !== receiveAddress;

    if (needSwap) {
      if (isNotEnoughReceiveTokenLiquidity) {
        return [t`Insufficient receive token liquidity`];
      }
    }

    return [false];
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const [error] = getError();

    if (typeof error === "string") {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: t`Close`,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (
      !position.indexToken ||
      !account ||
      !position ||
      !executionFee?.feeTokenAmount ||
      !position.currentValueUsd ||
      !receiveToken?.address ||
      !acceptablePrice
    )
      return;

    createDecreaseOrderTxn(chainId, library, {
      account,
      market: position.marketAddress,
      indexTokenAddress: position.indexToken.address,
      swapPath: swapPath || [],
      initialCollateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
      initialCollateralAddress: position.collateralTokenAddress,
      targetCollateralAddress: receiveToken.address,
      receiveTokenAddress: position.collateralTokenAddress,
      priceImpactDelta: BigNumber.from(0),
      sizeDeltaUsd,
      orderType: OrderType.MarketDecrease,
      isLong: position.isLong,
      executionFee: executionFee.feeTokenAmount,
      acceptablePrice,
      decreasePositionSwapType: shouldSwapPnlToCollateralToken
        ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
        : DecreasePositionSwapType.NoSwap,
      tokensData,
      setPendingPositionUpdate,
    }).then(() => setIsProcessing(true));
  }

  if (!position) {
    return null;
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <>
      {!isProcessing && (
        <div className="PositionEditor PositionSeller">
          <Modal
            className="PositionSeller-modal"
            isVisible={true}
            setIsVisible={p.onClose}
            label={
              <Trans>
                Close {position?.isLong ? t`Long` : t`Short`} {position.indexToken?.symbol}
              </Trans>
            }
            allowContentTouchMove
          >
            <BuyInputSection
              topLeftLabel={t`Close`}
              topRightLabel={t`Max`}
              topRightValue={formatUsd(maxCloseSize)}
              inputValue={closeUsdInputValue}
              onInputValueChange={(e) => setCloseUsdInputValue(e.target.value)}
              showMaxButton={maxCloseSize.gt(0) && !closeSizeUsd?.eq(maxCloseSize)}
              onClickMax={() => setCloseUsdInputValue(formatAmount(maxCloseSize, USD_DECIMALS, 2))}
            >
              USD
            </BuyInputSection>
            <div className="PositionEditor-info-box PositionSeller-info-box">
              {/* {minExecutionFeeErrorMessage && <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>} */}
              <div className="PositionEditor-keep-leverage-settings">
                <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
                  <span className="muted font-sm">
                    <Trans>Keep leverage at {position.leverage ? formatLeverage(position.leverage) : "..."}</Trans>
                  </span>
                </Checkbox>
              </div>
              <div className="App-card-divider" />
              <div className="PositionEditor-allow-higher-slippage">
                <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
                  <span className="muted font-sm">
                    <Trans>Allow up to 1% slippage</Trans>
                  </span>
                </Checkbox>
              </div>
              <div>
                <ExchangeInfoRow label={t`Allowed Slippage`}>
                  <Tooltip
                    handle={`${formatAmount(allowedSlippage, 2, 2)}%`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <Trans>
                          You can change this in the settings menu on the top right of the page.
                          <br />
                          <br />
                          Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if prices
                          are volatile.
                        </Trans>
                      );
                    }}
                  />
                </ExchangeInfoRow>
              </div>
              <InfoRow label={t`Mark Price`} value={formatUsd(position.markPrice)} />
              <InfoRow label={t`Entry Price`} value={formatUsd(position.entryPrice)} />
              <InfoRow label={t`Acceptable Price`} value={formatUsd(acceptablePrice)} />
              <InfoRow
                label={t`Price impact`}
                value={formatDeltaUsd(fees?.positionPriceImpact?.deltaUsd, fees?.positionPriceImpact?.bps) || "-"}
              />
              <InfoRow
                label={t`Liq Price`}
                value={
                  nextSizeUsd?.gt(0) && position.liqPrice ? (
                    <ValueTransition
                      from={formatUsd(position.liqPrice)!}
                      to={nextLiqPrice && !nextLiqPrice.eq(position.liqPrice) ? formatUsd(nextLiqPrice) : undefined}
                    />
                  ) : (
                    "-"
                  )
                }
              />
              <div className="App-card-divider" />
              <InfoRow
                label={t`Size`}
                value={
                  <ValueTransition
                    from={formatUsd(position.sizeInUsd)!}
                    to={nextSizeUsd && !nextSizeUsd.eq(position.sizeInUsd) ? formatUsd(nextSizeUsd) : undefined}
                  />
                }
              />
              <InfoRow
                label={t`Collateral (${position.collateralToken?.symbol})`}
                value={
                  <ValueTransition
                    from={formatUsd(position.collateralUsd)!}
                    to={
                      nextCollateralUsd && position.collateralUsd && !nextCollateralUsd.eq(position.collateralUsd)
                        ? formatUsd(nextCollateralUsd)
                        : undefined
                    }
                  />
                }
              />
              {!keepLeverage && (
                <InfoRow
                  label={t`Leverage`}
                  value={
                    nextSizeUsd?.gt(0) && position.leverage ? (
                      <ValueTransition
                        from={formatLeverage(position.leverage)}
                        to={
                          nextLeverage && !nextLeverage.eq(position.leverage) ? formatLeverage(nextLeverage) : undefined
                        }
                      />
                    ) : (
                      "-"
                    )
                  }
                />
              )}

              <InfoRow label={t`PnL`} value={position.pnl ? formatPnl(position.pnl, position.pnlPercentage) : "..."} />

              <TradeFeesRow
                swapPathStats={swapPathStats}
                totalFees={fees?.totalFees}
                positionFee={fees?.positionFee}
                positionPriceImpact={fees?.positionPriceImpact}
                positionFeeFactor={feesConfig?.positionFeeFactor}
              />

              <InfoRow
                label={t`Execution Fee`}
                value={formatTokenAmountWithUsd(
                  executionFee?.feeTokenAmount,
                  executionFee?.feeUsd,
                  executionFee?.feeToken.symbol,
                  executionFee?.feeToken.decimals
                )}
              />

              <div className="App-card-divider" />
              <InfoRow
                label={t`Receive`}
                className="Exchange-info-row PositionSeller-receive-row "
                value={
                  receiveToken && (
                    <TokenSelector
                      label={t`Receive`}
                      className={cx("PositionSeller-token-selector", {
                        warning: isNotEnoughReceiveTokenLiquidity,
                      })}
                      chainId={chainId}
                      showBalances={false}
                      disableBodyScrollLock={true}
                      infoTokens={infoTokens}
                      tokenAddress={receiveTokenAddress}
                      onSelectToken={(token) => setReceiveTokenAddress(token.address)}
                      tokens={availableSwapTokens}
                      showTokenImgInDropdown={true}
                      selectedTokenLabel={
                        <span className="PositionSelector-selected-receive-token">
                          {formatTokenAmountWithUsd(
                            receiveTokenAmount,
                            receiveUsd,
                            receiveToken?.symbol,
                            receiveToken?.decimals
                          )}
                        </span>
                      }
                    />
                  )
                }
              />
            </div>
            <div className="Exchange-swap-button-container">
              <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled} authRequired>
                {submitButtonState.text}
              </SubmitButton>
            </div>
          </Modal>
        </div>
      )}

      {isProcessing && (
        <OrderStatus
          orderType={OrderType.MarketDecrease}
          marketAddress={position.marketAddress}
          initialCollateralAddress={position.collateralTokenAddress}
          initialCollateralAmount={collateralDeltaAmount}
          sizeDeltaUsd={sizeDeltaUsd}
          isLong={position.isLong}
          onClose={p.onClose}
        />
      )}
    </>
  );
}
