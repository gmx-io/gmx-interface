import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BsArrowRight } from "react-icons/bs";

import PositionRouter from "abis/PositionRouter.json";
import Button from "components/Button/Button";
import SlippageInput from "components/SlippageInput/SlippageInput";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { ARBITRUM, IS_NETWORK_DISABLED, getChainName, getConstant } from "config/chains";
import { getContract } from "config/contracts";
import { CLOSE_POSITION_RECEIVE_TOKEN_KEY, SLIPPAGE_BPS_KEY } from "config/localStorage";
import { getPriceDecimals, getV1Tokens, getWrappedToken } from "config/tokens";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { createDecreaseOrder, useHasOutdatedUi } from "domain/legacy";
import { getTokenAmountFromUsd } from "domain/tokens";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { callContract } from "lib/contracts";
import {
  DECREASE,
  DUST_USD,
  MARKET,
  MIN_PROFIT_TIME,
  PRECISION,
  STOP,
  USDG_DECIMALS,
  USD_DECIMALS,
  adjustForDecimals,
  calculatePositionDelta,
  getDeltaStr,
  getMarginFee,
  getNextToAmount,
  getProfitPrice,
  isAddressZero,
} from "lib/legacy";
import { DEFAULT_HIGHER_SLIPPAGE_AMOUNT, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE, MAX_LEVERAGE } from "config/factors";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import {
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  formatPercentage,
  parseValue,
} from "lib/numbers";
import { getLeverage } from "lib/positions/getLeverage";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { usePrevious } from "lib/usePrevious";
import Checkbox from "../Checkbox/Checkbox";
import Modal from "../Modal/Modal";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import Tab from "../Tab/Tab";
import Tooltip from "../Tooltip/Tooltip";
import ExchangeInfoRow from "./ExchangeInfoRow";
import FeesTooltip from "./FeesTooltip";
import "./PositionSeller.css";
import { ErrorCode, ErrorDisplayType } from "./constants";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";

const { AddressZero } = ethers.constants;
const ORDER_SIZE_DUST_USD = expandDecimals(1, USD_DECIMALS - 1); // $0.10

const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS).div(100); // 1%;

function applySpread(amount, spread) {
  if (!amount || !spread) {
    return amount;
  }
  return amount.sub(amount.mul(spread).div(PRECISION));
}

/*
 This function replicates the backend logic of calculating Next Collateral and Receive Amount based on
 Collateral Delta, Realized PnL and Fees for the position

 The backend logic can be found in reduceCollateral function at
 https://github.com/gmx-io/gmx-contracts/blob/master/contracts/core/Vault.sol#L992
*/

function calculateNextCollateralAndReceiveUsd(
  collateral,
  hasProfit,
  isClosing,
  adjustedDelta,
  collateralDelta,
  totalFees
) {
  let nextCollateral;
  let receiveUsd = bigNumberify(0);

  if (collateral) {
    nextCollateral = collateral;

    if (hasProfit) {
      receiveUsd = receiveUsd.add(adjustedDelta);
    } else {
      nextCollateral = nextCollateral.sub(adjustedDelta);
    }

    if (collateralDelta && collateralDelta.gt(0)) {
      receiveUsd = receiveUsd.add(collateralDelta);
      nextCollateral = nextCollateral.sub(collateralDelta);
    }
    if (isClosing) {
      receiveUsd = receiveUsd.add(nextCollateral);
      nextCollateral = bigNumberify(0);
    }
    if (receiveUsd.gt(totalFees)) {
      receiveUsd = receiveUsd.sub(totalFees);
    } else {
      nextCollateral = nextCollateral.sub(totalFees);
    }
  }

  return { nextCollateral, receiveUsd };
}

function shouldSwap(collateralToken, receiveToken) {
  // If position collateral is WETH in contract, then position.collateralToken is { symbol: “ETH”, isNative: true, … }
  // @see https://github.com/gmx-io/gmx-interface/blob/master/src/pages/Exchange/Exchange.js#L162
  // meaning if collateralToken.isNative === true in reality position has WETH as a collateral
  // and if collateralToken.isNative === true and receiveToken.isNative === true then position’s WETH will be unwrapped and user will receive native ETH
  const isCollateralWrapped = collateralToken.isNative;

  const isSameToken =
    collateralToken.address === receiveToken.address || (isCollateralWrapped && receiveToken.isWrapped);

  const isUnwrap = isCollateralWrapped && receiveToken.isNative;

  return !isSameToken && !isUnwrap;
}

function getSwapLimits(infoTokens, fromTokenAddress, toTokenAddress) {
  const fromInfo = getTokenInfo(infoTokens, fromTokenAddress);
  const toInfo = getTokenInfo(infoTokens, toTokenAddress);

  let maxInUsd;
  let maxIn;
  let maxOut;
  let maxOutUsd;

  if (!fromInfo?.maxUsdgAmount) {
    maxInUsd = bigNumberify(0);
    maxIn = bigNumberify(0);
  } else {
    maxInUsd = fromInfo.maxUsdgAmount
      .sub(fromInfo.usdgAmount)
      .mul(expandDecimals(1, USD_DECIMALS))
      .div(expandDecimals(1, USDG_DECIMALS));

    maxIn = maxInUsd.mul(expandDecimals(1, fromInfo.decimals)).div(fromInfo.maxPrice).toString();
  }

  if (!toInfo?.poolAmount || !toInfo?.bufferAmount) {
    maxOut = bigNumberify(0);
    maxOutUsd = bigNumberify(0);
  } else {
    maxOut = toInfo.availableAmount.gt(toInfo.poolAmount.sub(toInfo.bufferAmount))
      ? toInfo.poolAmount.sub(toInfo.bufferAmount)
      : toInfo.availableAmount;

    maxOutUsd = getUsd(maxOut, toInfo.address, false, infoTokens);
  }

  return {
    maxIn,
    maxInUsd,
    maxOut,
    maxOutUsd,
  };
}

export default function PositionSeller(props) {
  const {
    pendingPositions,
    setPendingPositions,
    positionsMap,
    positionKey,
    isVisible,
    setIsVisible,
    account,
    library,
    infoTokens,
    setPendingTxns,
    flagOrdersEnabled,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders,
    isWaitingForPluginApproval,
    isPluginApproving,
    orderBookApproved,
    setOrdersToaOpen,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    isHigherSlippageAllowed,
    minExecutionFee,
    minExecutionFeeErrorMessage,
    usdgSupply,
    totalTokenWeights,
    isContractAccount,
  } = props;
  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, "Exchange-keep-leverage"], true);
  const position = positionsMap && positionKey ? positionsMap[positionKey] : undefined;
  const [fromValue, setFromValue] = useState("");
  const [isProfitWarningAccepted, setIsProfitWarningAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevIsVisible = usePrevious(isVisible);
  const [allowedSlippage, setAllowedSlippage] = useState(savedSlippageAmount);
  const positionPriceDecimal = getPriceDecimals(chainId, position?.indexToken?.symbol);

  useEffect(() => {
    setAllowedSlippage(savedSlippageAmount);
    if (isHigherSlippageAllowed) {
      setAllowedSlippage(DEFAULT_HIGHER_SLIPPAGE_AMOUNT);
    }
  }, [savedSlippageAmount, isHigherSlippageAllowed]);

  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const longOrShortText = position?.isLong ? t`Long` : t`Short`;

  const toTokens = isContractAccount ? getV1Tokens(chainId).filter((t) => !t.isNative) : getV1Tokens(chainId);
  const wrappedToken = getWrappedToken(chainId);

  const [savedRecieveTokenAddress, setSavedRecieveTokenAddress] = useLocalStorageByChainId(
    chainId,
    `${CLOSE_POSITION_RECEIVE_TOKEN_KEY}-${position.indexToken.symbol}-${position?.isLong ? "long" : "short"}`
  );

  const [swapToToken, setSwapToToken] = useState(() =>
    savedRecieveTokenAddress ? toTokens.find((token) => token.address === savedRecieveTokenAddress) : undefined
  );

  const ORDER_OPTIONS = [MARKET, STOP];
  const ORDER_OPTION_LABELS = {
    [MARKET]: t`Market`,
    [STOP]: t`Trigger`,
  };
  let [orderOption, setOrderOption] = useState(MARKET);

  if (!flagOrdersEnabled) {
    orderOption = MARKET;
  }

  const needPositionRouterApproval = !positionRouterApproved && orderOption === MARKET;

  const onOrderOptionChange = (option) => {
    setOrderOption(option);
  };

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };

  const [triggerPriceValue, setTriggerPriceValue] = useState("");
  const triggerPriceUsd = orderOption === MARKET ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);

  const [nextDelta, nextHasProfit = bigNumberify(0)] = useMemo(() => {
    if (!position) {
      return [bigNumberify(0), false];
    }

    if (orderOption !== STOP) {
      return [position.delta, position.hasProfit, position.deltaPercentage];
    }

    if (!triggerPriceUsd) {
      return [bigNumberify(0), false];
    }

    const { delta, hasProfit, deltaPercentage } = calculatePositionDelta(triggerPriceUsd, position);
    return [delta, hasProfit, deltaPercentage];
  }, [position, orderOption, triggerPriceUsd]);

  const existingOrders = useMemo(() => {
    if (orderOption === STOP && (!triggerPriceUsd || triggerPriceUsd.eq(0))) {
      return [];
    }
    if (!orders || !position) {
      return [];
    }

    const ret = [];
    for (const order of orders) {
      // only Stop orders can't be executed without corresponding opened position
      if (order.type !== DECREASE) continue;

      // if user creates Stop-Loss we need only Stop-Loss orders and vice versa
      if (orderOption === STOP) {
        const triggerAboveThreshold = triggerPriceUsd.gt(position.markPrice);
        if (triggerAboveThreshold !== order.triggerAboveThreshold) continue;
      }

      const sameToken =
        order.indexToken === nativeTokenAddress
          ? position.indexToken.isNative
          : order.indexToken === position.indexToken.address;
      if (order.isLong === position.isLong && sameToken) {
        ret.push(order);
      }
    }
    return ret;
  }, [position, orders, triggerPriceUsd, orderOption, nativeTokenAddress]);

  const existingOrder = existingOrders[0];

  const needOrderBookApproval = orderOption === STOP && !orderBookApproved;

  const isSwapAllowed = orderOption === MARKET;

  const { data: hasOutdatedUi } = useHasOutdatedUi();

  let receiveToken;
  let maxAmount;
  let maxAmountFormatted;
  let maxAmountFormattedFree;
  let fromAmount;

  let convertedAmount;
  let convertedAmountFormatted;

  let nextLeverage;
  let nextLeverageWithoutDelta;
  let liquidationPrice;
  let nextLiquidationPrice;
  let isClosing;
  let sizeDelta;
  let leverageWithoutDelta;

  let nextCollateral;
  let collateralDelta = bigNumberify(0);
  let receiveUsd = bigNumberify(0);
  let receiveAmount = bigNumberify(0);
  let adjustedDelta = bigNumberify(0);

  let isNotEnoughReceiveTokenLiquidity;
  let isCollateralPoolCapacityExceeded;
  let isKeepLeverageNotPossible;

  let title;
  let fundingFee;
  let positionFee;
  let swapFee;
  let totalFees = bigNumberify(0);

  useEffect(() => {
    if (isSwapAllowed && isContractAccount && isAddressZero(receiveToken.address)) {
      setSwapToToken(wrappedToken);
      setSavedRecieveTokenAddress(wrappedToken.address);
    }
  }, [
    isContractAccount,
    isSwapAllowed,
    nativeTokenSymbol,
    receiveToken?.address,
    wrappedToken,
    setSavedRecieveTokenAddress,
  ]);

  let executionFee = orderOption === STOP ? getConstant(chainId, "DECREASE_ORDER_EXECUTION_GAS_FEE") : minExecutionFee;
  let executionFeeUsd = getUsd(executionFee, nativeTokenAddress, false, infoTokens) || bigNumberify(0);

  const collateralToken = position.collateralToken;
  const collateralTokenInfo = getTokenInfo(infoTokens, collateralToken.address);

  if (position) {
    fundingFee = position.fundingFee;
    fromAmount = parseValue(fromValue, USD_DECIMALS);
    sizeDelta = fromAmount;

    title = t`Close ${longOrShortText} ${position.indexToken.symbol}`;
    liquidationPrice = getLiquidationPrice({
      size: position.size,
      collateral: position.collateral,
      averagePrice: position.averagePrice,
      isLong: position.isLong,
      fundingFee: position.fundingFee,
    });

    leverageWithoutDelta = getLeverage({
      size: position.size,
      collateral: position.collateral,
      fundingFee: fundingFee,
    });

    // Initializing next leverage to the current leverage to start with
    nextLeverage = position.leverage;
    nextLeverageWithoutDelta = leverageWithoutDelta;

    if (fromAmount) {
      isClosing = position.size.sub(fromAmount).lt(DUST_USD);
      positionFee = getMarginFee(fromAmount);
    }

    if (isClosing) {
      sizeDelta = position.size;
    } else if (orderOption === STOP && sizeDelta && existingOrders.length > 0) {
      let residualSize = position.size;
      for (const order of existingOrders) {
        residualSize = residualSize.sub(order.sizeDelta);
      }
      if (residualSize.sub(sizeDelta).abs().lt(ORDER_SIZE_DUST_USD)) {
        sizeDelta = residualSize;
      }
    }

    totalFees = totalFees.add(positionFee || bigNumberify(0)).add(fundingFee || bigNumberify(0));

    if (sizeDelta && position.size.gt(0)) {
      adjustedDelta = nextDelta.mul(sizeDelta).div(position.size);
    }

    if (keepLeverage && sizeDelta && !isClosing) {
      // Calculating the collateralDelta needed to keep the next leverage same as current leverage
      collateralDelta = position.collateral.sub(
        position.size.sub(sizeDelta).mul(BASIS_POINTS_DIVISOR).div(leverageWithoutDelta)
      );

      /*
       In the backend nextCollateral is determined based on not just collateralDelta we pass but also whether
       a position has profit or loss and how much fees it has. The following logic counters the backend logic
       and determines the exact collateralDelta to be passed so that ultimately the nextCollateral value
       generated will keep leverage the same.
       
       The backend logic can be found in reduceCollateral function at
       https://github.com/gmx-io/gmx-contracts/blob/master/contracts/core/Vault.sol#L992
      */

      if (nextHasProfit) {
        if (collateralDelta.add(adjustedDelta).lte(totalFees)) {
          collateralDelta = bigNumberify(0);
          // Keep Leverage is not possible
          isKeepLeverageNotPossible = true;
        }
      } else {
        if (collateralDelta.sub(adjustedDelta).gt(totalFees)) {
          collateralDelta = collateralDelta.sub(adjustedDelta);
        } else {
          collateralDelta = bigNumberify(0);
          // Keep leverage the same is not possible
          isKeepLeverageNotPossible = true;
        }
      }
    }

    ({ receiveUsd, nextCollateral } = calculateNextCollateralAndReceiveUsd(
      position.collateral,
      nextHasProfit,
      isClosing,
      adjustedDelta,
      collateralDelta,
      totalFees
    ));

    maxAmount = position.size;
    maxAmountFormatted = formatAmount(maxAmount, USD_DECIMALS, 2, true);
    maxAmountFormattedFree = formatAmountFree(maxAmount, USD_DECIMALS, 2);

    if (fromAmount && collateralToken.maxPrice) {
      convertedAmount = fromAmount.mul(expandDecimals(1, collateralToken.decimals)).div(collateralToken.maxPrice);
      convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true);
    }

    receiveUsd = applySpread(receiveUsd, collateralTokenInfo?.spread);
    receiveToken = isSwapAllowed && swapToToken ? swapToToken : collateralToken;

    if (isSwapAllowed && isContractAccount && isAddressZero(receiveToken.address)) {
      receiveToken = wrappedToken;
    }

    // Calculate swap fees
    if (isSwapAllowed && swapToToken) {
      const { feeBasisPoints } = getNextToAmount(
        chainId,
        convertedAmount,
        collateralToken.address,
        receiveToken.address,
        infoTokens,
        undefined,
        undefined,
        usdgSupply,
        totalTokenWeights,
        true
      );

      if (feeBasisPoints) {
        swapFee = receiveUsd.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
        totalFees = totalFees.add(swapFee || bigNumberify(0));
        receiveUsd = receiveUsd.sub(swapFee);
      }
      const swapToTokenInfo = getTokenInfo(infoTokens, swapToToken.address);
      receiveUsd = applySpread(receiveUsd, swapToTokenInfo?.spread);
    }

    // For Shorts trigger orders the collateral is a stable coin, it should not depend on the triggerPrice
    if (orderOption === STOP && position.isLong) {
      receiveAmount = getTokenAmountFromUsd(infoTokens, receiveToken.address, receiveUsd, {
        overridePrice: triggerPriceUsd,
      });
    } else {
      receiveAmount = getTokenAmountFromUsd(infoTokens, receiveToken.address, receiveUsd);
    }

    // Check swap limits (max in / max out)
    if (isSwapAllowed && shouldSwap(collateralToken, receiveToken)) {
      const collateralInfo = getTokenInfo(infoTokens, collateralToken.address);
      const receiveTokenInfo = getTokenInfo(infoTokens, receiveToken.address);

      isNotEnoughReceiveTokenLiquidity =
        receiveTokenInfo.availableAmount.lt(receiveAmount) ||
        receiveTokenInfo.bufferAmount.gt(receiveTokenInfo.poolAmount.sub(receiveAmount));

      if (
        collateralInfo.maxUsdgAmount &&
        collateralInfo.maxUsdgAmount.gt(0) &&
        collateralInfo.usdgAmount &&
        collateralInfo.maxPrice
      ) {
        const usdgFromAmount = adjustForDecimals(receiveUsd, USD_DECIMALS, USDG_DECIMALS);
        const nextUsdgAmount = collateralInfo.usdgAmount.add(usdgFromAmount);

        if (nextUsdgAmount.gt(collateralInfo.maxUsdgAmount)) {
          isCollateralPoolCapacityExceeded = true;
        }
      }
    }

    if (fromAmount) {
      if (!isClosing) {
        nextLiquidationPrice = getLiquidationPrice({
          size: position.size.sub(sizeDelta),
          collateral: nextCollateral,
          averagePrice: position.averagePrice,
          isLong: position.isLong,
        });

        if (!keepLeverage) {
          // We need to send the remaining delta
          const remainingDelta = nextDelta?.sub(adjustedDelta);
          nextLeverage = getLeverage({
            size: position.size.sub(sizeDelta),
            collateral: nextCollateral,
            hasProfit: nextHasProfit,
            delta: remainingDelta,
            includeDelta: savedIsPnlInLeverage,
          });

          nextLeverageWithoutDelta = getLeverage({
            size: position.size.sub(sizeDelta),
            collateral: nextCollateral,
            hasProfit: nextHasProfit,
            delta: remainingDelta,
            includeDelta: false,
          });
        }
      }
    }
  }

  const [deltaStr, deltaPercentageStr] = useMemo(() => {
    if (!position || !position.markPrice || position.collateral.eq(0)) {
      return ["-", "-"];
    }
    if (orderOption !== STOP) {
      const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(
        position.markPrice,
        position,
        fromAmount
      );
      const { deltaStr, deltaPercentageStr } = getDeltaStr({
        delta: pendingDelta,
        deltaPercentage: pendingDeltaPercentage,
        hasProfit,
      });
      return [deltaStr, deltaPercentageStr];
    }
    if (!triggerPriceUsd || triggerPriceUsd.eq(0)) {
      return ["-", "-"];
    }

    const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(
      triggerPriceUsd,
      position,
      fromAmount
    );

    const { deltaStr, deltaPercentageStr } = getDeltaStr({
      delta: pendingDelta,
      deltaPercentage: pendingDeltaPercentage,
      hasProfit,
    });
    return [deltaStr, deltaPercentageStr];
  }, [position, triggerPriceUsd, orderOption, fromAmount]);

  const getError = () => {
    if (isSwapAllowed && isContractAccount && isAddressZero(receiveToken?.address)) {
      return [t`${nativeTokenSymbol} can not be sent to smart contract addresses. Select another token.`];
    }
    if (IS_NETWORK_DISABLED[chainId]) {
      if (orderOption === STOP) return [t`Trigger order disabled, pending ${getChainName(chainId)} upgrade`];
      return [t`Position close disabled, pending ${getChainName(chainId)} upgrade`];
    }
    if (hasOutdatedUi) {
      return [t`Page outdated, please refresh`];
    }
    if (!fromAmount) {
      return [t`Enter an amount`];
    }
    if (nextLeverage && nextLeverage.eq(0)) {
      return [t`Enter an amount`];
    }
    if (orderOption === STOP) {
      if (!triggerPriceUsd || triggerPriceUsd.eq(0)) {
        return [t`Enter Price`];
      }
      if (position.isLong && triggerPriceUsd.lte(liquidationPrice)) {
        return [t`Price below Liq. Price`];
      }
      if (!position.isLong && triggerPriceUsd.gte(liquidationPrice)) {
        return [t`Price above Liq. Price`];
      }

      if (profitPrice && nextDelta.eq(0) && nextHasProfit) {
        return [t`Invalid price, see warning`];
      }
    }

    if (isNotEnoughReceiveTokenLiquidity) {
      return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientReceiveToken];
    }

    if (
      !isClosing &&
      keepLeverage &&
      (leverageWithoutDelta?.lt(0) || leverageWithoutDelta?.gt(100 * BASIS_POINTS_DIVISOR))
    ) {
      return [t`Fees are higher than Collateral`, ErrorDisplayType.Tooltip, ErrorCode.FeesHigherThanCollateral];
    }

    if (!isClosing && keepLeverage && isKeepLeverageNotPossible) {
      return [t`Keep Leverage is not possible`, ErrorDisplayType.Tooltip, ErrorCode.KeepLeverageNotPossible];
    }

    if (!isClosing && nextCollateral?.lt(0)) {
      return [t`Realized PnL insufficient for Fees`, ErrorDisplayType.Tooltip, ErrorCode.NegativeNextCollateral];
    }

    if (isCollateralPoolCapacityExceeded) {
      return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.ReceiveCollateralTokenOnly];
    }

    if (!isClosing && position && position.size && fromAmount) {
      if (position.size.sub(fromAmount).lt(expandDecimals(10, USD_DECIMALS))) {
        return [t`Leftover position below 10 USD`];
      }
      if (nextCollateral && nextCollateral.lt(expandDecimals(5, USD_DECIMALS))) {
        return [t`Leftover collateral below 5 USD`];
      }
    }

    if (position && position.size && position.size.lt(fromAmount)) {
      return [t`Max close amount exceeded`];
    }

    if (!isClosing && nextLeverage && nextLeverage.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return [t`Min leverage: 1.1x`];
    }

    if (!isClosing && nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
      return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    if (!isClosing && nextLeverageWithoutDelta && nextLeverageWithoutDelta.gt(MAX_LEVERAGE)) {
      return [t`Max Leverage without PnL: 100x`];
    }

    if (position.isLong) {
      if (!isClosing && nextLiquidationPrice && nextLiquidationPrice.gt(position.markPrice)) {
        return [t`Invalid Liquidation Price`];
      }
    } else {
      if (!isClosing && nextLiquidationPrice && nextLiquidationPrice.lt(position.markPrice)) {
        return [t`Invalid Liquidation Price`];
      }
    }

    return [false];
  };

  const isPrimaryEnabled = () => {
    const [error] = getError();
    if (error) {
      return false;
    }
    if (isSubmitting) {
      return false;
    }
    if (needOrderBookApproval && isWaitingForPluginApproval) {
      return false;
    }
    if (isPluginApproving) {
      return false;
    }
    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return false;
    }
    if (isPositionRouterApproving) {
      return false;
    }

    return true;
  };

  const hasPendingProfit = MIN_PROFIT_TIME > 0 && position.delta.eq(0) && position.pendingDelta.gt(0);

  const getPrimaryText = () => {
    const [error] = getError();
    if (error) {
      return error;
    }

    if (orderOption === STOP) {
      if (isSubmitting) return t`Creating Order...`;

      if (needOrderBookApproval && isWaitingForPluginApproval) {
        return t`Enabling Orders...`;
      }
      if (isPluginApproving) {
        return t`Enabling Orders...`;
      }
      if (needOrderBookApproval) {
        return t`Enable Orders`;
      }

      return t`Create Order`;
    }

    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return t`Enabling Leverage...`;
    }

    if (isPositionRouterApproving) {
      return t`Enabling Leverage...`;
    }

    if (needPositionRouterApproval) {
      return t`Enable Leverage`;
    }

    if (hasPendingProfit) {
      return t`Close without profit`;
    }
    return isSubmitting ? t`Closing...` : t`Close`;
  };

  const resetForm = () => {
    setFromValue("");
    setIsProfitWarningAccepted(false);
  };

  useEffect(() => {
    if (prevIsVisible !== isVisible) {
      resetForm();
    }
  }, [prevIsVisible, isVisible]);

  const receiveSpreadInfo = useMemo(() => {
    if (!collateralTokenInfo || !infoTokens) {
      return null;
    }

    if (!swapToToken || swapToToken.address === collateralTokenInfo.address) {
      return {
        value: collateralTokenInfo.spread,
        isHigh: collateralTokenInfo.spread.gt(HIGH_SPREAD_THRESHOLD),
      };
    }

    const swapToTokenInfo = getTokenInfo(infoTokens, swapToToken.address);
    const spread = collateralTokenInfo.spread.add(swapToTokenInfo.spread);
    return {
      value: spread,
      isHigh: spread.gt(HIGH_SPREAD_THRESHOLD),
    };
  }, [swapToToken, infoTokens, collateralTokenInfo]);
  const showReceiveSpread = receiveSpreadInfo && receiveSpreadInfo.value.gt(0);

  const renderReceiveSpreadWarning = useCallback(() => {
    if (receiveSpreadInfo && receiveSpreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>
            Transacting with a depegged stable coin is subject to spreads reflecting the worse of current market price
            or $1.00, with transactions involving multiple stablecoins may have multiple spreads.
          </Trans>
        </div>
      );
    }
  }, [receiveSpreadInfo]);

  const onClickPrimary = async () => {
    if (needOrderBookApproval) {
      setOrdersToaOpen(true);
      return;
    }

    if (needPositionRouterApproval) {
      approvePositionRouter({
        sentMsg: t`Enable leverage sent.`,
        failMsg: t`Enable leverage failed.`,
      });
      return;
    }

    setIsSubmitting(true);

    const collateralTokenAddress = position.collateralToken.isNative
      ? nativeTokenAddress
      : position.collateralToken.address;
    const indexTokenAddress = position.indexToken.isNative ? nativeTokenAddress : position.indexToken.address;

    if (orderOption === STOP) {
      const triggerAboveThreshold = triggerPriceUsd.gt(position.markPrice);

      createDecreaseOrder(
        chainId,
        library,
        indexTokenAddress,
        sizeDelta,
        collateralTokenAddress,
        collateralDelta,
        position.isLong,
        triggerPriceUsd,
        triggerAboveThreshold,
        {
          sentMsg: t`Order submitted!`,
          successMsg: t`Order created!`,
          failMsg: t`Order creation failed.`,
          setPendingTxns,
        }
      )
        .then(() => {
          setFromValue("");
          setIsVisible(false);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
      return;
    }

    const priceBasisPoints = position.isLong
      ? BASIS_POINTS_DIVISOR - allowedSlippage
      : BASIS_POINTS_DIVISOR + allowedSlippage;
    const refPrice = position.isLong ? position.indexToken.minPrice : position.indexToken.maxPrice;
    let priceLimit = refPrice.mul(priceBasisPoints).div(BASIS_POINTS_DIVISOR);
    const minProfitExpiration = position.lastIncreasedTime + MIN_PROFIT_TIME;
    const minProfitTimeExpired = parseInt(Date.now() / 1000) > minProfitExpiration;

    if (nextHasProfit && !minProfitTimeExpired && !isProfitWarningAccepted) {
      if ((position.isLong && priceLimit.lt(profitPrice)) || (!position.isLong && priceLimit.gt(profitPrice))) {
        priceLimit = profitPrice;
      }
    }

    const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress;

    const path = [tokenAddress0];

    const isUnwrap = receiveToken.address === AddressZero;
    const isSwap = receiveToken.address !== tokenAddress0;

    if (isSwap) {
      if (isUnwrap && tokenAddress0 !== nativeTokenAddress) {
        path.push(nativeTokenAddress);
      } else if (!isUnwrap) {
        path.push(receiveToken.address);
      }
    }

    const withdrawETH = isUnwrap && !isContractAccount;

    const params = [
      path, // _path
      indexTokenAddress, // _indexToken
      collateralDelta, // _collateralDelta
      sizeDelta, // _sizeDelta
      position.isLong, // _isLong
      account, // _receiver
      priceLimit, // _acceptablePrice
      0, // _minOut
      minExecutionFee, // _executionFee
      withdrawETH, // _withdrawETH
      AddressZero, // _callbackTarget
    ];
    const sizeDeltaUsd = formatAmount(sizeDelta, USD_DECIMALS, 2);
    const successMsg = t`Requested decrease of ${position.indexToken.symbol} ${longOrShortText} by ${sizeDeltaUsd} USD.`;

    const contract = new ethers.Contract(positionRouterAddress, PositionRouter.abi, library.getSigner());

    callContract(chainId, contract, "createDecreasePosition", params, {
      value: minExecutionFee,
      sentMsg: t`Close submitted!`,
      successMsg,
      failMsg: t`Close failed.`,
      setPendingTxns,
      // for Arbitrum, sometimes the successMsg shows after the position has already been executed
      // hide the success message for Arbitrum as a workaround
      hideSuccessMsg: chainId === ARBITRUM,
    })
      .then(async (res) => {
        setFromValue("");
        setIsVisible(false);

        let nextSize = position.size.sub(sizeDelta);

        pendingPositions[position.key] = {
          updatedAt: Date.now(),
          pendingChanges: {
            size: nextSize,
          },
        };

        setPendingPositions({ ...pendingPositions });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const renderExistingOrderWarning = useCallback(() => {
    if (!existingOrder) {
      return;
    }
    const indexToken = getTokenInfo(infoTokens, existingOrder.indexToken);
    const sizeInToken = formatAmount(
      existingOrder.sizeDelta.mul(PRECISION).div(existingOrder.triggerPrice),
      USD_DECIMALS,
      4,
      true
    );
    const prefix = existingOrder.triggerAboveThreshold ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
    return (
      <div className="Confirmation-box-warning">
        <Trans>
          You have an active order to decrease {longOrShortText} {sizeInToken} {indexToken.symbol} ($
          {formatAmount(existingOrder.sizeDelta, USD_DECIMALS, 2, true)}) at {prefix}{" "}
          {formatAmount(existingOrder.triggerPrice, USD_DECIMALS, 2, true)}
        </Trans>
      </div>
    );
  }, [existingOrder, infoTokens, longOrShortText]);

  const profitPrice = getProfitPrice(orderOption === MARKET ? position.markPrice : triggerPriceUsd, position);

  let triggerPricePrefix;
  if (triggerPriceUsd) {
    triggerPricePrefix = triggerPriceUsd.gt(position.markPrice) ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
  }

  const shouldShowExistingOrderWarning = false;

  if (orderOption === STOP && !triggerPriceUsd) {
    receiveUsd = bigNumberify(0);
    receiveAmount = bigNumberify(0);
  }

  const ERROR_TOOLTIP_MSG = {
    [ErrorCode.InsufficientReceiveToken]: (
      <Trans>
        Swap amount from {position.collateralToken.symbol} to {receiveToken.symbol} exceeds {receiveToken.symbol}{" "}
        available liquidity. Choose a different "Receive" token.
      </Trans>
    ),
    [ErrorCode.ReceiveCollateralTokenOnly]: (
      <Trans>
        Swap amount from {position.collateralToken.symbol} to {receiveToken.symbol} exceeds{" "}
        {position.collateralToken.symbol} acceptable amount. Can only receive {position.collateralToken.symbol}.
      </Trans>
    ),
    [ErrorCode.KeepLeverageNotPossible]: (
      <Trans>Please uncheck "Keep Leverage", or close a larger position amount.</Trans>
    ),
    [ErrorCode.FeesHigherThanCollateral]: (
      <Trans>
        Collateral is not enough to cover pending Fees. Please uncheck "Keep Leverage" to pay the Fees with the realized
        PnL.
      </Trans>
    ),
    [ErrorCode.NegativeNextCollateral]: (
      <Trans>
        Neither Collateral nor realized PnL is enough to cover pending Fees. Please close a larger position amount.
      </Trans>
    ),
  };

  function renderPrimaryButton() {
    const [errorMessage, errorType, errorCode] = getError();
    const primaryTextMessage = getPrimaryText();
    if (errorType === ErrorDisplayType.Tooltip && errorMessage === primaryTextMessage && ERROR_TOOLTIP_MSG[errorCode]) {
      return (
        <Tooltip
          isHandlerDisabled
          handle={
            <Button variant="primary-action w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {primaryTextMessage}
            </Button>
          }
          position="center-top"
          className="Tooltip-flex"
          renderContent={() => ERROR_TOOLTIP_MSG[errorCode]}
        />
      );
    }

    return (
      <Button variant="primary-action w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
        {primaryTextMessage}
      </Button>
    );
  }

  return (
    <div className="PositionEditor">
      {position && (
        <Modal className="PositionSeller-modal" isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          {flagOrdersEnabled && (
            <Tab
              options={ORDER_OPTIONS}
              option={orderOption}
              optionLabels={ORDER_OPTION_LABELS}
              onChange={onOrderOptionChange}
            />
          )}
          <div className="relative">
            <BuyInputSection
              inputValue={fromValue}
              onInputValueChange={(e) => setFromValue(e.target.value)}
              topLeftLabel={t`Close`}
              topLeftValue={
                convertedAmountFormatted ? `${convertedAmountFormatted} ${position.collateralToken.symbol}` : ""
              }
              topRightLabel={t`Max`}
              topRightValue={maxAmount && maxAmountFormatted}
              onClickTopRightLabel={() => setFromValue(maxAmountFormattedFree)}
              onClickMax={() => setFromValue(maxAmountFormattedFree)}
              showMaxButton={fromValue !== maxAmountFormattedFree}
              showPercentSelector={true}
              onPercentChange={(percentage) => {
                setFromValue(formatAmountFree(maxAmount.mul(percentage).div(100), USD_DECIMALS, 2));
              }}
            >
              USD
            </BuyInputSection>
          </div>
          {orderOption === STOP && (
            <BuyInputSection
              inputValue={triggerPriceValue}
              onInputValueChange={onTriggerPriceChange}
              topLeftLabel={t`Price`}
              topRightLabel={t`Mark`}
              topRightValue={
                position.markPrice && formatAmount(position.markPrice, USD_DECIMALS, positionPriceDecimal, true)
              }
              onClickTopRightLabel={() => {
                setTriggerPriceValue(formatAmountFree(position.markPrice, USD_DECIMALS, positionPriceDecimal));
              }}
            >
              USD
            </BuyInputSection>
          )}
          {renderReceiveSpreadWarning()}
          {shouldShowExistingOrderWarning && renderExistingOrderWarning()}
          <div className="PositionEditor-info-box">
            {minExecutionFeeErrorMessage && (
              <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>
            )}
            {hasPendingProfit && orderOption !== STOP && (
              <div className="PositionEditor-accept-profit-warning">
                <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                  <span className="text-gray">Forfeit profit</span>
                </Checkbox>
              </div>
            )}
            <div className="PositionEditor-keep-leverage-settings">
              <ToggleSwitch isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
                <span className="text-gray font-sm">
                  <Trans>Keep leverage at {formatAmount(position.leverage, 4, 2)}x</Trans>
                </span>
              </ToggleSwitch>
            </div>
            {orderOption === MARKET && (
              <div>
                <ExchangeInfoRow
                  label={
                    <TooltipWithPortal
                      handle={t`Allowed Slippage`}
                      position="left-top"
                      renderContent={() => {
                        return (
                          <div className="text-white">
                            <Trans>
                              You can change this in the settings menu on the top right of the page.
                              <br />
                              <br />
                              Note that a low allowed slippage, e.g. less than{" "}
                              {formatPercentage(bigNumberify(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}, may result
                              in failed orders if prices are volatile.
                            </Trans>
                          </div>
                        );
                      }}
                    />
                  }
                >
                  <SlippageInput setAllowedSlippage={setAllowedSlippage} defaultSlippage={savedSlippageAmount} />
                </ExchangeInfoRow>
              </div>
            )}
            {orderOption === STOP && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Trigger Price</Trans>
                </div>
                <div className="align-right">
                  {!triggerPriceUsd && "-"}
                  {triggerPriceUsd &&
                    `${triggerPricePrefix} ${formatAmount(triggerPriceUsd, USD_DECIMALS, positionPriceDecimal, true)}`}
                </div>
              </div>
            )}
            <div className="Exchange-info-row top-line">
              <div className="Exchange-info-label">
                <Trans>Mark Price</Trans>
              </div>
              <div className="align-right">
                ${formatAmount(position.markPrice, USD_DECIMALS, positionPriceDecimal, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Entry Price</Trans>
              </div>
              <div className="align-right">
                ${formatAmount(position.averagePrice, USD_DECIMALS, positionPriceDecimal, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Liq. Price</Trans>
              </div>
              <div className="align-right">
                {isClosing && orderOption !== STOP && "-"}
                {(!isClosing || orderOption === STOP) && (
                  <div>
                    {(!nextLiquidationPrice || nextLiquidationPrice.eq(liquidationPrice)) && (
                      <div>{`$${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}`}</div>
                    )}
                    {nextLiquidationPrice && !nextLiquidationPrice.eq(liquidationPrice) && (
                      <div>
                        <div className="inline-block muted">
                          ${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}
                          <BsArrowRight className="transition-arrow" />
                        </div>
                        ${formatAmount(nextLiquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="Exchange-info-row top-line">
              <div className="Exchange-info-label">
                <Trans>Size</Trans>
              </div>
              <div className="align-right">
                {position && position.size && fromAmount && (
                  <div>
                    <div className="inline-block muted">
                      ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(position.size.sub(fromAmount), USD_DECIMALS, 2, true)}
                  </div>
                )}
                {position && position.size && !fromAmount && (
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                )}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div>
                <Tooltip
                  handle={
                    <span className="Exchange-info-label">
                      <Trans>Collateral ({collateralToken.symbol})</Trans>
                    </span>
                  }
                  position="left-top"
                  renderContent={() => {
                    return <Trans>Initial Collateral (Collateral excluding Borrow Fee).</Trans>;
                  }}
                />
              </div>

              <div className="align-right">
                {nextCollateral && !nextCollateral.eq(position.collateral) ? (
                  <div>
                    <div className="inline-block muted">
                      ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                  </div>
                ) : (
                  `$${formatAmount(position.collateral, USD_DECIMALS, 4, true)}`
                )}
              </div>
            </div>
            {!keepLeverage && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Leverage</Trans>
                </div>
                <div className="align-right">
                  {isClosing && "-"}
                  {!isClosing && (
                    <div>
                      {!nextLeverage && <div>{formatAmount(position.leverage, 4, 2)}x</div>}
                      {nextLeverage && (
                        <div>
                          <div className="inline-block muted">
                            {formatAmount(position.leverage, 4, 2)}x
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          {formatAmount(nextLeverage, 4, 2)}x
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>PnL</Trans>
              </div>
              <div className="align-right">
                {deltaStr} ({deltaPercentageStr})
              </div>
            </div>

            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Fees</Trans>
              </div>
              <div className="align-right">
                <FeesTooltip
                  isOpening={false}
                  positionFee={positionFee}
                  fundingFee={fundingFee}
                  executionFees={{
                    fee: executionFee,
                    feeUsd: executionFeeUsd,
                  }}
                  swapFee={swapFee}
                />
              </div>
            </div>
            {showReceiveSpread && (
              <ExchangeInfoRow label={t`Spread`} isWarning={receiveSpreadInfo.isHigh} isTop>
                {formatAmount(receiveSpreadInfo.value.mul(100), USD_DECIMALS, 2, true)}%
              </ExchangeInfoRow>
            )}
            <div className={["Exchange-info-row PositionSeller-receive-row", !showReceiveSpread ? "top-line" : ""]}>
              <div className="Exchange-info-label">
                <Trans>Receive</Trans>
              </div>

              {!isSwapAllowed && receiveToken && (
                <div className="align-right PositionSelector-selected-receive-token">
                  {formatAmount(receiveAmount, receiveToken.decimals, 4, true)}
                  &nbsp;{receiveToken.symbol} ($
                  {formatAmount(receiveUsd, USD_DECIMALS, 2, true)})
                </div>
              )}

              {isSwapAllowed && receiveToken && (
                <div className="align-right">
                  <TokenSelector
                    className={cx("PositionSeller-token-selector", {
                      warning: isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded,
                    })}
                    label={t`Receive`}
                    showBalances={false}
                    chainId={chainId}
                    tokenAddress={receiveToken.address}
                    onSelectToken={(token) => {
                      setSwapToToken(token);
                      setSavedRecieveTokenAddress(token.address);
                    }}
                    tokens={toTokens}
                    getTokenState={(tokenOptionInfo) => {
                      if (!shouldSwap(collateralToken, tokenOptionInfo)) {
                        return;
                      }

                      const convertedTokenAmount = getTokenAmountFromUsd(
                        infoTokens,
                        tokenOptionInfo.address,
                        receiveUsd
                      );

                      const isNotEnoughLiquidity =
                        tokenOptionInfo.availableAmount.lt(convertedTokenAmount) ||
                        tokenOptionInfo.bufferAmount.gt(tokenOptionInfo.poolAmount.sub(convertedTokenAmount));

                      if (isNotEnoughLiquidity) {
                        const { maxIn, maxOut, maxInUsd, maxOutUsd } = getSwapLimits(
                          infoTokens,
                          collateralToken.address,
                          tokenOptionInfo.address
                        );

                        const collateralInfo = getTokenInfo(infoTokens, collateralToken.address);

                        return {
                          disabled: true,
                          message: (
                            <div>
                              <Trans>Insufficient Available Liquidity to swap to {tokenOptionInfo.symbol}:</Trans>
                              <br />
                              <br />
                              <StatsTooltipRow
                                label={t`Max ${collateralInfo.symbol} in`}
                                value={[
                                  `${formatAmount(maxIn, collateralInfo.decimals, 0, true)} ${collateralInfo.symbol}`,
                                  `($${formatAmount(maxInUsd, USD_DECIMALS, 0, true)})`,
                                ]}
                              />
                              <br />
                              <StatsTooltipRow
                                label={t`Max ${tokenOptionInfo.symbol} out`}
                                value={[
                                  `${formatAmount(maxOut, tokenOptionInfo.decimals, 2, true)} ${
                                    tokenOptionInfo.symbol
                                  }`,
                                  `($${formatAmount(maxOutUsd, USD_DECIMALS, 2, true)})`,
                                ]}
                              />
                            </div>
                          ),
                        };
                      }
                    }}
                    infoTokens={infoTokens}
                    showTokenImgInDropdown={true}
                    selectedTokenLabel={
                      <span className="PositionSelector-selected-receive-token">
                        {formatAmount(receiveAmount, receiveToken.decimals, 4, true)}&nbsp;
                        {receiveToken.symbol} (${formatAmount(receiveUsd, USD_DECIMALS, 2, true)})
                      </span>
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <div className="Exchange-swap-button-container">{renderPrimaryButton()}</div>
        </Modal>
      )}
    </div>
  );
}
