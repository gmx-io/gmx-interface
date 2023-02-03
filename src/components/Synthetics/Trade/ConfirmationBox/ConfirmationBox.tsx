import { Plural, Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { HIGH_SPREAD_THRESHOLD } from "config/common";
import { getContract } from "config/contracts";
import { getWrappedToken } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralCode } from "domain/referrals";
import { ExecutionFee, FeeItem, TradeFees, getMarketFeesConfig } from "domain/synthetics/fees";
import {
  getAvailableUsdLiquidityForCollateral,
  getAvailableUsdLiquidityForPosition,
  getMarket,
  useMarketsData,
  useMarketsPoolsData,
  useOpenInterestData,
} from "domain/synthetics/markets";
import {
  AggregatedOrderData,
  AggregatedOrdersData,
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  getPositionOrders,
  getTriggerOrderType,
  getTriggerPricePrefix,
  isLimitOrder,
  isTriggerDecreaseOrder as isTriggerDecreaseOrder,
  isTriggerPriceAboveThreshold,
} from "domain/synthetics/orders";
import { AggregatedPositionData, formatLeverage, formatPnl } from "domain/synthetics/positions";
import {
  TokenData,
  TokensData,
  adaptToTokenInfo,
  convertToUsd,
  getTokenData,
  needTokenApprove,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { useTokenAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";

import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import {
  BASIS_POINTS_DIVISOR,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  DEFAULT_SLIPPAGE_AMOUNT,
  PRECISION,
  USD_DECIMALS,
} from "lib/legacy";
import { formatAmount, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { TradeMode, TradeType, getSubmitError } from "../utils";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import Tooltip from "components/Tooltip/Tooltip";
import { SLIPPAGE_BPS_KEY } from "config/localStorage";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMemo, useState } from "react";
import { TokensRatio } from "domain/synthetics/exchange";
import { HIGH_PRICE_IMPACT_BP as HIGH_PRICE_IMPACT_BPS } from "config/synthetics";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";

import "./ConfirmationBox.scss";

type Props = {
  operationType: TradeType;
  mode: TradeMode;
  fees?: TradeFees;
  executionFee?: ExecutionFee;
  selectedMarketAddress?: string;
  closeSizeUsd?: BigNumber;
  fromTokenAddress?: string;
  fromTokenAmount?: BigNumber;
  toTokenAddress?: string;
  toTokenAmount?: BigNumber;
  fromTokenPrice?: BigNumber;
  toTokenPrice?: BigNumber;
  collateralTokenAddress?: string;
  sizeDeltaUsd?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  collateralAfterFees?: BigNumber;
  collateralDeltaAmount?: BigNumber;
  entryPrice?: BigNumber;
  markPrice?: BigNumber;
  nextLiqPrice?: BigNumber;
  nextSizeUsd?: BigNumber;
  nextCollateralUsd?: BigNumber;
  nextLeverage?: BigNumber;
  acceptablePrice?: BigNumber;
  triggerPricePrefix?: string;
  triggerPrice?: BigNumber;
  receiveTokenAmount?: BigNumber;
  receiveUsd?: BigNumber;
  minOuputAmount?: BigNumber;
  receiveToken?: TokenData;
  keepLeverage?: boolean;
  triggerRatio?: TokensRatio;
  ordersData: AggregatedOrdersData;
  existingPosition?: AggregatedPositionData;
  swapPath?: string[];
  markRatio?: TokensRatio;
  setKeepLeverage: (keepLeverage: boolean) => void;
  onClose: () => void;
  onSubmitted: () => void;
};

function getSpread(fromTokenInfo, toTokenInfo, isLong, nativeTokenAddress) {
  if (fromTokenInfo && fromTokenInfo.maxPrice && toTokenInfo && toTokenInfo.minPrice) {
    const fromDiff = fromTokenInfo.maxPrice.sub(fromTokenInfo.minPrice).div(2);
    const fromSpread = fromDiff.mul(PRECISION).div(fromTokenInfo.maxPrice.add(fromTokenInfo.minPrice).div(2));
    const toDiff = toTokenInfo.maxPrice.sub(toTokenInfo.minPrice).div(2);
    const toSpread = toDiff.mul(PRECISION).div(toTokenInfo.maxPrice.add(toTokenInfo.minPrice).div(2));

    let value = fromSpread.add(toSpread);

    const fromTokenAddress = fromTokenInfo.isNative ? nativeTokenAddress : fromTokenInfo.address;
    const toTokenAddress = toTokenInfo.isNative ? nativeTokenAddress : toTokenInfo.address;

    if (isLong && fromTokenAddress === toTokenAddress) {
      value = fromSpread;
    }

    return {
      value,
      isHigh: value.gt(HIGH_SPREAD_THRESHOLD),
    };
  }
}

function formatTokensRatio(tokensData: TokensData, ratio?: TokensRatio) {
  const smallest = getTokenData(tokensData, ratio?.smallestAddress);
  const largest = getTokenData(tokensData, ratio?.largestAddress);

  if (!smallest || !largest || !ratio) return undefined;

  return `${formatAmount(ratio.ratio, USD_DECIMALS, 4)} ${smallest.symbol} / ${largest.symbol}`;
}

function isHighPriceImpact(priceImpact?: FeeItem) {
  return priceImpact?.deltaUsd.lt(0) && priceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BPS);
}

export function ConfirmationBox(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { setPendingPositionUpdate } = useSyntheticsEvents();

  const isLong = p.operationType === TradeType.Long;
  const isShort = p.operationType === TradeType.Short;
  const isSwap = p.operationType === TradeType.Swap;
  const isPosition = isLong || isShort;
  const isMarket = p.mode === TradeMode.Market;
  const isLimit = p.mode === TradeMode.Limit;
  const isTrigger = p.mode === TradeMode.Trigger;
  const isIncrease = isPosition && (isMarket || isLimit);

  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
  const referralCodeData = useUserReferralCode(library, chainId, account);

  const { tokenAllowanceData } = useTokenAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: p.fromTokenAddress ? [p.fromTokenAddress] : [],
  });

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [isLimitOrdersVisible, setIsLimitOrdersVisible] = useState(false);

  const fromToken = getTokenData(tokensData, p.fromTokenAddress);
  const toToken = getTokenData(tokensData, p.toTokenAddress);

  const fromAmount = p.fromTokenAmount;
  const fromUsd = convertToUsd(fromAmount, fromToken?.decimals, p.fromTokenPrice);

  const toAmount = p.toTokenAmount;
  const toUsd = convertToUsd(toAmount, toToken?.decimals, p.toTokenPrice);

  const market = getMarket(marketsData, p.selectedMarketAddress);

  const feesConfig = getMarketFeesConfig(marketsFeesConfigs, p.selectedMarketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

  const collateralToken = getTokenData(tokensData, p.collateralTokenAddress);

  const shouldShowPriceImpactWarning =
    isHighPriceImpact(p.fees?.swapFees?.totalPriceImpact) || isHighPriceImpact(p.fees?.positionPriceImpact);

  const fromTokenInfo = fromToken ? adaptToTokenInfo(fromToken) : undefined;
  let toTokenInfo;
  if (isSwap) {
    toTokenInfo = toToken ? adaptToTokenInfo(toToken) : undefined;
  } else {
    toTokenInfo = indexToken ? adaptToTokenInfo(indexToken) : undefined;
  }

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const positionOrders = useMemo(
    () => getPositionOrders(p.ordersData, p.selectedMarketAddress, p.collateralTokenAddress, isLong),
    [isLong, p.collateralTokenAddress, p.ordersData, p.selectedMarketAddress]
  );

  const existingLimitOrders = useMemo(
    () => positionOrders.filter((order) => isLimitOrder(order.orderType)),
    [positionOrders]
  );

  const existingTriggerOrders = useMemo(
    () => positionOrders.filter((order) => isTriggerDecreaseOrder(order.orderType)),
    [positionOrders]
  );

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    return existingTriggerOrders.filter((order) => {
      if (!order.triggerPrice) return false;

      const isTriggerAbove = isTriggerPriceAboveThreshold(order.orderType, order.isLong);

      return isTriggerAbove
        ? p.existingPosition?.markPrice?.gt(order.triggerPrice)
        : p.existingPosition?.markPrice?.lt(order.triggerPrice);
    });
  }, [existingTriggerOrders, p.existingPosition?.markPrice]);

  const spread = getSpread(fromTokenInfo, toTokenInfo, isLong, getWrappedToken(chainId).address);
  // it's meaningless for limit/stop orders to show spread based on current prices
  const showSpread = isMarket && Boolean(spread);

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const needFromTokenApproval = needTokenApprove(tokenAllowanceData, p.fromTokenAddress, p.fromTokenAmount);

  const shouldSwapPnlToCollateralToken =
    market &&
    ((isLong && market.longTokenAddress !== p.collateralTokenAddress) ||
      (isShort && market.shortTokenAddress !== p.collateralTokenAddress));

  const longShortText = isLong ? t`Long` : t`Short`;

  const getTitle = () => {
    if (isSwap) {
      return t`Confirm Swap`;
    }

    if (isIncrease && isMarket) {
      return isLong ? t`Confirm Long` : t`Confirm Short`;
    }

    if (isLimit) {
      return t`Confirm Limit Order`;
    }

    return t`Confirm Trigger Order`;
  };

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      markPrice: p.toTokenPrice,
      operationType: p.operationType,
      mode: p.mode,
      tokensData,
      fromTokenAddress: p.fromTokenAddress,
      fromTokenAmount: p.fromTokenAmount,
      toTokenAddress: p.toTokenAddress,
      swapPath: p.swapPath,
      triggerPrice: p.triggerPrice,
      swapTriggerRatio: p.triggerRatio?.ratio,
      closeSizeUsd: p.closeSizeUsd,
    });

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (!isAllowanceLoaded || !fromToken || !toToken) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (needFromTokenApproval) {
      return {
        text: t`Pending ${fromToken?.symbol} approval`,
        disabled: true,
      };
    }

    let text = "";

    if (isSwap) {
      text = t`Swap`;
    } else if (isLimit) {
      text = t`Create Limit Order`;
    } else if (isTrigger) {
      text = t`Create Trigger Order`;
    } else {
      text = isLong ? t`Long` : t`Short`;
    }

    return {
      text,
      onClick: onSubmit,
    };
  }

  function onCancelOrderClick(key: string): void {
    cancelOrdersTxn(chainId, library, { orderKeys: [key] });
  }

  function onSubmit() {
    if (!account || !p.executionFee?.feeTokenAmount) return;

    if (p.operationType === TradeType.Swap) {
      if (!p.toTokenAmount || !p.swapPath || !p.fromTokenAddress || !p.fromTokenAmount || !p.toTokenAddress) return;

      const orderType = p.mode === TradeMode.Limit ? OrderType.LimitSwap : OrderType.MarketSwap;

      if (!p.swapPath) return;

      createSwapOrderTxn(chainId, library, {
        account,
        fromTokenAddress: p.fromTokenAddress,
        fromTokenAmount: p.fromTokenAmount,
        swapPath: p.swapPath,
        toTokenAddress: p.toTokenAddress,
        executionFee: p.executionFee.feeTokenAmount,
        orderType,
        minOutputAmount: p.toTokenAmount,
        referralCode: referralCodeData?.userReferralCodeString,
        tokensData,
      }).then(p.onSubmitted);
    }

    if (isPosition) {
      if (isIncrease) {
        if (
          !p.fromTokenAddress ||
          !p.swapPath ||
          !p.selectedMarketAddress ||
          !p.fromTokenAmount ||
          !p.toTokenAddress ||
          !p.acceptablePrice
        )
          return;

        if (!market || !p.sizeDeltaUsd || !toToken?.prices) return;

        createIncreaseOrderTxn(chainId, library, {
          account,
          market: p.selectedMarketAddress,
          initialCollateralAddress: p.fromTokenAddress,
          initialCollateralAmount: p.fromTokenAmount,
          targetCollateralAddress: p.collateralTokenAddress,
          swapPath: p.swapPath,
          indexTokenAddress: p.toTokenAddress,
          sizeDeltaUsd: p.sizeDeltaUsd,
          triggerPrice: p.triggerPrice,
          acceptablePrice: p.acceptablePrice,
          priceImpactDelta: p.fees?.positionPriceImpact?.deltaUsd || BigNumber.from(0),
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          executionFee: p.executionFee.feeTokenAmount,
          isLong: p.operationType === TradeType.Long,
          orderType: p.mode === TradeMode.Limit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
          referralCode: referralCodeData?.userReferralCodeString,
          tokensData,
          setPendingPositionUpdate,
        }).then(p.onSubmitted);
      }

      if (isTrigger) {
        if (
          !p.selectedMarketAddress ||
          !indexToken ||
          !p.collateralTokenAddress ||
          !p.triggerPrice ||
          !p.markPrice ||
          !p.acceptablePrice
        )
          return;

        const orderType = getTriggerOrderType({ isLong, isTriggerAboveThreshold: p.triggerPrice.gt(p.markPrice) });

        createDecreaseOrderTxn(chainId, library, {
          account,
          market: p.selectedMarketAddress,
          indexTokenAddress: indexToken.address,
          swapPath: [],
          initialCollateralDeltaAmount: p.collateralDeltaAmount || BigNumber.from(0),
          initialCollateralAddress: p.collateralTokenAddress,
          targetCollateralAddress: p.collateralTokenAddress,
          receiveTokenAddress: p.collateralTokenAddress,
          triggerPrice: p.triggerPrice,
          priceImpactDelta: p.fees?.positionPriceImpact?.deltaUsd || BigNumber.from(0),
          acceptablePrice: p.acceptablePrice,
          sizeDeltaUsd: p.closeSizeUsd,
          orderType: orderType,
          isLong: p.operationType === TradeType.Long,
          executionFee: p.executionFee.feeTokenAmount,
          decreasePositionSwapType: shouldSwapPnlToCollateralToken
            ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
            : DecreasePositionSwapType.NoSwap,
          tokensData,
          setPendingPositionUpdate,
        });
      }
    }
  }

  const submitButtonState = getSubmitButtonState();

  function renderMain() {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            <Trans>Pay</Trans>&nbsp;
            {formatTokenAmountWithUsd(fromAmount, fromUsd, fromToken?.symbol, fromToken?.decimals)}
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            <Trans>Receive</Trans>&nbsp;{formatTokenAmountWithUsd(toAmount, toUsd, toToken?.symbol, toToken?.decimals)}
          </div>
        </div>
      );
    }

    if (isIncrease) {
      return (
        <div className="Confirmation-box-main">
          <span>
            <Trans>Pay</Trans>&nbsp;
            {formatTokenAmountWithUsd(fromAmount, fromUsd, fromToken?.symbol, fromToken?.decimals)}
          </span>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            {isLong ? t`Long` : t`Short`}&nbsp;
            {formatTokenAmountWithUsd(toAmount, toUsd, toToken?.symbol, toToken?.decimals)}
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
    if (!p.fees?.totalFees || !fromToken || !toToken) {
      return null;
    }

    const shouldShowWarning = p.fees.swapFees?.totalFee.deltaUsd.lt(0) && p.fees.swapFees.totalFee?.bps.abs().gt(600);

    if (!shouldShowWarning) {
      return null;
    }

    if (isSwap) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>
            Fees are high to swap from {fromToken.symbol} to {toToken.symbol}.
          </Trans>
        </div>
      );
    }
    if (!collateralToken) {
      return null;
    }
    return (
      <div className="Confirmation-box-warning">
        <Trans>
          Fees are high to swap from {fromToken.symbol} to {collateralToken.symbol}. <br />
          {collateralToken.symbol} is needed for collateral.
        </Trans>
      </div>
    );
  }

  function renderExecutionFee() {
    return (
      <ExchangeInfoRow label={t`Execution Fee`}>
        {formatTokenAmount(
          p.executionFee?.feeTokenAmount,
          p.executionFee?.feeToken.decimals,
          p.executionFee?.feeToken.symbol,
          { displayDecimals: 5 }
        )}
      </ExchangeInfoRow>
    );
  }

  function renderOrderItem(order: AggregatedOrderData) {
    return (
      <li key={order.key} className="font-sm">
        <p>
          {isLimitOrder(order.orderType) ? t`Increase` : t`Decrease`} {order.indexToken?.symbol}{" "}
          {order.isLong ? t`Long` : t`Short`} &nbsp;{getTriggerPricePrefix(order.orderType, order.isLong, true)}
          {formatUsd(order.triggerPrice)}{" "}
        </p>
        <button onClick={() => onCancelOrderClick(order.key)}>
          <Trans>Cancel</Trans>
        </button>
      </li>
    );
  }

  function renderExistingLimitOrdersWarning() {
    if (!existingLimitOrders?.length || !indexToken) {
      return;
    }

    if (existingLimitOrders.length === 1) {
      const order = existingLimitOrders[0];

      const sizeInTokens = order.sizeDeltaUsd.mul(PRECISION).div(order.triggerPrice!);
      const sizeText = formatTokenAmountWithUsd(
        sizeInTokens,
        order.sizeDeltaUsd,
        indexToken?.symbol,
        indexToken?.decimals
      );

      return (
        <div className="Confirmation-box-info">
          <Trans>
            You have an active Limit Order to Increase {longShortText} {sizeText} at price{" "}
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
                You have multiple existing Increase {longShortText} {indexToken.symbol} limit orders{" "}
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
    let availableLiquidity;
    let isLiquidityRisk;

    if (isSwap) {
      const swapMarket = p.swapPath?.[p.swapPath.length - 1];
      availableLiquidity = getAvailableUsdLiquidityForCollateral(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        swapMarket,
        toToken?.address
      );

      if (availableLiquidity && toUsd) {
        isLiquidityRisk = availableLiquidity.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(toUsd);
      }
    }

    if (isIncrease) {
      availableLiquidity = getAvailableUsdLiquidityForPosition(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        p.selectedMarketAddress,
        isLong
      );

      if (availableLiquidity && p.sizeDeltaUsd) {
        isLiquidityRisk = availableLiquidity.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(p.sizeDeltaUsd);
      }
    }

    const token = isSwap ? toToken : indexToken;

    if (!availableLiquidity || !token) {
      return null;
    }

    return (
      <ExchangeInfoRow label={t`Available Liquidity`}>
        <Tooltip
          position="right-bottom"
          handleClassName={isLiquidityRisk ? "negative" : ""}
          handle={formatUsd(availableLiquidity)}
          renderContent={() =>
            isLiquidityRisk
              ? t`There may not be sufficient liquidity to execute your order when the price conditions are met`
              : t`The order will only execute if the price conditions are met and there is sufficient liquidity`
          }
        />
      </ExchangeInfoRow>
    );
  }

  function renderSpreadWarning() {
    if (!isMarket) {
      return null;
    }

    if (spread && spread.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>The spread is {`>`} 1%, please ensure the trade details are acceptable before comfirming</Trans>
        </div>
      );
    }
  }

  function renderIncreaseOrderSection() {
    return (
      <>
        <div>
          {renderMain()}
          {isMarket && renderFeeWarning()}
          {renderExistingLimitOrdersWarning()}
          {renderExistingTriggerErrors()}
          {renderExistingTriggerWarning()}
          {p.executionFee?.warning && <div className="Confirmation-box-warning">{p.executionFee.warning}</div>}
          {isLimit && renderAvailableLiquidity()}
          <ExchangeInfoRow label={t`Collateral In`}>{collateralToken?.symbol}</ExchangeInfoRow>

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Leverage`}
            value={
              <ValueTransition
                from={formatLeverage(p.existingPosition?.leverage)}
                to={formatLeverage(p.nextLeverage) || "-"}
              />
            }
          />

          {p.nextLiqPrice && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Liq. Price`}
              value={<ValueTransition from={formatUsd(p.existingPosition?.liqPrice)} to={formatUsd(p.nextLiqPrice)} />}
            />
          )}

          <ExchangeInfoRow label={t`Collateral`}>
            <Tooltip
              handle={formatUsd(p.collateralAfterFees)}
              position="right-bottom"
              renderContent={() => {
                return (
                  <>
                    <Trans>Your position's collateral after deducting fees.</Trans>
                    <br />
                    <br />
                    <StatsTooltipRow label={t`Pay Amount`} value={formatUsd(fromUsd) || "-"} showDollar={false} />
                    <StatsTooltipRow
                      label={t`Fees`}
                      value={formatUsd(p.fees?.totalFees?.deltaUsd) || "-"}
                      showDollar={false}
                    />
                    <div className="Tooltip-divider" />
                    <StatsTooltipRow
                      label={t`Collateral`}
                      value={formatUsd(p.collateralAfterFees) || "-"}
                      showDollar={false}
                    />
                  </>
                );
              }}
            />
          </ExchangeInfoRow>

          {showSpread && spread && (
            <ExchangeInfoRow label={t`Spread`} isWarning={spread.isHigh} isTop={true}>
              {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}

          {isMarket && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Entry Price`}
              value={formatUsd(p.entryPrice) || "-"}
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Limit Price`}
              value={formatUsd(p.triggerPrice) || "-"}
            />
          )}

          {/* <ExchangeInfoRow label={t`Borrow Fee`}>
            {isLong && toTokenInfo && formatAmount(toTokenInfo.fundingRate, 4, 4)}
            {isShort && shortCollateralToken && formatAmount(shortCollateralToken.fundingRate, 4, 4)}
            {((isLong && toTokenInfo && toTokenInfo.fundingRate) ||
              (isShort && shortCollateralToken && shortCollateralToken.fundingRate)) &&
              "% / 1h"}
          </ExchangeInfoRow> */}

          {/* <ExchangeInfoRow label={t`Funding Fee`}>
            {isLong && toTokenInfo && formatAmount(toTokenInfo.fundingRate, 4, 4)}
            {isShort && shortCollateralToken && formatAmount(shortCollateralToken.fundingRate, 4, 4)}
            {((isLong && toTokenInfo && toTokenInfo.fundingRate) ||
              (isShort && shortCollateralToken && shortCollateralToken.fundingRate)) &&
              "% / 1h"}
          </ExchangeInfoRow> */}

          {/* {isMarket && (
            <div className="PositionEditor-allow-higher-slippage">
              <ExchangeInfoRow label={t`Execution Fee`}>
                <Tooltip
                  handle={formatTokenAmount(
                    p.executionFee?.feeTokenAmount,
                    p.executionFee?.feeToken.decimals,
                    p.executionFee?.feeToken.symbol,
                    { displayDecimals: 5 }
                  )}
                  position="right-top"
                  renderContent={() => {
                    return (
                      <>
                        <StatsTooltipRow
                          label={t`Network Fee`}
                          value={
                            formatTokenAmountWithUsd(
                              p.executionFee?.feeTokenAmount,
                              p.executionFee?.feeUsd,
                              p.executionFee?.feeToken.symbol,
                              p.executionFee?.feeToken.decimals,
                              { displayDecimals: 5 }
                            ) || "-"
                          }
                        />
                        <br />
                        <Trans>
                          This is the network cost required to execute the postion.{" "}
                          <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#execution-fee">
                            More Info
                          </ExternalLink>
                        </Trans>
                      </>
                    );
                  }}
                />
              </ExchangeInfoRow>
            </div>
          )} */}

          <ExchangeInfoRow label={t`Allowed Slippage`}>
            <Tooltip
              handle={`${formatAmount(allowedSlippage, 2, 2)}%`}
              position="right-top"
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

          {isMarket && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
                <span className="muted font-sm">
                  <Trans>Allow up to 1% slippage</Trans>
                </span>
              </Checkbox>
            </div>
          )}

          {decreaseOrdersThatWillBeExecuted?.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the trigger orders</Trans>
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
          {renderSpreadWarning()}
          {isLimit && renderAvailableLiquidity()}
          <ExchangeInfoRow label={t`Min. Receive`}>
            {formatTokenAmount(p.toTokenAmount, toTokenInfo.decimals, toTokenInfo.symbol)}
          </ExchangeInfoRow>
          <ExchangeInfoRow label={t`Price`}>{formatTokensRatio(tokensData, p.markRatio)}</ExchangeInfoRow>
          {isLimit && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Limit Price</Trans>
              </div>
              <div className="align-right">{formatTokensRatio(tokensData, p.triggerRatio)}</div>
            </div>
          )}
          {showSpread && spread && (
            <ExchangeInfoRow label={t`Spread`} isWarning={spread.isHigh}>
              {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}

          {fromToken?.prices && (
            <ExchangeInfoRow label={t`${fromToken.symbol} Price`}>
              {formatUsd(fromToken.prices.minPrice)}
            </ExchangeInfoRow>
          )}
          {toToken?.prices && (
            <ExchangeInfoRow label={t`${toToken.symbol} Price`}>{formatUsd(toToken.prices.maxPrice)}</ExchangeInfoRow>
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

          {isTrigger && p.existingPosition?.leverage && (
            <div className="Exchange-leverage-slider-settings">
              <Checkbox isChecked={p.keepLeverage} setIsChecked={p.setKeepLeverage}>
                <span className="muted font-sm">
                  <Trans>Keep leverage at {formatLeverage(p.existingPosition.leverage)} </Trans>
                </span>
              </Checkbox>
            </div>
          )}

          <ExchangeInfoRow
            label={p.existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
            value={
              p.existingPosition?.sizeInUsd ? (
                <ValueTransition from={formatUsd(p.existingPosition.sizeInUsd)!} to={formatUsd(p.nextSizeUsd)} />
              ) : p.closeSizeUsd ? (
                formatUsd(p.closeSizeUsd)
              ) : (
                "..."
              )
            }
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Collateral (${p.existingPosition?.collateralToken?.symbol})`}
              value={
                <ValueTransition
                  from={formatUsd(p.existingPosition.collateralUsd)!}
                  to={formatUsd(p.nextCollateralUsd)}
                />
              }
            />
          )}

          {!p.keepLeverage && p.existingPosition?.leverage && (
            <ExchangeInfoRow
              label={t`Leverage`}
              value={
                p.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatLeverage(p.existingPosition?.leverage)}
                    to={p.nextLeverage ? formatLeverage(p.nextLeverage) : "..."}
                  />
                ) : (
                  "..."
                )
              }
            />
          )}

          <ExchangeInfoRow label={t`Mark Price`} value={p.markPrice ? formatUsd(p.markPrice) : "..."} />

          <ExchangeInfoRow
            label={t`Trigger Price`}
            value={p.triggerPrice ? `${p.triggerPricePrefix}${formatUsd(p.triggerPrice)}` : "..."}
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`PnL`}
              value={
                <ValueTransition
                  from={formatPnl(p.existingPosition.pnl, p.existingPosition.pnlPercentage)}
                  to={formatPnl(BigNumber.from(0), BigNumber.from(0))}
                />
              }
            />
          )}

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Liq. Price`}
              value={
                p.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatUsd(p.existingPosition.liqPrice)!}
                    to={p.nextLiqPrice ? formatUsd(p.nextLiqPrice) : undefined}
                  />
                ) : (
                  "..."
                )
              }
            />
          )}

          {p.receiveToken && p.receiveTokenAmount && p.receiveUsd && (
            <ExchangeInfoRow
              label={t`Receive`}
              value={
                <span>
                  {formatTokenAmountWithUsd(
                    p.receiveTokenAmount,
                    p.receiveUsd,
                    p.receiveToken?.symbol,
                    p.receiveToken?.decimals
                  )}
                </span>
              }
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={p.onClose} label={getTitle()} allowContentTouchMove>
        {isSwap && renderSwapSection()}
        {isIncrease && renderIncreaseOrderSection()}
        {isTrigger && renderTriggerDecreaseSection()}

        {shouldShowPriceImpactWarning && (
          <div className="PositionEditor-allow-higher-slippage">
            <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
              <span className="muted font-sm">
                <Trans>I am aware of the high price impact</Trans>
              </span>
            </Checkbox>
          </div>
        )}

        <div className="App-card-divider" />

        <TradeFeesRow
          totalFees={p.fees?.totalFees}
          positionPriceImpact={p.fees?.positionPriceImpact}
          swapFees={p.fees?.swapFees}
          positionFee={p.fees?.positionFee}
          positionFeeFactor={feesConfig?.positionFeeFactor}
        />

        {renderExecutionFee()}

        <div className="App-card-divider" />

        {needFromTokenApproval && fromToken && (
          <>
            <div className="App-card-divider" />

            <div className="ConfirmationBox-approve-tokens">
              <div className="ConfirmationBox-approve-token">
                <ApproveTokenButton
                  tokenAddress={fromToken.address}
                  tokenSymbol={fromToken.symbol}
                  spenderAddress={routerAddress}
                />
              </div>
            </div>

            <div className="App-card-divider" />
          </>
        )}
        <div className="Confirmation-box-row">
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled}>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}
