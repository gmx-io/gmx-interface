import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { KEEP_LEVERAGE_FOR_DECREASE_KEY, SLIPPAGE_BPS_KEY } from "config/localStorage";
import { convertTokenAddress } from "config/tokens";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getExecutionFee,
  getMarketFeesConfig,
  useGasPrice,
} from "domain/synthetics/fees";
import { DecreasePositionSwapType, OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import { AggregatedPositionData, formatLeverage, formatPnl, getMarkPrice } from "domain/synthetics/positions";
import { adaptToInfoTokens, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import {
  BASIS_POINTS_DIVISOR,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  DEFAULT_SLIPPAGE_AMOUNT,
  MAX_ALLOWED_LEVERAGE,
  USD_DECIMALS,
} from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  expandDecimals,
  formatAmount,
  formatPercentage,
  formatTokenAmountWithUsd,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import "components/Exchange/PositionSeller.css";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarket,
  useMarketsData,
  useMarketsPoolsData,
  useOpenInterestData,
} from "domain/synthetics/markets";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import {
  getDecreasePositionAmounts,
  getDisplayedTradeFees,
  getNextPositionValuesForDecreaseTrade,
  getSwapAmounts,
  useAvailableSwapOptions,
  useSwapRoute,
} from "domain/synthetics/trade";
import { Token } from "domain/tokens";
import { OrderStatus } from "../OrderStatus/OrderStatus";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionSeller.scss";

function isEquivalentTokens(token1: Token, token2: Token) {
  if (token1.address === token2.address) {
    return true;
  }

  if (token1.wrappedAddress === token2.address || token2.wrappedAddress === token1.address) {
    return true;
  }
}

type Props = {
  position?: AggregatedPositionData;
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
  const shouldSwapPnlToCollateralToken =
    !p.position?.market && p.position?.pnlToken?.address !== p.position?.collateralToken?.address;

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const { availableSwapTokens } = useAvailableSwapOptions({});

  const [closeUsdInputValue, setCloseUsdInputValue] = useState("");
  const maxCloseSize = position?.sizeInUsd || BigNumber.from(0);
  const closeSizeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS)!;

  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>();
  const receiveToken = getTokenData(tokensData, receiveTokenAddress);

  const shouldSwap =
    receiveToken && position?.collateralToken ? !isEquivalentTokens(receiveToken, position?.collateralToken) : false;

  const { findSwapPath } = useSwapRoute({
    fromTokenAddress: position?.collateralTokenAddress,
    toTokenAddress: receiveTokenAddress,
  });

  const feesConfig = getMarketFeesConfig(marketsFeesConfigs, position?.marketAddress);

  const markPrice = getMarkPrice(position?.indexToken?.prices, false, position?.isLong);

  const decreaseAmounts = getDecreasePositionAmounts({
    marketsData,
    poolsData,
    tokensData,
    openInterestData,
    feesConfigs: marketsFeesConfigs,
    market: position?.market,
    collateralToken: position?.collateralToken,
    receiveToken: position?.collateralToken,
    existingPosition: position,
    sizeDeltaUsd: closeSizeUsd,
    keepLeverage,
    showPnlInLeverage: p.savedIsPnlInLeverage,
    allowedSlippage,
    isLong: position?.isLong,
  });

  const swapAmounts = shouldSwap
    ? getSwapAmounts({
        marketsData,
        poolsData,
        tokensData,
        feesConfigs: marketsFeesConfigs,
        tokenIn: position?.collateralToken,
        tokenOut: receiveToken,
        tokenInAmount: decreaseAmounts?.receiveTokenAmount,
        findSwapPath,
      })
    : undefined;

  const nextPositionValues = decreaseAmounts
    ? getNextPositionValuesForDecreaseTrade({
        feesConfig,
        existingPosition: position,
        sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
        pnlDelta: decreaseAmounts?.pnlDelta,
        collateralDeltaUsd: decreaseAmounts?.collateralDeltaUsd,
        exitMarkPrice: decreaseAmounts?.exitMarkPrice,
        showPnlInLeverage: true,
        isLong: position?.isLong,
        maxLeverage,
      })
    : undefined;

  const fees = getDisplayedTradeFees({
    feesConfig,
    swapSteps: swapAmounts?.swapPathStats?.swapSteps,
    swapPriceImpactDeltaUsd: swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd,
    initialCollateralUsd: decreaseAmounts?.receiveUsd,
    positionFeeUsd: decreaseAmounts?.positionFeeUsd,
  });

  const receiveTokenMarket = swapAmounts?.swapPathStats?.targetMarketAddress
    ? getMarket(marketsData, swapAmounts?.swapPathStats?.targetMarketAddress)
    : position?.market;

  const receiveUsd = swapAmounts?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount = swapAmounts?.amountOut || decreaseAmounts?.receiveTokenAmount;

  const receiveTokenLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    receiveTokenMarket?.marketTokenAddress,
    receiveToken?.address ? convertTokenAddress(chainId, receiveToken.address, "wrapped") : undefined
  );

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? receiveTokenLiquidity?.lt(receiveUsd || 0) : false;

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      swapPath: swapAmounts?.swapPathStats?.swapPath || [],
    });

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, swapAmounts?.swapPathStats?.swapPath, tokensData]);

  useEffect(() => {
    if (!receiveTokenAddress && position?.collateralToken?.address) {
      const convertedAddress = convertTokenAddress(chainId, position?.collateralToken.address, "native");
      setReceiveTokenAddress(convertedAddress);
    }
  }, [chainId, position?.collateralToken, receiveTokenAddress]);

  function getError() {
    // TODO:
    // if (isSwapAllowed && isContractAccount && isAddressZero(receiveToken?.address)) {
    //   return t`${nativeTokenSymbol} can not be sent to smart contract addresses. Select another token.`;
    // }

    if (!closeSizeUsd?.gt(0)) {
      return [t`Enter a size`];
    }

    if (closeSizeUsd.gt(position?.sizeInUsd || 0)) {
      return [t`Max close amount exceeded`];
    }

    if (nextPositionValues?.nextLeverage && nextPositionValues.nextLeverage.gt(maxLeverage || MAX_ALLOWED_LEVERAGE)) {
      const maxValue = Number(maxLeverage) || MAX_ALLOWED_LEVERAGE;
      return [t`Max leverage: ${(maxValue / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    if (!decreaseAmounts?.isClosing && position?.sizeInUsd && closeSizeUsd) {
      const minCollateral = minCollateralUsd || expandDecimals(5, USD_DECIMALS);

      if (nextPositionValues?.nextCollateralUsd && nextPositionValues.nextCollateralUsd.lt(minCollateral)) {
        return [t`Leftover collateral below ${formatAmount(minCollateral, USD_DECIMALS, 2)} USD`];
      }
    }

    if (isNotEnoughReceiveTokenLiquidity) {
      return [t`Insufficient receive token liquidity`];
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
      !position?.indexToken ||
      !account ||
      !position ||
      !executionFee?.feeTokenAmount ||
      !position?.currentValueUsd ||
      !receiveToken?.address ||
      !decreaseAmounts
    ) {
      return;
    }

    createDecreaseOrderTxn(chainId, library, {
      account,
      marketAddress: position?.marketAddress,
      indexTokenAddress: position?.indexToken.address,
      swapPath: swapAmounts?.swapPathStats?.swapPath || [],
      initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount || BigNumber.from(0),
      initialCollateralAddress: position?.collateralTokenAddress,
      receiveTokenAddress: position?.collateralTokenAddress,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      orderType: OrderType.MarketDecrease,
      isLong: position?.isLong,
      executionFee: executionFee.feeTokenAmount,
      acceptablePrice: decreaseAmounts.acceptablePrice,
      decreasePositionSwapType: shouldSwapPnlToCollateralToken
        ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
        : DecreasePositionSwapType.NoSwap,
      tokensData,
    }).then(() => {
      if (p.position) {
        setPendingPositionUpdate({
          isIncrease: false,
          positionKey: p.position.key,
          collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        });
      }

      setIsProcessing(true);
    });
  }

  const submitButtonState = getSubmitButtonState();

  const isVisible = Boolean(position);

  useEffect(
    function initReceiveToken() {
      if (!receiveTokenAddress && position?.collateralToken?.address) {
        const convertedAddress = convertTokenAddress(chainId, position?.collateralToken.address, "native");
        setReceiveTokenAddress(convertedAddress);
      }
    },
    [chainId, position?.collateralToken?.address, receiveTokenAddress]
  );

  return (
    <>
      {!isProcessing && (
        <div className="PositionEditor PositionSeller">
          <Modal
            className="PositionSeller-modal"
            isVisible={isVisible}
            setIsVisible={p.onClose}
            label={
              <Trans>
                Close {position?.isLong ? t`Long` : t`Short`} {position?.indexToken?.symbol}
              </Trans>
            }
            allowContentTouchMove
          >
            {position && (
              <>
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
                  {executionFee?.warning && <div className="Confirmation-box-warning">{executionFee.warning}</div>}
                  <div className="PositionEditor-keep-leverage-settings">
                    <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
                      <span className="muted font-sm">
                        <Trans>
                          Keep leverage at {position?.leverage ? formatLeverage(position?.leverage) : "..."}
                        </Trans>
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
                              Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if
                              prices are volatile.
                            </Trans>
                          );
                        }}
                      />
                    </ExchangeInfoRow>
                  </div>
                  <ExchangeInfoRow label={t`Mark Price`} value={formatUsd(markPrice)} />
                  <ExchangeInfoRow label={t`Entry Price`} value={formatUsd(position?.entryPrice)} />
                  <ExchangeInfoRow label={t`Acceptable Price`} value={formatUsd(decreaseAmounts?.acceptablePrice)} />
                  <ExchangeInfoRow
                    label={t`Price impact`}
                    value={formatPercentage(decreaseAmounts?.acceptablePriceImpactBps) || "-"}
                  />
                  <ExchangeInfoRow
                    className="SwapBox-info-row"
                    label={t`Liq. Price`}
                    value={
                      decreaseAmounts?.isClosing ? (
                        "-"
                      ) : (
                        <ValueTransition
                          from={formatUsd(position.liqPrice)!}
                          to={formatUsd(nextPositionValues?.nextLiqPrice)}
                        />
                      )
                    }
                  />

                  <div className="App-card-divider" />
                  <ExchangeInfoRow
                    label={t`Size`}
                    value={
                      <ValueTransition
                        from={formatUsd(position?.sizeInUsd)!}
                        to={formatUsd(nextPositionValues?.nextSizeUsd)}
                      />
                    }
                  />
                  <ExchangeInfoRow
                    label={t`Collateral (${position?.collateralToken?.symbol})`}
                    value={
                      <ValueTransition
                        from={formatUsd(position?.collateralUsd)!}
                        to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                      />
                    }
                  />
                  {!keepLeverage && (
                    <ExchangeInfoRow
                      label={t`Leverage`}
                      value={
                        decreaseAmounts?.isClosing ? (
                          "-"
                        ) : (
                          <ValueTransition
                            from={formatLeverage(position.leverage)}
                            to={formatLeverage(nextPositionValues?.nextLeverage)}
                          />
                        )
                      }
                    />
                  )}

                  <ExchangeInfoRow
                    label={t`PnL`}
                    value={position?.pnl ? formatPnl(position?.pnl, position?.pnlPercentage) : "..."}
                  />

                  <div className="App-card-divider" />

                  <TradeFeesRow
                    totalFees={fees?.totalFees}
                    positionFee={fees?.positionFee}
                    positionPriceImpact={fees?.positionPriceImpact}
                    positionFeeFactor={feesConfig?.positionFeeFactor}
                    swapFees={fees?.swapFees}
                    swapPriceImpact={fees?.swapPriceImpact}
                  />

                  <ExchangeInfoRow
                    label={t`Execution Fee`}
                    value={formatTokenAmountWithUsd(
                      executionFee?.feeTokenAmount,
                      executionFee?.feeUsd,
                      executionFee?.feeToken.symbol,
                      executionFee?.feeToken.decimals
                    )}
                  />

                  <div className="App-card-divider" />

                  <ExchangeInfoRow
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
                          tokenAddress={receiveToken.address}
                          onSelectToken={(token) => setReceiveTokenAddress(token.address)}
                          tokens={availableSwapTokens}
                          showTokenImgInDropdown={true}
                          selectedTokenLabel={
                            <span className="PositionSelector-selected-receive-token">
                              {formatTokenAmountWithUsd(
                                receiveTokenAmount,
                                receiveUsd,
                                receiveToken?.symbol,
                                receiveToken?.decimals,
                                {
                                  fallbackToZero: true,
                                }
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
              </>
            )}
          </Modal>
        </div>
      )}

      <OrderStatus
        isVisible={isProcessing}
        orderType={OrderType.MarketDecrease}
        marketAddress={position?.marketAddress}
        initialCollateralAddress={position?.collateralTokenAddress}
        initialCollateralAmount={decreaseAmounts?.collateralDeltaAmount}
        sizeDeltaUsd={decreaseAmounts?.sizeDeltaUsd}
        isLong={position?.isLong}
        onClose={() => {
          setIsProcessing(false);
          p.onClose();
        }}
      />
    </>
  );
}
