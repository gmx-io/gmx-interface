import { Plural, Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { HIGH_SPREAD_THRESHOLD } from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralCode } from "domain/referrals";
import {
  ExecutionFee,
  getBorrowingFeeFactor,
  getFundingFeeFactor,
  isHighPriceImpact as getIsHighPriceImpact,
} from "domain/synthetics/fees";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import {
  getAvailableUsdLiquidityForCollateral,
  getAvailableUsdLiquidityForPosition,
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
  isTriggerDecreaseOrder,
  isTriggerPriceAboveThreshold,
} from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import { AggregatedPositionData, formatLeverage, formatPnl, getPositionKey } from "domain/synthetics/positions";
import {
  TokensRatio,
  convertToTokenAmount,
  formatTokensRatio,
  getTokenData,
  needTokenApprove,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { useTokenAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import {
  DecreasePositionTradeParams,
  IncreasePositionTradeParams,
  SwapTradeParams,
  TradeMode,
  TradeType,
  getShouldSwapPnlToCollateralToken,
} from "domain/synthetics/trade";
import { getTradeFlags } from "domain/synthetics/trade/utils/common";
import { getSpread } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatPercentage, formatTokenAmount, formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { useCallback, useMemo, useState } from "react";
import "./ConfirmationBox.scss";

type Props = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  swapParams?: SwapTradeParams;
  increasePositionParams?: IncreasePositionTradeParams;
  decreasePositionParams?: DecreasePositionTradeParams;
  markPrice?: BigNumber;
  keepLeverage?: boolean;
  markRatio?: TokensRatio;
  ordersData: AggregatedOrdersData;
  existingPosition?: AggregatedPositionData;
  executionFee?: ExecutionFee;
  isVisible: boolean;
  error?: string;
  shouldDisableValidation?: boolean;
  allowedSlippage?: number;
  isHigherSlippageAllowed?: boolean;
  isWrapOrUnwrap?: boolean;
  setIsHigherSlippageAllowed: (isHigherSlippageAllowed: boolean) => void;
  setKeepLeverage: (keepLeverage: boolean) => void;
  onClose: () => void;
  onSubmitted: () => void;
  setPendingTxns: (txns: any) => void;
};

export function ConfirmationBox(p: Props) {
  const { allowedSlippage, isHigherSlippageAllowed, setIsHigherSlippageAllowed } = p;
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const { setPendingPositionUpdate } = useSyntheticsEvents();

  const { isLong, isSwap, isMarket, isLimit, isTrigger, isIncrease } = getTradeFlags(p.tradeType, p.tradeMode);

  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const referralCodeData = useUserReferralCode(library, chainId, account);

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const [isLimitOrdersVisible, setIsLimitOrdersVisible] = useState(false);

  const tokenIn = p.swapParams?.tokenIn;
  const tokenOut = p.swapParams?.tokenOut;

  const amountIn = p.swapParams?.amountIn;
  const usdIn = p.swapParams?.usdIn;

  const amountOut = p.swapParams?.amountOut;
  const usdOut = p.swapParams?.usdOut;

  const initialCollateralToken = p.increasePositionParams?.initialCollateralToken;
  const collateralToken = p.increasePositionParams?.collateralToken || p.decreasePositionParams?.collateralToken;
  const intitialCollateralAmount = p.increasePositionParams?.initialCollateralAmount;
  const initialCollateralUsd = p.increasePositionParams?.initialCollateralUsd;

  const market = p.increasePositionParams?.market || p.decreasePositionParams?.market;
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

  const sizeDeltaUsdAfterFees = p.increasePositionParams?.sizeDeltaAfterFeesUsd;
  const sizeDeltaAfterFeesInTokens = p.increasePositionParams?.sizeDeltaAfterFeesInTokens;

  const receiveToken = p.decreasePositionParams?.receiveToken;
  const receiveAmount = p.decreasePositionParams?.receiveTokenAmount;
  const receiveUsd = p.decreasePositionParams?.receiveUsd;

  const fees = p.swapParams?.fees || p.increasePositionParams?.fees || p.decreasePositionParams?.fees;

  const shouldCheckPayTokenApproval = isSwap || isIncrease;
  const payToken = tokenIn || initialCollateralToken;
  const payAmount = p.swapParams?.amountIn || p.increasePositionParams?.initialCollateralAmount;
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { tokenAllowanceData } = useTokenAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payToken ? [payToken.address] : [],
  });
  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;
  const needPayTokenApproval = !p.isWrapOrUnwrap && needTokenApprove(tokenAllowanceData, payToken?.address, payAmount);

  const isHighPriceImpact =
    getIsHighPriceImpact(fees?.swapPriceImpact) || getIsHighPriceImpact(fees?.positionPriceImpact);

  const positionOrders = useMemo(
    () => getPositionOrders(p.ordersData, market?.marketTokenAddress, collateralToken?.address, isLong),
    [isLong, collateralToken?.address, p.ordersData, market?.marketTokenAddress]
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

  const swapSpreadInfo = useMemo(() => {
    let spread = BigNumber.from(0);

    if (isSwap && tokenIn?.prices && tokenOut?.prices) {
      const fromSpread = getSpread(tokenIn.prices);
      const toSpread = getSpread(tokenOut.prices);

      spread = fromSpread.add(toSpread);
    } else if (isIncrease && initialCollateralToken?.prices && indexToken?.prices) {
      const fromSpread = getSpread(initialCollateralToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread.add(toSpread);

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread.gt(HIGH_SPREAD_THRESHOLD);

    const showSpread = isMarket;

    return { spread, showSpread, isHigh };
  }, [indexToken, initialCollateralToken, isIncrease, isLong, isMarket, isSwap, tokenIn, tokenOut]);

  const collateralSpreadInfo = useMemo(() => {
    if (!indexToken?.prices || !collateralToken?.prices) {
      return undefined;
    }

    let totalSpread = getSpread(indexToken!.prices!);

    // TODO: convert addresses
    if (collateralToken.address === indexToken.address) {
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

  const shouldSwapPnlToCollateralToken = getShouldSwapPnlToCollateralToken({
    market,
    collateralTokenAddress: collateralToken?.address,
    isLong,
  });

  const longShortText = isLong ? t`Long` : t`Short`;

  const getTitle = () => {
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
  };

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (shouldCheckPayTokenApproval && (!isAllowanceLoaded || !payToken)) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (needPayTokenApproval) {
      return {
        text: t`Pending ${payToken?.symbol} approval`,
        disabled: true,
      };
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return {
        text: t`Confirm high price impact`,
        disabled: true,
        onClick: () => setIsHighPriceImpactAccepted(true),
      };
    }

    if (p.error) {
      return {
        text: p.error,
        disabled: p.shouldDisableValidation ? false : true,
        onClick: onSubmit,
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
      onClick: onSubmit,
    };
  }

  function onCancelOrderClick(key: string): void {
    cancelOrdersTxn(chainId, library, { orderKeys: [key], setPendingTxns: p.setPendingTxns });
  }

  function onSubmitWrapOrUnwrap() {
    if (!account || !p.swapParams || !tokenIn) {
      return;
    }

    createWrapOrUnwrapTxn(chainId, library, {
      amount: p.swapParams.amountIn,
      isWrap: Boolean(tokenIn.isNative),
      setPendingTxns: p.setPendingTxns,
    }).then(p.onSubmitted);
  }

  function onSubmitSwap() {
    if (!account || !p.swapParams || !p.swapParams.swapPathStats || !p.executionFee) {
      return;
    }

    createSwapOrderTxn(chainId, library, {
      account,
      fromTokenAddress: p.swapParams.tokenIn.address,
      fromTokenAmount: p.swapParams.amountIn,
      swapPath: p.swapParams.swapPathStats?.swapPath,
      toTokenAddress: p.swapParams.tokenOut.address,
      executionFee: p.executionFee.feeTokenAmount,
      orderType: isLimit ? OrderType.LimitSwap : OrderType.MarketSwap,
      minOutputAmount: p.swapParams.minOutputAmount,
      referralCode: referralCodeData?.userReferralCodeString,
      tokensData,
      setPendingTxns: p.setPendingTxns,
    }).then(p.onSubmitted);
  }

  function onSubmitIncreaseOrder() {
    if (
      !account ||
      !p.increasePositionParams ||
      !p.executionFee ||
      !market ||
      !p.increasePositionParams.acceptablePriceAfterSlippage
    ) {
      return;
    }

    createIncreaseOrderTxn(chainId, library, {
      account,
      marketAddress: p.increasePositionParams.market.marketTokenAddress,
      initialCollateralAddress: p.increasePositionParams.initialCollateralToken.address,
      initialCollateralAmount: p.increasePositionParams.initialCollateralAmount,
      targetCollateralAddress: p.increasePositionParams.collateralToken.address,
      swapPath: p.increasePositionParams.swapPathStats?.swapPath || [],
      indexTokenAddress: p.increasePositionParams.market.indexTokenAddress,
      sizeDeltaUsd: p.increasePositionParams.sizeDeltaUsd,
      triggerPrice: isLimit ? p.increasePositionParams.triggerPrice : undefined,
      acceptablePrice: isMarket
        ? p.increasePositionParams.acceptablePriceAfterSlippage
        : p.increasePositionParams.acceptablePrice,
      executionFee: p.executionFee.feeTokenAmount,
      isLong,
      orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
      referralCode: referralCodeData?.userReferralCodeString,
      tokensData,
      setPendingTxns: p.setPendingTxns,
    }).then(() => {
      if (isMarket && p.increasePositionParams) {
        setPendingPositionUpdate({
          isIncrease: true,
          positionKey: getPositionKey(
            account,
            p.increasePositionParams.market.marketTokenAddress,
            p.increasePositionParams.collateralToken.address,
            isLong
          )!,
          collateralDeltaAmount: p.increasePositionParams.collateralAmount,
          sizeDeltaUsd: p.increasePositionParams.sizeDeltaUsd,
          sizeDeltaInTokens: p.increasePositionParams.sizeDeltaInTokens,
        });
      }

      p.onSubmitted();
    });
  }

  function onSubmitDecreaseOrder() {
    if (
      !account ||
      !p.decreasePositionParams ||
      !p.executionFee ||
      !p.decreasePositionParams.acceptablePrice ||
      !p.decreasePositionParams.triggerPrice ||
      !p.markPrice
    ) {
      return;
    }

    const orderType = getTriggerOrderType({
      isLong,
      isTriggerAboveThreshold: p.decreasePositionParams.triggerPrice.gt(p.markPrice),
    });

    createDecreaseOrderTxn(chainId, library, {
      account,
      marketAddress: p.decreasePositionParams.market.marketTokenAddress,
      indexTokenAddress: p.decreasePositionParams.market.indexTokenAddress,
      swapPath: [],
      initialCollateralDeltaAmount: p.decreasePositionParams.collateralDeltaAmount || BigNumber.from(0),
      initialCollateralAddress: p.decreasePositionParams.collateralToken.address,
      receiveTokenAddress: p.decreasePositionParams.receiveToken.address,
      triggerPrice: p.decreasePositionParams.triggerPrice,
      acceptablePrice: p.decreasePositionParams.acceptablePrice,
      sizeDeltaUsd: p.decreasePositionParams.sizeDeltaUsd,
      orderType: orderType,
      isLong,
      executionFee: p.executionFee.feeTokenAmount,
      decreasePositionSwapType: shouldSwapPnlToCollateralToken
        ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
        : DecreasePositionSwapType.NoSwap,
      tokensData,
      setPendingTxns: p.setPendingTxns,
    }).then(p.onSubmitted);
  }

  function onSubmit() {
    if (p.isWrapOrUnwrap) {
      onSubmitWrapOrUnwrap();
      return;
    }
    if (isSwap) {
      onSubmitSwap();
      return;
    }
    if (isIncrease) {
      onSubmitIncreaseOrder();
      return;
    }
    if (isTrigger) {
      onSubmitDecreaseOrder();
      return;
    }
  }

  const submitButtonState = getSubmitButtonState();

  function renderMain() {
    if (isSwap) {
      return (
        <div className="Confirmation-box-main">
          <div>
            <Trans>Pay</Trans>&nbsp;
            {formatTokenAmountWithUsd(amountIn, usdIn, tokenIn?.symbol, tokenIn?.decimals)}
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            <Trans>Receive</Trans>&nbsp;
            {formatTokenAmountWithUsd(amountOut, usdOut, tokenOut?.symbol, tokenOut?.decimals)}
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
              intitialCollateralAmount,
              initialCollateralUsd,
              initialCollateralToken?.symbol,
              initialCollateralToken?.decimals
            )}
          </span>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            {isLong ? t`Long` : t`Short`}&nbsp;
            {formatTokenAmountWithUsd(
              sizeDeltaAfterFeesInTokens,
              sizeDeltaUsdAfterFees,
              indexToken?.symbol,
              indexToken?.decimals
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

  function renderOrderItem(order: AggregatedOrderData) {
    return (
      <li key={order.key} className="font-sm">
        <p>
          {isLimitOrder(order.orderType) ? t`Increase` : t`Decrease`} {order.indexToken?.symbol}{" "}
          {formatUsd(order.sizeDeltaUsd)} {order.isLong ? t`Long` : t`Short`} &nbsp;
          {getTriggerPricePrefix(order.orderType, order.isLong, true)}
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
    let availableLiquidityUsd: BigNumber | undefined = undefined;
    let availableLiquidityAmount: BigNumber | undefined = undefined;
    let isLiquidityRisk = false;

    if (isSwap) {
      availableLiquidityUsd = getAvailableUsdLiquidityForCollateral(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        p.swapParams?.swapPathStats?.targetMarketAddress,
        tokenOut?.address
      );

      availableLiquidityAmount = convertToTokenAmount(
        availableLiquidityUsd,
        tokenOut?.decimals,
        tokenOut?.prices?.maxPrice
      );

      if (availableLiquidityUsd && usdOut) {
        isLiquidityRisk = availableLiquidityUsd.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(usdOut);
      }
    }

    if (isIncrease) {
      availableLiquidityUsd = getAvailableUsdLiquidityForPosition(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        p.increasePositionParams?.market.marketTokenAddress,
        isLong
      );

      if (availableLiquidityUsd && p.increasePositionParams?.sizeDeltaUsd) {
        isLiquidityRisk = availableLiquidityUsd
          .mul(riskThresholdBps)
          .div(BASIS_POINTS_DIVISOR)
          .lt(p.increasePositionParams.sizeDeltaUsd);
      }
    }

    const token = isSwap ? tokenOut : indexToken;

    if (!availableLiquidityUsd || !token) {
      return null;
    }

    return (
      <ExchangeInfoRow label={t`Available Liquidity`}>
        <Tooltip
          position="right-bottom"
          handleClassName={isLiquidityRisk ? "negative" : ""}
          handle={
            isSwap
              ? formatTokenAmount(availableLiquidityAmount, token?.decimals, token?.symbol)
              : formatUsd(availableLiquidityUsd)
          }
          renderContent={() =>
            isLiquidityRisk
              ? t`There may not be sufficient liquidity to execute your order when the price conditions are met`
              : t`The order will only execute if the price conditions are met and there is sufficient liquidity`
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
    const { nextPositionValues } = p.increasePositionParams || {};

    const borrowingRate = getBorrowingFeeFactor(
      marketsFeesConfigs,
      p.increasePositionParams?.market.marketTokenAddress,
      isLong,
      60 * 60
    )?.mul(100);

    const fundigRate = getFundingFeeFactor(
      marketsFeesConfigs,
      p.increasePositionParams?.market.marketTokenAddress,
      isLong,
      60 * 60
    )?.mul(100);

    return (
      <>
        <div>
          {renderMain()}
          {renderCollateralSpreadWarning()}
          {isMarket && renderFeeWarning()}
          {renderExistingLimitOrdersWarning()}
          {renderExistingTriggerErrors()}
          {renderExistingTriggerWarning()}
          {p.executionFee?.warning && <div className="Confirmation-box-warning">{p.executionFee.warning}</div>}
          {isLimit && renderAvailableLiquidity()}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Leverage`}
            value={
              <ValueTransition
                from={formatLeverage(p.existingPosition?.leverage)}
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
                  from={formatUsd(p.existingPosition?.entryPrice)}
                  to={formatUsd(nextPositionValues?.nextEntryPrice)}
                />
              }
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              isTop
              className="SwapBox-info-row"
              label={t`Mark Price`}
              value={formatUsd(p.increasePositionParams?.entryMarkPrice) || "-"}
            />
          )}

          {isLimit && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Limit Price`}
              value={formatUsd(p.increasePositionParams?.triggerPrice) || "-"}
            />
          )}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={isMarket ? t`Price Impact` : t`Acceptable Price Impact`}
            value={
              <span className={cx({ positive: isMarket && p.increasePositionParams?.acceptablePriceImpactBps.gt(0) })}>
                {formatPercentage(p.increasePositionParams?.acceptablePriceImpactBps.mul(isMarket ? 1 : -1)) || "-"}
              </span>
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price`}
            value={formatUsd(p.increasePositionParams?.acceptablePrice) || "-"}
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              <ValueTransition
                from={formatUsd(p.existingPosition?.liqPrice)}
                to={formatUsd(nextPositionValues?.nextLiqPrice) || "-"}
              />
            }
          />

          <ExchangeInfoRow label={t`Collateral (${collateralToken?.symbol})`} isTop>
            <Tooltip
              handle={formatUsd(p.increasePositionParams?.collateralUsdAfterFees)}
              position="right-top"
              renderContent={() => {
                return (
                  <>
                    <Trans>Your position's collateral after deducting fees.</Trans>
                    <br />
                    <br />
                    <StatsTooltipRow
                      label={t`Pay Amount`}
                      value={formatUsd(p.increasePositionParams?.initialCollateralUsd) || "-"}
                      showDollar={false}
                    />
                    <StatsTooltipRow
                      label={t`Fees`}
                      value={
                        fees?.totalFees?.deltaUsd && !fees.totalFees.deltaUsd.eq(0)
                          ? `${fees.totalFees.deltaUsd.gt(0) ? "+" : "-"}${formatUsd(fees.totalFees.deltaUsd.abs())}`
                          : "0.00$"
                      }
                      showDollar={false}
                    />
                    <div className="Tooltip-divider" />
                    <StatsTooltipRow
                      label={t`Collateral`}
                      value={formatUsd(p.increasePositionParams?.collateralUsdAfterFees) || "-"}
                      showDollar={false}
                    />
                  </>
                );
              }}
            />
          </ExchangeInfoRow>

          <TradeFeesRow
            totalTradeFees={fees?.totalFees}
            swapFees={fees?.swapFees}
            positionFee={fees?.positionFee}
            positionPriceImpact={fees?.positionPriceImpact}
            swapPriceImpact={fees?.swapPriceImpact}
            fundingFeeRateStr={
              fundigRate && `${fundigRate.gt(0) ? "+" : "-"}${formatAmount(fundigRate.abs(), 30, 4)}% / 1h`
            }
            borrowFeeRateStr={borrowingRate && `-${formatAmount(borrowingRate, 30, 4)}% / 1h`}
            executionFee={p.executionFee}
            feesType="open"
          />

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
                  <Trans>I am aware of the high price impact</Trans>
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
            {formatTokensRatio(tokenIn, tokenOut, p.markRatio)}
          </ExchangeInfoRow>
          {isLimit && (
            <ExchangeInfoRow label={t`Limit Price`}>
              {formatTokensRatio(tokenIn, tokenOut, p.swapParams?.triggerRatio)}
            </ExchangeInfoRow>
          )}
          {tokenIn?.prices && (
            <ExchangeInfoRow label={t`${tokenIn.symbol} Price`}>{formatUsd(tokenIn.prices.minPrice)}</ExchangeInfoRow>
          )}
          {tokenOut?.prices && (
            <ExchangeInfoRow label={t`${tokenOut.symbol} Price`}>{formatUsd(tokenOut.prices.maxPrice)}</ExchangeInfoRow>
          )}
          {!p.isWrapOrUnwrap && (
            <TradeFeesRow
              isTop
              totalTradeFees={fees?.totalFees}
              swapFees={fees?.swapFees}
              swapPriceImpact={fees?.swapPriceImpact}
              executionFee={p.executionFee}
              feesType="swap"
            />
          )}
          <ExchangeInfoRow label={t`Min. Receive`} isTop>
            {formatTokenAmount(p.swapParams?.amountOut, tokenOut?.decimals, tokenOut?.symbol)}
          </ExchangeInfoRow>

          {isHighPriceImpact && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the high price impact</Trans>
                </span>
              </Checkbox>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderTriggerDecreaseSection() {
    const { nextPositionValues, sizeDeltaUsd, triggerPrice, triggerPricePrefix } = p.decreasePositionParams || {};

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
                <ValueTransition
                  from={formatUsd(p.existingPosition.sizeInUsd)!}
                  to={formatUsd(nextPositionValues?.nextSizeUsd)}
                />
              ) : sizeDeltaUsd ? (
                formatUsd(sizeDeltaUsd)
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
                  from={formatUsd(p.existingPosition.collateralUsd)!}
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

          <ExchangeInfoRow isTop label={t`Mark Price`} value={p.markPrice ? formatUsd(p.markPrice) : "..."} />

          <ExchangeInfoRow
            label={t`Trigger Price`}
            value={triggerPrice ? `${triggerPricePrefix}${formatUsd(triggerPrice)}` : "..."}
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price Impact`}
            value={formatPercentage(p.decreasePositionParams?.acceptablePriceImpactBps.mul(-1)) || "-"}
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price`}
            value={formatUsd(p.decreasePositionParams?.acceptablePrice) || "-"}
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Liq. Price`}
              value={
                nextPositionValues?.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={formatUsd(p.existingPosition.liqPrice)!}
                    to={formatUsd(nextPositionValues.nextLiqPrice)}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}

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

          <TradeFeesRow
            isTop
            totalTradeFees={fees?.totalFees}
            positionPriceImpact={fees?.positionPriceImpact}
            swapPriceImpact={fees?.swapPriceImpact}
            swapFees={fees?.swapFees}
            positionFee={fees?.positionFee}
            borrowFee={fees?.borrowFee}
            fundingFee={fees?.fundingFee}
            executionFee={p.executionFee}
            feesType="close"
          />

          {receiveToken && receiveAmount && receiveUsd && (
            <ExchangeInfoRow
              label={t`Receive`}
              value={formatTokenAmountWithUsd(receiveAmount, receiveUsd, receiveToken?.symbol, receiveToken?.decimals)}
            />
          )}

          {isHighPriceImpact && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
                <span className="muted font-sm">
                  <Trans>I am aware of the high price impact</Trans>
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
      <Modal isVisible={p.isVisible} setIsVisible={p.onClose} label={getTitle()} allowContentTouchMove>
        {p.isVisible && (
          <>
            {isSwap && renderSwapSection()}
            {isIncrease && renderIncreaseOrderSection()}
            {isTrigger && renderTriggerDecreaseSection()}

            {needPayTokenApproval && payToken && (
              <>
                <div className="App-card-divider" />

                <div className="ConfirmationBox-approve-tokens">
                  <div className="ConfirmationBox-approve-token">
                    <ApproveTokenButton
                      tokenAddress={payToken.address}
                      tokenSymbol={payToken.symbol}
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
          </>
        )}
      </Modal>
    </div>
  );
}
