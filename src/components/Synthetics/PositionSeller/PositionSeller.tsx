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
import { estimateExecuteDecreaseOrderGasLimit, getExecutionFee, useGasPrice } from "domain/synthetics/fees";
import { DecreasePositionSwapType, OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import { PositionInfo, formatLeverage } from "domain/synthetics/positions";
import { adaptToV1InfoTokens, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
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
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmountWithUsd,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import "components/Exchange/PositionSeller.css";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useGasLimits } from "domain/synthetics/fees/useGasLimits";
import { getAvailableUsdLiquidityForCollateral, getTokenPoolType, useMarketsInfo } from "domain/synthetics/markets";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import {
  getDecreasePositionAmounts,
  getDisplayedTradeFees,
  getNextPositionValuesForDecreaseTrade,
  getShouldSwapPnlToCollateralToken,
  getSwapAmounts,
  useAvailableSwapOptions,
  useSwapRoute,
} from "domain/synthetics/trade";
import { Token } from "domain/tokens";
import { getByKey } from "lib/objects";
import { OrderStatus } from "../OrderStatus/OrderStatus";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionSeller.scss";

function isEquivalentTokens(token1: Token, token2: Token) {
  const isWrap = token1.isNative && token2.isWrapped;
  const isUnwrap = token1.isWrapped && token2.isNative;
  const isSameToken = token1.address === token2.address;

  return isWrap || isUnwrap || isSameToken;
}

type Props = {
  position?: PositionInfo;
  savedIsPnlInLeverage: boolean;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function PositionSeller(p: Props) {
  const { position } = p;
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const { setPendingPositionUpdate } = useSyntheticsEvents();
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);

  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { maxLeverage, minCollateralUsd } = usePositionsConstants(chainId);
  const infoTokens = adaptToV1InfoTokens(tokensData || {});

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  const shouldSwapPnlToCollateralToken = getShouldSwapPnlToCollateralToken({
    market: position?.marketInfo,
    collateralTokenAddress: position?.collateralToken?.address,
    isLong: position?.isLong,
  });

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

  const markPrice = position?.markPrice;

  const marketInfo = getByKey(marketsInfoData, position?.marketAddress);

  const decreaseAmounts = useMemo(() => {
    if (!marketInfo) return undefined;

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken: position?.collateralToken,
      receiveToken: position?.collateralToken,
      existingPosition: position,
      sizeDeltaUsd: closeSizeUsd,
      keepLeverage,
      showPnlInLeverage: p.savedIsPnlInLeverage,
      allowedSlippage,
      isLong: position?.isLong,
    });
  }, [allowedSlippage, closeSizeUsd, keepLeverage, marketInfo, p.savedIsPnlInLeverage, position]);

  const swapAmounts = useMemo(() => {
    if (!shouldSwap || !decreaseAmounts) return undefined;

    return getSwapAmounts({
      tokenIn: position?.collateralToken,
      tokenOut: receiveToken,
      tokenInAmount: decreaseAmounts?.receiveTokenAmount,
      findSwapPath,
    });
  }, [decreaseAmounts, findSwapPath, position?.collateralToken, receiveToken, shouldSwap]);

  const nextPositionValues = useMemo(() => {
    if (!decreaseAmounts) return undefined;

    return getNextPositionValuesForDecreaseTrade({
      marketInfo,
      existingPosition: position,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      pnlDelta: decreaseAmounts?.pnlDelta,
      collateralDeltaUsd: decreaseAmounts?.collateralDeltaUsd,
      exitMarkPrice: decreaseAmounts?.exitMarkPrice,
      showPnlInLeverage: true,
      isLong: position?.isLong,
      maxLeverage,
    });
  }, [decreaseAmounts, marketInfo, maxLeverage, position]);

  const receiveTokenMarketInfo = swapAmounts?.swapPathStats?.targetMarketAddress
    ? getByKey(marketsInfoData, swapAmounts?.swapPathStats?.targetMarketAddress)
    : marketInfo;

  const receiveUsd = swapAmounts?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount = swapAmounts?.amountOut || decreaseAmounts?.receiveTokenAmount;

  const fees = getDisplayedTradeFees({
    marketInfo,
    swapSteps: swapAmounts?.swapPathStats?.swapSteps,
    swapPriceImpactDeltaUsd: swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
    initialCollateralUsd: receiveUsd,
    positionFeeUsd: decreaseAmounts?.positionFeeUsd,
    borrowingFeeUsd: position?.pendingBorrowingFeesUsd,
    fundingFeeDeltaUsd: position?.pendingFundingFeesUsd,
  });

  const receiveTokenLiquidity =
    receiveTokenMarketInfo && receiveToken
      ? getAvailableUsdLiquidityForCollateral(
          receiveTokenMarketInfo,
          getTokenPoolType(receiveTokenMarketInfo, receiveToken.address) === "long"
        )
      : undefined;

  const isHighPriceImpact =
    (fees?.swapPriceImpact?.deltaUsd.lt(0) && fees.swapPriceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BPS)) ||
    (fees?.positionPriceImpact?.deltaUsd.lt(0) && fees.positionPriceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BPS));

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? receiveTokenLiquidity?.lt(receiveUsd || 0) : false;

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice || !tokensData) return undefined;

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

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return [t`Need to accept price impact`];
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
      !tokensData ||
      !position?.indexToken ||
      !account ||
      !position ||
      !executionFee?.feeTokenAmount ||
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
      setPendingTxns: p.setPendingTxns,
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

                  <ExchangeInfoRow isTop label={t`Mark Price`} value={formatUsd(markPrice) || "-"} />
                  <ExchangeInfoRow label={t`Entry Price`} value={formatUsd(position?.entryPrice) || "-"} />
                  <ExchangeInfoRow
                    label={t`Price impact`}
                    value={formatPercentage(decreaseAmounts?.acceptablePriceImpactBps) || "-"}
                  />
                  <ExchangeInfoRow
                    label={t`Acceptable Price`}
                    value={formatUsd(decreaseAmounts?.acceptablePrice) || "-"}
                  />
                  <ExchangeInfoRow
                    className="SwapBox-info-row"
                    label={t`Liq. Price`}
                    value={
                      decreaseAmounts?.isClosing ? (
                        "-"
                      ) : (
                        <ValueTransition
                          from={formatUsd(position.liquidationPrice)!}
                          to={formatUsd(nextPositionValues?.nextLiqPrice)}
                        />
                      )
                    }
                  />

                  <ExchangeInfoRow
                    isTop
                    label={t`Size`}
                    value={
                      <ValueTransition
                        from={formatUsd(position?.sizeInUsd)!}
                        to={formatUsd(nextPositionValues?.nextSizeUsd)}
                      />
                    }
                  />

                  <div className="Exchange-info-row">
                    <div>
                      <Tooltip
                        handle={
                          <span className="Exchange-info-label">
                            <Trans>Collateral ({position.collateralToken?.symbol})</Trans>
                          </span>
                        }
                        position="left-top"
                        renderContent={() => {
                          return <Trans>Initial Collateral (Collateral excluding Borrow and Funding Fee).</Trans>;
                        }}
                      />
                    </div>
                    <div className="align-right">
                      <ValueTransition
                        from={formatUsd(position?.initialCollateralUsd)!}
                        to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                      />
                    </div>
                  </div>

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
                    value={position?.pnl ? formatDeltaUsd(position?.pnl, position?.pnlPercentage) : "..."}
                  />

                  <TradeFeesRow
                    isTop
                    totalTradeFees={fees?.totalFees}
                    positionFee={fees?.positionFee}
                    positionPriceImpact={fees?.positionPriceImpact}
                    swapFees={fees?.swapFees}
                    swapPriceImpact={fees?.swapPriceImpact}
                    executionFee={executionFee}
                    borrowFee={fees?.borrowFee}
                    fundingFee={fees?.fundingFee}
                    feesType="close"
                  />

                  <ExchangeInfoRow
                    isTop
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

                {isHighPriceImpact && (
                  <div className="PositionSeller-price-impact-warning">
                    <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                      <span className="muted font-sm">
                        <Trans>I am aware of the high price impact</Trans>
                      </span>
                    </Checkbox>
                  </div>
                )}

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
