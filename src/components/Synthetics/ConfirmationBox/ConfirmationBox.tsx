import { Plural, Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { HIGH_SPREAD_THRESHOLD } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralCode } from "domain/referrals/hooks";
import {
  ExecutionFee,
  getBorrowingFactorPerPeriod,
  getFundingFactorPerPeriod,
  getIsHighPriceImpact,
} from "domain/synthetics/fees";
import { MarketInfo } from "domain/synthetics/markets";
import {
  OrderType,
  OrdersInfoData,
  PositionOrderInfo,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  isLimitOrderType,
  isOrderForPosition,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { PositionInfo, formatLeverage, formatLiquidationPrice, getPositionKey } from "domain/synthetics/positions";
import {
  TokenData,
  TokensData,
  TokensRatio,
  convertToTokenAmount,
  formatTokensRatio,
  getNeedTokenApprove,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  NextPositionValues,
  SwapAmounts,
  TradeFees,
  TriggerThresholdType,
} from "domain/synthetics/trade";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import {
  formatAmount,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
} from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./ConfirmationBox.scss";

export type Props = {
  isVisible: boolean;
  tradeFlags: TradeFlags;
  isWrapOrUnwrap: boolean;
  fromToken?: TokenData;
  toToken?: TokenData;
  markPrice?: BigNumber;
  markRatio?: TokensRatio;
  triggerPrice?: BigNumber;
  triggerRatio?: TokensRatio;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  swapAmounts?: SwapAmounts;
  increaseAmounts?: IncreasePositionAmounts;
  decreaseAmounts?: DecreasePositionAmounts;
  nextPositionValues?: NextPositionValues;
  keepLeverage?: boolean;
  swapLiquidityUsd?: BigNumber;
  longLiquidityUsd?: BigNumber;
  shortLiquidityUsd?: BigNumber;
  fees?: TradeFees;
  executionFee?: ExecutionFee;
  error?: string;
  existingPosition?: PositionInfo;
  shouldDisableValidation: boolean;
  allowedSlippage?: number;
  isHigherSlippageAllowed?: boolean;
  ordersData?: OrdersInfoData;
  tokensData?: TokensData;
  setIsHigherSlippageAllowed: (isHigherSlippageAllowed: boolean) => void;
  setKeepLeverage: (keepLeverage: boolean) => void;
  onClose: () => void;
  onSubmitted: () => void;
  setPendingTxns: (txns: any) => void;
  onConnectWallet: () => void;
};

export function ConfirmationBox(p: Props) {
  const {
    tradeFlags,
    isWrapOrUnwrap,
    fromToken,
    toToken,
    markPrice,
    markRatio,
    triggerPrice,
    triggerRatio,
    marketInfo,
    collateralToken,
    swapAmounts,
    increaseAmounts,
    decreaseAmounts,
    nextPositionValues,
    swapLiquidityUsd,
    longLiquidityUsd,
    shortLiquidityUsd,
    keepLeverage,
    fees,
    executionFee,
    error,
    existingPosition,
    shouldDisableValidation,
    allowedSlippage,
    isHigherSlippageAllowed,
    ordersData,
    tokensData,
    setIsHigherSlippageAllowed,
    setKeepLeverage,
    onClose,
    onSubmitted,
    setPendingTxns,
    onConnectWallet,
  } = p;

  const { isLong, isSwap, isMarket, isLimit, isTrigger, isIncrease } = tradeFlags;
  const { indexToken } = marketInfo || {};

  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();

  const prevIsVisible = usePrevious(p.isVisible);

  const { userReferralCode } = useUserReferralCode(library, chainId, account);

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [isLimitOrdersVisible, setIsLimitOrdersVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payAmount = useMemo(() => {
    if (isSwap && !isWrapOrUnwrap) {
      return swapAmounts?.amountIn;
    }
    if (isIncrease) {
      return increaseAmounts?.initialCollateralAmount;
    }
  }, [increaseAmounts?.initialCollateralAmount, isIncrease, isSwap, isWrapOrUnwrap, swapAmounts?.amountIn]);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
  });

  const needPayTokenApproval =
    !isWrapOrUnwrap &&
    tokensAllowanceData &&
    fromToken &&
    payAmount &&
    getNeedTokenApprove(tokensAllowanceData, fromToken.address, payAmount);

  const isHighPriceImpact = getIsHighPriceImpact(fees?.positionPriceImpact, fees?.swapPriceImpact);

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);

  const positionOrders = useMemo(() => {
    if (!positionKey || !ordersData) {
      return [];
    }

    return Object.values(ordersData).filter((order) => isOrderForPosition(order, positionKey)) as PositionOrderInfo[];
  }, [ordersData, positionKey]);

  const existingLimitOrders = useMemo(
    () => positionOrders.filter((order) => isLimitOrderType(order.orderType)),
    [positionOrders]
  );

  const existingTriggerOrders = useMemo(
    () => positionOrders.filter((order) => isTriggerDecreaseOrderType(order.orderType)),
    [positionOrders]
  );

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    if (!existingPosition || !markPrice) {
      return [];
    }

    return existingTriggerOrders.filter((order) => {
      return order.triggerThresholdType === TriggerThresholdType.Above
        ? markPrice.gt(order.triggerPrice)
        : markPrice.lt(order.triggerPrice);
    });
  }, [existingPosition, existingTriggerOrders, markPrice]);

  const swapSpreadInfo = useMemo(() => {
    let spread = BigNumber.from(0);

    if (isSwap && fromToken && toToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(toToken.prices);

      spread = fromSpread.add(toSpread);
    } else if (isIncrease && fromToken && indexToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread.add(toSpread);

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread.gt(HIGH_SPREAD_THRESHOLD);

    const showSpread = isMarket;

    return { spread, showSpread, isHigh };
  }, [isSwap, fromToken, toToken, isIncrease, indexToken, isMarket, isLong]);

  const collateralSpreadInfo = useMemo(() => {
    if (!indexToken || !collateralToken) {
      return undefined;
    }

    let totalSpread = getSpread(indexToken.prices);

    if (getIsEquivalentTokens(collateralToken, indexToken)) {
      return {
        spread: totalSpread,
        isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
      };
    }

    totalSpread = totalSpread.add(getSpread(collateralToken!.prices!));

    return {
      spread: totalSpread,
      isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
    };
  }, [collateralToken, indexToken]);

  const title = useMemo(() => {
    if (isMarket) {
      if (isSwap) {
        return t`Confirm Swap`;
      }

      return isLong ? t`Confirm Long` : t`Confirm Short`;
    }

    if (isLimit) {
      return t`Confirm Limit Order`;
    }

    return t`Confirm Trigger Order`;
  }, [isLimit, isLong, isMarket, isSwap]);

  const submitButtonState = useMemo(() => {
    if (isSubmitting) {
      return {
        text: t`Creating Order...`,
        disabled: true,
      };
    }

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (needPayTokenApproval) {
      return { text: t`Pending ${fromToken?.symbol} approval`, disabled: true };
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return { text: t`Need to accept Price Impact`, disabled: true };
    }

    if (isIncrease && decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return {
        text: t`Accept confirmation of trigger orders`,
        disabled: true,
      };
    }

    let text = "";

    if (isMarket) {
      if (isSwap) {
        text = t`Swap`;
      } else {
        text = isLong ? t`Long` : t`Short`;
      }
    } else if (isLimit) {
      text = t`Confirm Limit Order`;
    } else {
      text = t`Confirm Trigger Order`;
    }

    return {
      text,
      disabled: false,
    };
  }, [
    decreaseOrdersThatWillBeExecuted.length,
    error,
    fromToken?.symbol,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    isIncrease,
    isLimit,
    isLong,
    isMarket,
    isSubmitting,
    isSwap,
    isTriggerWarningAccepted,
    needPayTokenApproval,
  ]);

  function onCancelOrderClick(key: string): void {
    cancelOrdersTxn(chainId, library, { orderKeys: [key], setPendingTxns: p.setPendingTxns });
  }

  function onSubmitWrapOrUnwrap() {
    if (!account || !swapAmounts || !fromToken) {
      return Promise.resolve();
    }

    return createWrapOrUnwrapTxn(chainId, library, {
      amount: swapAmounts.amountIn,
      isWrap: Boolean(fromToken.isNative),
      setPendingTxns,
    });
  }

  function onSubmitSwap() {
    if (
      !account ||
      !tokensData ||
      !swapAmounts?.swapPathStats ||
      !fromToken ||
      !toToken ||
      !executionFee ||
      typeof allowedSlippage !== "number"
    ) {
      return Promise.resolve();
    }

    return createSwapOrderTxn(chainId, library, {
      account,
      fromTokenAddress: fromToken.address,
      fromTokenAmount: swapAmounts.amountIn,
      swapPath: swapAmounts.swapPathStats?.swapPath,
      toTokenAddress: toToken.address,
      orderType: isLimit ? OrderType.LimitSwap : OrderType.MarketSwap,
      minOutputAmount: swapAmounts.minOutputAmount,
      referralCode: userReferralCode,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      tokensData,
      setPendingTxns,
      setPendingOrder,
    });
  }

  function onSubmitIncreaseOrder() {
    if (
      !tokensData ||
      !account ||
      !fromToken ||
      !collateralToken ||
      !increaseAmounts?.acceptablePrice ||
      !executionFee ||
      !marketInfo ||
      typeof allowedSlippage !== "number"
    ) {
      return Promise.resolve();
    }

    return createIncreaseOrderTxn(chainId, library, {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      initialCollateralAddress: fromToken?.address,
      initialCollateralAmount: increaseAmounts.initialCollateralAmount,
      targetCollateralAddress: collateralToken.address,
      collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
      swapPath: increaseAmounts.swapPathStats?.swapPath || [],
      sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
      triggerPrice: isLimit ? triggerPrice : undefined,
      acceptablePrice: increaseAmounts.acceptablePrice,
      isLong,
      orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      referralCode: userReferralCode,
      indexToken: marketInfo.indexToken,
      tokensData,
      skipSimulation: isLimit || shouldDisableValidation,
      setPendingTxns: p.setPendingTxns,
      setPendingOrder,
      setPendingPosition,
    });
  }

  function onSubmitDecreaseOrder() {
    if (
      !account ||
      !marketInfo ||
      !collateralToken ||
      !decreaseAmounts?.acceptablePrice ||
      decreaseAmounts.triggerOrderType === undefined ||
      !decreaseAmounts.triggerPrice ||
      !executionFee ||
      !tokensData ||
      typeof allowedSlippage !== "number"
    ) {
      return Promise.resolve();
    }

    return createDecreaseOrderTxn(chainId, library, {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      swapPath: [],
      initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
      initialCollateralAddress: collateralToken.address,
      receiveTokenAddress: collateralToken.address,
      triggerPrice: decreaseAmounts.triggerPrice,
      acceptablePrice: decreaseAmounts.acceptablePrice,
      sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
      minOutputUsd: BigNumber.from(0),
      isLong,
      decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
      orderType: decreaseAmounts.triggerOrderType,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      referralCode: userReferralCode,
      // Skip simulation to avoid EmptyPosition error
      // skipSimulation: !existingPosition || shouldDisableValidation,
      skipSimulation: true,
      indexToken: marketInfo.indexToken,
      tokensData,
      setPendingTxns,
      setPendingOrder,
      setPendingPosition,
    });
  }

  function onSubmit() {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (!account) {
      onConnectWallet();
      return;
    } else if (isWrapOrUnwrap) {
      txnPromise = onSubmitWrapOrUnwrap();
    } else if (isSwap) {
      txnPromise = onSubmitSwap();
    } else if (isIncrease) {
      txnPromise = onSubmitIncreaseOrder();
    } else {
      txnPromise = onSubmitDecreaseOrder();
    }

    txnPromise
      .then(() => {
        onSubmitted();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  useEffect(
    function reset() {
      if (p.isVisible !== prevIsVisible) {
        setIsTriggerWarningAccepted(false);
        setIsHighPriceImpactAccepted(false);
      }
    },
    [p.isVisible, prevIsVisible]
  );

  function renderMain() {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            <Trans>Pay</Trans>&nbsp;
            {formatTokenAmountWithUsd(
              swapAmounts?.amountIn,
              swapAmounts?.usdIn,
              fromToken?.symbol,
              fromToken?.decimals
            )}
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            <Trans>Receive</Trans>&nbsp;
            {formatTokenAmountWithUsd(swapAmounts?.amountOut, swapAmounts?.usdOut, toToken?.symbol, toToken?.decimals)}
          </div>
        </div>
      );
    }

    if (isIncrease) {
      return (
        <div className="Confirmation-box-main">
          <span>
            <Trans>Pay</Trans>&nbsp;
            {formatTokenAmountWithUsd(
              increaseAmounts?.initialCollateralAmount,
              increaseAmounts?.initialCollateralUsd,
              fromToken?.symbol,
              fromToken?.decimals
            )}
          </span>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            {isLong ? t`Long` : t`Short`}&nbsp;
            {formatTokenAmountWithUsd(
              increaseAmounts?.sizeDeltaInTokens,
              increaseAmounts?.sizeDeltaUsd,
              toToken?.symbol,
              toToken?.decimals
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cx("Confirmation-box-main ConfirmationBox-main")}>
        <Trans>Decrease</Trans>&nbsp;{indexToken?.symbol} {isLong ? t`Long` : t`Short`}
      </div>
    );
  }

  function renderFeeWarning() {
    if (!fees?.totalFees) {
      return null;
    }

    const shouldShowWarning = fees.totalFees.deltaUsd.lt(0) && fees.totalFees.bps.abs().gt(600);

    if (!shouldShowWarning) {
      return null;
    }

    return (
      <div className="Confirmation-box-warning">
        <Trans>Fees are high</Trans>
      </div>
    );
  }

  function renderOrderItem(order: PositionOrderInfo) {
    return (
      <li key={order.key} className="font-sm">
        <p>
          {isLimitOrderType(order.orderType) ? t`Increase` : t`Decrease`} {order.indexToken?.symbol}{" "}
          {formatUsd(order.sizeDeltaUsd)} {order.isLong ? t`Long` : t`Short`} &nbsp;
          {order.triggerThresholdType}
          {formatUsd(order.triggerPrice)}{" "}
        </p>
        <button onClick={() => onCancelOrderClick(order.key)}>
          <Trans>Cancel</Trans>
        </button>
      </li>
    );
  }

  const longShortText = isLong ? t`Long` : t`Short`;

  function renderExistingLimitOrdersWarning() {
    if (!existingLimitOrders?.length || !toToken) {
      return;
    }

    if (existingLimitOrders.length === 1) {
      const order = existingLimitOrders[0];

      const sizeText = formatUsd(order.sizeDeltaUsd);

      return (
        <div className="Confirmation-box-info">
          <Trans>
            You have an active Limit Order to Increase {longShortText} {order.indexToken?.symbol} {sizeText} at price{" "}
            {formatUsd(order.triggerPrice)}.
          </Trans>
        </div>
      );
    } else {
      return (
        <div>
          <div className="Confirmation-box-info">
            <span>
              <Trans>
                You have multiple existing Increase {longShortText} {toToken.symbol} limit orders{" "}
              </Trans>
            </span>
            <span onClick={() => setIsLimitOrdersVisible((p) => !p)} className="view-orders">
              ({isLimitOrdersVisible ? t`hide` : t`view`})
            </span>
          </div>
          <ul className="order-list">{existingLimitOrders.map(renderOrderItem)}</ul>
        </div>
      );
    }
  }

  function renderExistingTriggerErrors() {
    if (!decreaseOrdersThatWillBeExecuted?.length) {
      return;
    }

    const existingTriggerOrderLength = decreaseOrdersThatWillBeExecuted.length;
    return (
      <>
        <div className="Confirmation-box-warning">
          <Plural
            value={existingTriggerOrderLength}
            one="You have an active trigger order that might execute immediately after you open this position. Please cancel the order or accept the confirmation to continue."
            other="You have # active trigger orders that might execute immediately after you open this position. Please cancel the orders or accept the confirmation to continue."
          />
        </div>
        <ul className="order-list">{decreaseOrdersThatWillBeExecuted.map(renderOrderItem)}</ul>
      </>
    );
  }

  function renderExistingTriggerWarning() {
    if (
      !existingTriggerOrders?.length ||
      decreaseOrdersThatWillBeExecuted.length > 0 ||
      renderExistingLimitOrdersWarning()
    ) {
      return;
    }

    const existingTriggerOrderLength = existingTriggerOrders.length;

    return (
      <div className="Confirmation-box-info">
        <Plural
          value={existingTriggerOrderLength}
          one="You have an active trigger order that could impact this position."
          other="You have # active trigger orders that could impact this position."
        />
      </div>
    );
  }

  function renderAvailableLiquidity() {
    const riskThresholdBps = 5000;
    let availableLiquidityUsd: BigNumber | undefined = undefined;
    let availableLiquidityAmount: BigNumber | undefined = undefined;
    let isLiquidityRisk = false;

    if (isSwap && swapAmounts) {
      availableLiquidityUsd = swapLiquidityUsd;

      availableLiquidityAmount = convertToTokenAmount(
        availableLiquidityUsd,
        toToken?.decimals,
        toToken?.prices.maxPrice
      );

      isLiquidityRisk = availableLiquidityUsd!.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(swapAmounts.usdOut);
    }

    if (isIncrease && increaseAmounts) {
      availableLiquidityUsd = isLong ? longLiquidityUsd : shortLiquidityUsd;

      isLiquidityRisk = availableLiquidityUsd!
        .mul(riskThresholdBps)
        .div(BASIS_POINTS_DIVISOR)
        .lt(increaseAmounts.sizeDeltaUsd);
    }

    return (
      <ExchangeInfoRow label={t`Available Liquidity`}>
        <Tooltip
          position="right-bottom"
          handleClassName={isLiquidityRisk ? "negative" : ""}
          handle={
            isSwap
              ? formatTokenAmount(availableLiquidityAmount, toToken?.decimals, toToken?.symbol)
              : formatUsd(availableLiquidityUsd)
          }
          renderContent={() =>
            isLiquidityRisk
              ? t`There may not be sufficient liquidity to execute your order when the price conditions are met.`
              : t`The order will only execute if the price conditions are met and there is sufficient liquidity.`
          }
        />
      </ExchangeInfoRow>
    );
  }

  function renderSwapSpreadWarining() {
    if (!isMarket) {
      return null;
    }

    if (swapSpreadInfo.spread && swapSpreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>The spread is {`>`} 1%, please ensure the trade details are acceptable before comfirming</Trans>
        </div>
      );
    }
  }

  const renderCollateralSpreadWarning = useCallback(() => {
    if (collateralSpreadInfo && collateralSpreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>
            Transacting with a depegged stable coin is subject to spreads reflecting the worse of current market price
            or $1.00, with transactions involving multiple stablecoins may have multiple spreads.
          </Trans>
        </div>
      );
    }
  }, [collateralSpreadInfo]);

  function renderAllowedSlippage(allowedSlippage) {
    return (
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
                Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if prices are
                volatile.
              </Trans>
            );
          }}
        />
      </ExchangeInfoRow>
    );
  }

  function renderIncreaseOrderSection() {
    if (!marketInfo || !fromToken || !collateralToken || !toToken) {
      return null;
    }

    const borrowingRate = getBorrowingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100);
    const fundigRate = getFundingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100);
    const isCollateralSwap = !getIsEquivalentTokens(fromToken, collateralToken);
    const existingPriceDecimals = p.existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;

    return (
      <>
        <div>
          {renderMain()}
          {renderCollateralSpreadWarning()}
          {isMarket && renderFeeWarning()}
          {renderExistingLimitOrdersWarning()}
          {renderExistingTriggerErrors()}
          {renderExistingTriggerWarning()}
          {isLimit && renderAvailableLiquidity()}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Leverage`}
            value={
              <ValueTransition
                from={formatLeverage(existingPosition?.leverage)}
                to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
              />
            }
          />
          {isMarket && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
                <span className="muted font-sm">
                  <Trans>Allow up to 1% slippage</Trans>
                </span>
              </Checkbox>
            </div>
          )}

          {renderAllowedSlippage(allowedSlippage)}

          {isMarket && collateralSpreadInfo?.spread && (
            <ExchangeInfoRow label={t`Collateral Spread`} isWarning={swapSpreadInfo.isHigh} isTop={true}>
              {formatAmount(collateralSpreadInfo.spread.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}

          {isMarket && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Entry Price`}
              value={
                <ValueTransition
                  from={formatUsd(p.existingPosition?.entryPrice, {
                    displayDecimals: existingPriceDecimals,
                  })}
                  to={formatUsd(nextPositionValues?.nextEntryPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })}
                />
              }
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              isTop
              className="SwapBox-info-row"
              label={t`Mark Price`}
              value={
                formatUsd(markPrice, {
                  displayDecimals: toTokenPriceDecimals,
                }) || "-"
              }
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Limit Price`}
              value={
                formatUsd(triggerPrice, {
                  displayDecimals: toTokenPriceDecimals,
                }) || "-"
              }
            />
          )}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={isMarket ? t`Price Impact` : t`Acceptable Price Impact`}
            value={
              <span className={cx({ positive: isMarket && increaseAmounts?.acceptablePriceDeltaBps?.gt(0) })}>
                {formatPercentage(increaseAmounts?.acceptablePriceDeltaBps, {
                  signed: true,
                }) || "-"}
              </span>
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price`}
            value={
              formatUsd(increaseAmounts?.acceptablePrice, {
                displayDecimals: toTokenPriceDecimals,
              }) || "-"
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              <ValueTransition
                from={
                  p.existingPosition
                    ? formatLiquidationPrice(p.existingPosition?.liquidationPrice, {
                        displayDecimals: existingPriceDecimals,
                      })
                    : undefined
                }
                to={
                  formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  }) || "-"
                }
              />
            }
          />

          <div className="Exchange-info-row top-line">
            <div>
              {isCollateralSwap ? (
                <Tooltip
                  handle={
                    <span className="Exchange-info-label">
                      <Trans>Collateral ({collateralToken?.symbol})</Trans>
                    </span>
                  }
                  position="left-top"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          {fromToken?.symbol} will be swapped to {collateralToken?.symbol} on order execution.{" "}
                        </Trans>{" "}
                        {isLimit && (
                          <Trans>
                            Collateral value may differ due to different Price Impact at the time of execution.
                          </Trans>
                        )}
                      </div>
                    );
                  }}
                />
              ) : (
                <span className="Exchange-info-label">
                  <Trans>Collateral ({collateralToken?.symbol})</Trans>
                </span>
              )}
            </div>
            <div className="align-right">
              <Tooltip
                handle={formatUsd(increaseAmounts?.collateralDeltaUsd)}
                position="right-top"
                renderContent={() => {
                  return (
                    <>
                      <Trans>Your position's collateral after deducting fees.</Trans>
                      <br />
                      <br />
                      <StatsTooltipRow
                        label={t`Pay Amount`}
                        value={formatUsd(increaseAmounts?.initialCollateralUsd) || "-"}
                        showDollar={false}
                      />
                      <StatsTooltipRow
                        label={t`Fees`}
                        value={
                          fees?.payTotalFees?.deltaUsd && !fees.payTotalFees.deltaUsd.eq(0)
                            ? `${fees.payTotalFees.deltaUsd.gt(0) ? "+" : "-"}${formatUsd(
                                fees.payTotalFees.deltaUsd.abs()
                              )}`
                            : "0.00$"
                        }
                        showDollar={false}
                      />
                      <div className="Tooltip-divider" />
                      <StatsTooltipRow
                        label={t`Collateral`}
                        value={formatUsd(increaseAmounts?.collateralDeltaUsd) || "-"}
                        showDollar={false}
                      />
                    </>
                  );
                }}
              />
            </div>
          </div>

          <TradeFeesRow
            {...fees}
            fundingFeeRateStr={
              fundigRate && `${fundigRate.gt(0) ? "+" : "-"}${formatAmount(fundigRate.abs(), 30, 4)}% / 1h`
            }
            borrowFeeRateStr={borrowingRate && `-${formatAmount(borrowingRate, 30, 4)}% / 1h`}
            executionFee={p.executionFee}
            feesType="increase"
            warning={p.executionFee?.warning}
          />

          {(decreaseOrdersThatWillBeExecuted?.length > 0 || isHighPriceImpact) && <div className="line-divider" />}

          {decreaseOrdersThatWillBeExecuted?.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the trigger orders</Trans>
                </span>
              </Checkbox>
            </div>
          )}

          {isHighPriceImpact && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the high Price Impact</Trans>
                </span>
              </Checkbox>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderSwapSection() {
    return (
      <>
        <div>
          {renderMain()}
          {renderFeeWarning()}
          {renderSwapSpreadWarining()}
          {swapSpreadInfo.showSpread && swapSpreadInfo.spread && (
            <ExchangeInfoRow label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
              {formatAmount(swapSpreadInfo.spread.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          {isLimit && renderAvailableLiquidity()}
          {renderAllowedSlippage(allowedSlippage)}
          <ExchangeInfoRow label={t`Mark Price`} isTop>
            {formatTokensRatio(fromToken, toToken, markRatio)}
          </ExchangeInfoRow>
          {isLimit && (
            <ExchangeInfoRow label={t`Limit Price`}>
              {formatTokensRatio(fromToken, toToken, triggerRatio)}
            </ExchangeInfoRow>
          )}

          <ExchangeInfoRow label={t`${fromToken?.symbol} Price`}>
            {formatUsd(swapAmounts?.priceIn, {
              displayDecimals: fromToken?.priceDecimals,
            })}
          </ExchangeInfoRow>

          <ExchangeInfoRow label={t`${toToken?.symbol} Price`}>
            {formatUsd(swapAmounts?.priceOut, {
              displayDecimals: toToken?.priceDecimals,
            })}
          </ExchangeInfoRow>

          {!p.isWrapOrUnwrap && (
            <TradeFeesRow
              {...fees}
              isTop
              executionFee={p.executionFee}
              feesType="swap"
              warning={p.executionFee?.warning}
            />
          )}

          <ExchangeInfoRow label={t`Min. Receive`} isTop>
            {formatTokenAmount(swapAmounts?.minOutputAmount, toToken?.decimals, toToken?.symbol)}
          </ExchangeInfoRow>

          {isHighPriceImpact && <div className="line-divider" />}

          {isHighPriceImpact && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the high Price Impact</Trans>
                </span>
              </Checkbox>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderTriggerDecreaseSection() {
    return (
      <>
        <div>
          {renderMain()}

          {isTrigger && existingPosition?.leverage && (
            <Checkbox asRow isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
              <span className="muted font-sm">
                <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)} </Trans>
              </span>
            </Checkbox>
          )}
          <ExchangeInfoRow
            label={t`Trigger Price`}
            value={triggerPrice ? `${decreaseAmounts?.triggerThresholdType} ${formatUsd(triggerPrice)}` : "..."}
          />

          <ExchangeInfoRow isTop label={t`Mark Price`} value={p.markPrice ? formatUsd(p.markPrice) : "..."} />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price Impact`}
            value={formatPercentage(decreaseAmounts?.acceptablePriceDeltaBps) || "-"}
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price`}
            value={formatUsd(decreaseAmounts?.acceptablePrice) || "-"}
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Liq. Price`}
              value={
                nextPositionValues?.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatUsd(existingPosition?.liquidationPrice)!}
                    to={formatUsd(nextPositionValues.nextLiqPrice)}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}

          <ExchangeInfoRow
            label={p.existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
            isTop
            value={
              p.existingPosition?.sizeInUsd ? (
                <ValueTransition
                  from={formatUsd(p.existingPosition.sizeInUsd)!}
                  to={formatUsd(nextPositionValues?.nextSizeUsd)}
                />
              ) : decreaseAmounts?.sizeDeltaUsd ? (
                formatUsd(decreaseAmounts.sizeDeltaUsd)
              ) : (
                "-"
              )
            }
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Collateral (${p.existingPosition?.collateralToken?.symbol})`}
              value={
                <ValueTransition
                  from={formatUsd(existingPosition?.remainingCollateralUsd)!}
                  to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                />
              }
            />
          )}

          {!p.keepLeverage && p.existingPosition?.leverage && (
            <ExchangeInfoRow
              label={t`Leverage`}
              value={
                nextPositionValues?.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatLeverage(p.existingPosition?.leverage)}
                    to={formatLeverage(nextPositionValues.nextLeverage) || "-"}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}
          {existingPosition && (
            <ExchangeInfoRow
              label={t`PnL`}
              value={
                <ValueTransition
                  from={
                    <>
                      {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                      {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
                    </>
                  }
                  to={
                    <>
                      {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                      {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                    </>
                  }
                />
              }
            />
          )}

          <TradeFeesRow {...fees} executionFee={p.executionFee} feesType="decrease" warning={p.executionFee?.warning} />

          {decreaseAmounts?.receiveUsd && (
            <ExchangeInfoRow
              label={t`Receive`}
              value={formatTokenAmountWithUsd(
                decreaseAmounts.receiveTokenAmount,
                decreaseAmounts.receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )}

          {isHighPriceImpact && <div className="line-divider" />}

          {isHighPriceImpact && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the high Price Impact</Trans>
                </span>
              </Checkbox>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="Confirmation-box">
      <Modal isVisible={p.isVisible} setIsVisible={onClose} label={title} allowContentTouchMove>
        {isSwap && renderSwapSection()}
        {isIncrease && renderIncreaseOrderSection()}
        {isTrigger && renderTriggerDecreaseSection()}

        {needPayTokenApproval && fromToken && (
          <>
            <div className="line-divider" />

            <ApproveTokenButton
              tokenAddress={fromToken.address}
              tokenSymbol={fromToken.symbol}
              spenderAddress={getContract(chainId, "SyntheticsRouter")}
            />
          </>
        )}

        <div className="Confirmation-box-row">
          <Button
            variant="primary-action"
            className="w-full"
            onClick={onSubmit}
            disabled={submitButtonState.disabled && !shouldDisableValidation}
          >
            {submitButtonState.text}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
