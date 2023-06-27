import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getKeepLeverageKey } from "config/localStorage";
import { convertTokenAddress } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralInfo } from "domain/referrals/hooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getExecutionFee,
  getIsHighPriceImpact,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { MarketsInfoData } from "domain/synthetics/markets";
import { OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import {
  PositionInfo,
  formatLeverage,
  formatLiquidationPrice,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { TokensData } from "domain/synthetics/tokens";
import {
  AvailableTokenOptions,
  getDecreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getSwapAmountsByFromValue,
  getTradeFees,
  useSwapRoutes,
} from "domain/synthetics/trade";
import { getCommonError, getDecreaseError } from "domain/synthetics/trade/utils/validation";
import { getIsEquivalentTokens } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmountWithUsd,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useEffect, useMemo, useState } from "react";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionSeller.scss";
import { useDebugExecutionPrice } from "domain/synthetics/trade/useExecutionPrice";

export type Props = {
  position?: PositionInfo;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  showPnlInLeverage: boolean;
  allowedSlippage: number;
  availableTokensOptions?: AvailableTokenOptions;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
  isHigherSlippageAllowed: boolean;
  setIsHigherSlippageAllowed: (isAllowed: boolean) => void;
  onConnectWallet: () => void;
};

export function PositionSeller(p: Props) {
  const {
    position,
    marketsInfoData,
    tokensData,
    showPnlInLeverage,
    onClose,
    setPendingTxns,
    allowedSlippage,
    availableTokensOptions,
    isHigherSlippageAllowed,
    setIsHigherSlippageAllowed,
    onConnectWallet,
  } = p;

  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants(chainId);
  const userReferralInfo = useUserReferralInfo(library, chainId, account);

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [closeUsdInputValue, setCloseUsdInputValue] = useState("");
  const closeSizeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS)!;
  const maxCloseSize = position?.sizeInUsd || BigNumber.from(0);

  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>();
  const receiveToken = getByKey(tokensData, receiveTokenAddress);

  const markPrice = position
    ? getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: false })
    : undefined;

  const { findSwapPath, maxSwapLiquidity } = useSwapRoutes({
    marketsInfoData,
    fromTokenAddress: position?.collateralTokenAddress,
    toTokenAddress: receiveTokenAddress,
  });

  const decreaseAmounts = useMemo(() => {
    if (!position || !minCollateralUsd || !minPositionSizeUsd) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo: position.marketInfo,
      collateralToken: position.collateralToken,
      isLong: position.isLong,
      position,
      closeSizeUsd: closeSizeUsd,
      keepLeverage: keepLeverage!,
      triggerPrice: undefined,
      savedAcceptablePriceImpactBps: undefined,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
    });
  }, [closeSizeUsd, keepLeverage, minCollateralUsd, minPositionSizeUsd, position, userReferralInfo]);

  useDebugExecutionPrice(chainId, {
    skip: true,
    marketInfo: position?.marketInfo,
    sizeInUsd: position?.sizeInUsd,
    sizeInTokens: position?.sizeInTokens,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd.mul(-1),
    isLong: position?.isLong,
  });

  const shouldSwap = position && receiveToken && !getIsEquivalentTokens(position.collateralToken, receiveToken);

  const swapAmounts = useMemo(() => {
    if (!shouldSwap || !receiveToken || !decreaseAmounts?.receiveTokenAmount || !position) {
      return undefined;
    }

    return getSwapAmountsByFromValue({
      tokenIn: position.collateralToken,
      tokenOut: receiveToken,
      amountIn: decreaseAmounts.receiveTokenAmount,
      isLimit: false,
      findSwapPath,
    });
  }, [decreaseAmounts, findSwapPath, position, receiveToken, shouldSwap]);

  const receiveUsd = swapAmounts?.usdOut || decreaseAmounts?.receiveUsd;
  const receiveTokenAmount = swapAmounts?.amountOut || decreaseAmounts?.receiveTokenAmount;

  const nextPositionValues = useMemo(() => {
    if (!position || !decreaseAmounts?.sizeDeltaUsd.gt(0) || !minCollateralUsd) {
      return undefined;
    }

    return getNextPositionValuesForDecreaseTrade({
      existingPosition: position,
      marketInfo: position.marketInfo,
      collateralToken: position.collateralToken,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
      collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
      payedRemainingCollateralUsd: decreaseAmounts.payedRemainingCollateralUsd,
      payedRemainingCollateralAmount: decreaseAmounts.payedRemainingCollateralAmount,
      realizedPnl: decreaseAmounts.realizedPnl,
      estimatedPnl: decreaseAmounts.estimatedPnl,
      indexPrice: decreaseAmounts.indexPrice,
      showPnlInLeverage,
      isLong: position.isLong,
      minCollateralUsd,
      userReferralInfo,
    });
  }, [decreaseAmounts, minCollateralUsd, position, showPnlInLeverage, userReferralInfo]);

  const { fees, executionFee } = useMemo(() => {
    if (!position || !decreaseAmounts || !gasLimits || !tokensData || !gasPrice) {
      return {};
    }

    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      swapPath: swapAmounts?.swapPathStats?.swapPath || [],
    });

    return {
      fees: getTradeFees({
        isIncrease: false,
        initialCollateralUsd: position.collateralUsd,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        swapSteps: swapAmounts?.swapPathStats?.swapSteps || [],
        positionFeeUsd: decreaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd: swapAmounts?.swapPathStats?.totalSwapPriceImpactDeltaUsd || BigNumber.from(0),
        positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
        borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
        fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
        feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
      }),
      executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
    };
  }, [chainId, decreaseAmounts, gasLimits, gasPrice, position, swapAmounts, tokensData]);

  const isHighPriceImpact = getIsHighPriceImpact(fees?.positionPriceImpact, fees?.swapPriceImpact);

  const isNotEnoughReceiveTokenLiquidity = shouldSwap ? maxSwapLiquidity?.lt(receiveUsd || 0) : false;

  const error = useMemo(() => {
    if (!position) {
      return undefined;
    }

    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi: false,
    });

    const decreaseError = getDecreaseError({
      marketInfo: position.marketInfo,
      inputSizeUsd: closeSizeUsd,
      sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
      receiveToken,
      isTrigger: false,
      triggerPrice: undefined,
      existingPosition: position,
      nextPositionValues,
      isLong: position.isLong,
      isContractAccount: false,
      minCollateralUsd,
      isNotEnoughReceiveTokenLiquidity,
    });

    if (commonError[0] || decreaseError[0]) {
      return commonError[0] || decreaseError[0];
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return t`Need to accept Price Impact`;
    }

    if (isSubmitting) {
      return t`Creating Order...`;
    }
  }, [
    account,
    chainId,
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    isNotEnoughReceiveTokenLiquidity,
    isSubmitting,
    minCollateralUsd,
    nextPositionValues,
    position,
    receiveToken,
  ]);

  function onSubmit() {
    if (!account) {
      onConnectWallet();
      return;
    }

    if (
      !tokensData ||
      !position ||
      !executionFee?.feeTokenAmount ||
      !receiveToken?.address ||
      !receiveUsd ||
      !decreaseAmounts?.acceptablePrice
    ) {
      return;
    }

    setIsSubmitting(true);

    createDecreaseOrderTxn(chainId, library, {
      account,
      marketAddress: position.marketAddress,
      initialCollateralAddress: position.collateralTokenAddress,
      initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount || BigNumber.from(0),
      receiveTokenAddress: receiveToken.address,
      swapPath: swapAmounts?.swapPathStats?.swapPath || [],
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      isLong: position.isLong,
      acceptablePrice: decreaseAmounts.acceptablePrice,
      triggerPrice: undefined,
      minOutputUsd: BigNumber.from(0),
      decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
      orderType: OrderType.MarketDecrease,
      referralCode: userReferralInfo?.userReferralCode,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      indexToken: position.indexToken,
      tokensData,
      setPendingOrder,
      setPendingTxns,
      setPendingPosition,
    })
      .then(onClose)
      .finally(() => setIsSubmitting(false));
  }

  useEffect(
    function resetForm() {
      if (!isVisible !== prevIsVisible) {
        setCloseUsdInputValue("");
        setIsHighPriceImpactAccepted(false);
        setReceiveTokenAddress(undefined);
      }
    },
    [isVisible, prevIsVisible]
  );

  useEffect(
    function initReceiveToken() {
      if (!receiveTokenAddress && position?.collateralToken?.address) {
        const convertedAddress = convertTokenAddress(chainId, position?.collateralToken.address, "native");
        setReceiveTokenAddress(convertedAddress);
      }
    },
    [chainId, position?.collateralToken, receiveTokenAddress]
  );

  const indexPriceDecimals = position?.indexToken?.priceDecimals;

  return (
    <div className="PositionEditor PositionSeller">
      <Modal
        className="PositionSeller-modal"
        isVisible={position}
        setIsVisible={p.onClose}
        label={
          <Trans>
            Close {p.position?.isLong ? t`Long` : t`Short`} {p.position?.indexToken?.symbol}
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
              showMaxButton={maxCloseSize?.gt(0) && !closeSizeUsd?.eq(maxCloseSize)}
              onClickMax={() => setCloseUsdInputValue(formatAmountFree(maxCloseSize, USD_DECIMALS))}
            >
              USD
            </BuyInputSection>

            <div className="PositionEditor-info-box PositionSeller-info-box">
              {executionFee?.warning && <div className="Confirmation-box-warning">{executionFee.warning}</div>}
              <div className="PositionEditor-keep-leverage-settings">
                <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
                  <span className="muted font-sm">
                    <Trans>Keep leverage at {position?.leverage ? formatLeverage(position.leverage) : "..."}</Trans>
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
                          Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if prices
                          are volatile.
                        </Trans>
                      );
                    }}
                  />
                </ExchangeInfoRow>
              </div>

              <ExchangeInfoRow
                isTop
                label={t`Mark Price`}
                value={
                  formatUsd(markPrice, {
                    displayDecimals: indexPriceDecimals,
                  }) || "-"
                }
              />
              <ExchangeInfoRow
                label={t`Entry Price`}
                value={
                  formatUsd(position?.entryPrice, {
                    displayDecimals: indexPriceDecimals,
                  }) || "-"
                }
              />
              <ExchangeInfoRow
                label={t`Price Impact`}
                value={formatPercentage(decreaseAmounts?.acceptablePriceDeltaBps, { signed: true }) || "-"}
              />

              <ExchangeInfoRow
                label={t`Acceptable Price`}
                value={
                  formatUsd(decreaseAmounts?.acceptablePrice, {
                    displayDecimals: indexPriceDecimals,
                  }) || "-"
                }
              />

              <ExchangeInfoRow
                className="SwapBox-info-row"
                label={t`Liq. Price`}
                value={
                  decreaseAmounts?.isFullClose ? (
                    "-"
                  ) : (
                    <ValueTransition
                      from={
                        formatLiquidationPrice(position.liquidationPrice, {
                          displayDecimals: indexPriceDecimals,
                        })!
                      }
                      to={
                        decreaseAmounts?.sizeDeltaUsd.gt(0)
                          ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                              displayDecimals: indexPriceDecimals,
                            })
                          : undefined
                      }
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
                    from={formatUsd(position?.collateralUsd)!}
                    to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                  />
                </div>
              </div>

              {!keepLeverage && (
                <ExchangeInfoRow
                  label={t`Leverage`}
                  value={
                    decreaseAmounts?.sizeDeltaUsd.eq(position.sizeInUsd) ? (
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
                value={
                  <ValueTransition
                    from={formatDeltaUsd(position.pnl, position.pnlPercentage)}
                    to={formatDeltaUsd(nextPositionValues?.nextPnl, nextPositionValues?.nextPnlPercentage)}
                  />
                }
              />

              <TradeFeesRow {...fees} executionFee={executionFee} feesType="decrease" warning={executionFee?.warning} />

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
                      infoTokens={availableTokensOptions?.infoTokens}
                      tokenAddress={receiveToken.address}
                      onSelectToken={(token) => setReceiveTokenAddress(token.address)}
                      tokens={availableTokensOptions?.swapTokens || []}
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

            {isHighPriceImpact && <div className="line-divider" />}

            {isHighPriceImpact && (
              <div className="PositionSeller-price-impact-warning">
                <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                  <span className="muted font-sm">
                    <Trans>I am aware of the high Price Impact</Trans>
                  </span>
                </Checkbox>
              </div>
            )}

            <div className="Exchange-swap-button-container">
              <Button className="w-full" variant="primary-action" disabled={Boolean(error)} onClick={onSubmit}>
                {error || t`Close`}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
