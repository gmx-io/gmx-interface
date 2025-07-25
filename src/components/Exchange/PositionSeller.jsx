import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsArrowRight } from "react-icons/bs";
import { useKey } from "react-use";

import { ARBITRUM, IS_NETWORK_DISABLED, getChainName, getConstant } from "config/chains";
import { HIGH_SPREAD_THRESHOLD } from "config/constants";
import { getContract } from "config/contracts";
import {
  BASIS_POINTS_DIVISOR,
  BASIS_POINTS_DIVISOR_BIGINT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  DEFAULT_SLIPPAGE_AMOUNT,
  EXCESSIVE_SLIPPAGE_AMOUNT,
  MAX_ALLOWED_LEVERAGE,
  MAX_LEVERAGE,
  USD_DECIMALS,
} from "config/factors";
import { CLOSE_POSITION_RECEIVE_TOKEN_KEY, SLIPPAGE_BPS_KEY } from "config/localStorage";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { createDecreaseOrder } from "domain/legacy";
import { getTokenAmountFromUsd } from "domain/tokens";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { callContract } from "lib/contracts";
import {
  DECREASE,
  DUST_USD,
  MARKET,
  MIN_PROFIT_TIME,
  STOP,
  USDG_DECIMALS,
  adjustForDecimals,
  calculatePositionDelta,
  getDeltaStr,
  getMarginFee,
  getNextToAmount,
  getProfitPrice,
  isAddressZero,
} from "lib/legacy";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import {
  PRECISION,
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  formatPercentage,
  parseValue,
} from "lib/numbers";
import { getLeverage } from "lib/positions/getLeverage";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { usePrevious } from "lib/usePrevious";
import { abis } from "sdk/abis";
import { getPriceDecimals, getV1Tokens, getWrappedToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import PercentageInput from "components/PercentageInput/PercentageInput";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ErrorCode, ErrorDisplayType } from "./constants";
import ExchangeInfoRow from "./ExchangeInfoRow";
import FeesTooltip from "./FeesTooltip";
import Checkbox from "../Checkbox/Checkbox";
import Modal from "../Modal/Modal";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import Tooltip from "../Tooltip/Tooltip";

import "./PositionSeller.css";

const { ZeroAddress } = ethers;
const ORDER_SIZE_DUST_USD = expandDecimals(1, USD_DECIMALS - 1); // $0.10

function applySpread(amount, spread) {
  if (!amount || !spread) {
    return amount;
  }
  return amount - bigMath.mulDiv(amount, spread, PRECISION);
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
  let receiveUsd = 0n;

  if (collateral) {
    nextCollateral = collateral;

    if (hasProfit) {
      receiveUsd = receiveUsd + adjustedDelta;
    } else {
      nextCollateral = nextCollateral - adjustedDelta;
    }

    if (collateralDelta && collateralDelta > 0) {
      receiveUsd = receiveUsd + collateralDelta;
      nextCollateral = nextCollateral - collateralDelta;
    }
    if (isClosing) {
      receiveUsd = receiveUsd + nextCollateral;
      nextCollateral = 0n;
    }
    if (receiveUsd > totalFees) {
      receiveUsd = receiveUsd - totalFees;
    } else {
      nextCollateral = nextCollateral - totalFees;
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

  if (fromInfo?.maxUsdgAmount === undefined) {
    maxInUsd = 0n;
    maxIn = 0n;
  } else {
    maxInUsd = bigMath.mulDiv(
      fromInfo.maxUsdgAmount - fromInfo.usdgAmount,
      expandDecimals(1, USD_DECIMALS),
      expandDecimals(1, USDG_DECIMALS)
    );

    maxIn = bigMath.mulDiv(maxInUsd, expandDecimals(1, fromInfo.decimals), fromInfo.maxPrice).toString();
  }

  if (toInfo?.poolAmount === undefined || toInfo?.bufferAmount === undefined) {
    maxOut = 0n;
    maxOutUsd = 0n;
  } else {
    maxOut =
      toInfo.availableAmount > toInfo.poolAmount - toInfo.bufferAmount
        ? toInfo.poolAmount - toInfo.bufferAmount
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
    signer,
    infoTokens,
    setPendingTxns,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders,
    isWaitingForPluginApproval,
    isPluginApproving,
    orderBookApproved,
    setOrdersToaOpen,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
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
  const submitButtonRef = useRef(null);

  useEffect(() => {
    setAllowedSlippage(savedSlippageAmount);
    if (isHigherSlippageAllowed) {
      setAllowedSlippage(DEFAULT_HIGHER_SLIPPAGE_AMOUNT);
    }
  }, [savedSlippageAmount, isHigherSlippageAllowed]);

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const longOrShortText = position?.isLong ? t`Long` : t`Short`;

  const toTokens = isContractAccount ? getV1Tokens(chainId).filter((t) => !t.isNative) : getV1Tokens(chainId);
  const wrappedToken = getWrappedToken(chainId);

  const [savedRecieveTokenAddress, setSavedRecieveTokenAddress] = useLocalStorageByChainId(
    chainId,
    `${CLOSE_POSITION_RECEIVE_TOKEN_KEY}-${position.indexToken.symbol}-${position?.isLong ? "long" : "short"}-${position?.collateralToken.address}`
  );

  const [swapToToken, setSwapToToken] = useState(() =>
    savedRecieveTokenAddress ? toTokens.find((token) => token.address === savedRecieveTokenAddress) : undefined
  );

  const orderOption = MARKET;

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };

  const [triggerPriceValue, setTriggerPriceValue] = useState("");
  const triggerPriceUsd = orderOption === MARKET ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);

  const [nextDelta, nextHasProfit = 0n] = useMemo(() => {
    if (!position) {
      return [0n, false];
    }

    if (orderOption !== STOP) {
      return [position.delta, position.hasProfit, position.deltaPercentage];
    }

    if (!triggerPriceUsd) {
      return [0n, false];
    }

    const { delta, hasProfit, deltaPercentage } = calculatePositionDelta(triggerPriceUsd, position);
    return [delta, hasProfit, deltaPercentage];
  }, [position, orderOption, triggerPriceUsd]);

  const existingOrders = useMemo(() => {
    if (orderOption === STOP && (!triggerPriceUsd || triggerPriceUsd == 0n)) {
      return [];
    }
    if (!orders || !position) {
      return [];
    }

    const ret = [];
    for (const order of orders) {
      // only Stop orders can't be executed without corresponding opened position
      if (order.type !== DECREASE) continue;

      // if user creates Stop Loss we need only Stop Loss orders and vice versa
      if (orderOption === STOP) {
        const triggerAboveThreshold = triggerPriceUsd > position.markPrice;
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

  const hasOutdatedUi = useHasOutdatedUi();

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
  let collateralDelta = 0n;
  let receiveUsd = 0n;
  let receiveAmount = 0n;
  let adjustedDelta = 0n;

  let isNotEnoughReceiveTokenLiquidity;
  let isCollateralPoolCapacityExceeded;
  let isKeepLeverageNotPossible;

  let title;
  let fundingFee;
  let positionFee;
  let swapFee;
  let totalFees = 0n;

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

  const executionFee =
    orderOption === STOP ? getConstant(chainId, "DECREASE_ORDER_EXECUTION_GAS_FEE") : minExecutionFee;
  const executionFeeUsd = useMemo(
    () => getUsd(executionFee, nativeTokenAddress, false, infoTokens) || 0n,
    [executionFee, infoTokens, nativeTokenAddress]
  );

  const executionFees = useMemo(
    () => ({
      fee: executionFee,
      feeUsd: executionFeeUsd,
    }),
    [executionFee, executionFeeUsd]
  );

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

    if (fromAmount !== undefined) {
      isClosing = position.size - fromAmount < DUST_USD;
      positionFee = getMarginFee(fromAmount);
    }

    if (isClosing) {
      sizeDelta = position.size;
    } else if (orderOption === STOP && sizeDelta !== undefined && existingOrders.length > 0) {
      let residualSize = position.size;
      for (const order of existingOrders) {
        residualSize = residualSize - order.sizeDelta;
      }
      if (bigMath.abs(residualSize - sizeDelta) < ORDER_SIZE_DUST_USD) {
        sizeDelta = residualSize;
      }
    }

    totalFees = totalFees + (positionFee ?? 0n) + (fundingFee ?? 0n);

    if (sizeDelta && position.size > 0) {
      adjustedDelta = bigMath.mulDiv(nextDelta, sizeDelta, position.size);
    }

    if (keepLeverage && sizeDelta && !isClosing) {
      // Calculating the collateralDelta needed to keep the next leverage same as current leverage
      collateralDelta =
        position.collateral -
        bigMath.mulDiv(position.size - sizeDelta, BASIS_POINTS_DIVISOR_BIGINT, leverageWithoutDelta);

      /*
       In the backend nextCollateral is determined based on not just collateralDelta we pass but also whether
       a position has profit or loss and how much fees it has. The following logic counters the backend logic
       and determines the exact collateralDelta to be passed so that ultimately the nextCollateral value
       generated will keep leverage the same.

       The backend logic can be found in reduceCollateral function at
       https://github.com/gmx-io/gmx-contracts/blob/master/contracts/core/Vault.sol#L992
      */

      if (nextHasProfit) {
        if (collateralDelta + adjustedDelta <= totalFees) {
          collateralDelta = 0n;
          // Keep Leverage is not possible
          isKeepLeverageNotPossible = true;
        }
      } else {
        if (collateralDelta - adjustedDelta > totalFees) {
          collateralDelta = collateralDelta - adjustedDelta;
        } else {
          collateralDelta = 0n;
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

    if (fromAmount !== undefined && collateralToken.maxPrice !== undefined) {
      convertedAmount = bigMath.mulDiv(
        fromAmount,
        expandDecimals(1, collateralToken.decimals),
        collateralToken.maxPrice
      );
      convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true);
    } else {
      convertedAmount = 0n;
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
        swapFee = bigMath.mulDiv(receiveUsd, BigInt(feeBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
        totalFees = totalFees + (swapFee ?? 0n);
        receiveUsd = receiveUsd - swapFee;
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
        receiveTokenInfo.availableAmount < receiveAmount ||
        receiveTokenInfo.bufferAmount > receiveTokenInfo.poolAmount - receiveAmount;

      if (
        collateralInfo.maxUsdgAmount !== undefined &&
        collateralInfo.maxUsdgAmount > 0 &&
        collateralInfo.usdgAmount !== undefined &&
        collateralInfo.maxPrice !== undefined
      ) {
        const usdgFromAmount = adjustForDecimals(receiveUsd, USD_DECIMALS, USDG_DECIMALS);
        const nextUsdgAmount = collateralInfo.usdgAmount + usdgFromAmount;

        if (nextUsdgAmount > collateralInfo.maxUsdgAmount) {
          isCollateralPoolCapacityExceeded = true;
        }
      }
    }

    if (fromAmount !== undefined) {
      if (!isClosing) {
        nextLiquidationPrice = getLiquidationPrice({
          size: position.size - sizeDelta,
          collateral: nextCollateral,
          averagePrice: position.averagePrice,
          isLong: position.isLong,
        });

        if (!keepLeverage) {
          // We need to send the remaining delta
          const remainingDelta = nextDelta === undefined ? undefined : nextDelta - adjustedDelta;
          nextLeverage = getLeverage({
            size: position.size - sizeDelta,
            collateral: nextCollateral,
            hasProfit: nextHasProfit,
            delta: remainingDelta,
            includeDelta: savedIsPnlInLeverage,
          });

          nextLeverageWithoutDelta = getLeverage({
            size: position.size - sizeDelta,
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
    if (!position || !position.markPrice || position.collateral == 0n) {
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
    if (!triggerPriceUsd || triggerPriceUsd == 0n) {
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
    if (nextLeverage && nextLeverage == 0n) {
      return [t`Enter an amount`];
    }
    if (orderOption === STOP) {
      if (!triggerPriceUsd || triggerPriceUsd == 0n) {
        return [t`Enter Price`];
      }
      if (position.isLong && triggerPriceUsd <= liquidationPrice) {
        return [t`Price below Liq. Price`];
      }
      if (!position.isLong && triggerPriceUsd >= liquidationPrice) {
        return [t`Price above Liq. Price`];
      }

      if (profitPrice && nextDelta == 0n && nextHasProfit) {
        return [t`Invalid price, see warning`];
      }
    }

    if (isNotEnoughReceiveTokenLiquidity) {
      return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientReceiveToken];
    }

    if (!isClosing && keepLeverage && (leverageWithoutDelta < 0 || leverageWithoutDelta > 100 * BASIS_POINTS_DIVISOR)) {
      return [t`Fees are higher than Collateral`, ErrorDisplayType.Tooltip, ErrorCode.FeesHigherThanCollateral];
    }

    if (!isClosing && keepLeverage && isKeepLeverageNotPossible) {
      return [t`Keep Leverage is not possible`, ErrorDisplayType.Tooltip, ErrorCode.KeepLeverageNotPossible];
    }

    if (!isClosing && nextCollateral < 0) {
      return [t`Realized PnL insufficient for Fees`, ErrorDisplayType.Tooltip, ErrorCode.NegativeNextCollateral];
    }

    if (isCollateralPoolCapacityExceeded) {
      return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.ReceiveCollateralTokenOnly];
    }

    if (!isClosing && position && position.size && fromAmount) {
      if (position.size - fromAmount < expandDecimals(10, USD_DECIMALS)) {
        return [t`Leftover position below 10 USD`];
      }
      if (nextCollateral && nextCollateral < expandDecimals(5, USD_DECIMALS)) {
        return [t`Leftover collateral below 5 USD`];
      }
    }

    if (position && position.size && position.size < fromAmount) {
      return [t`Max close amount exceeded`];
    }

    if (!isClosing && nextLeverage && nextLeverage < 1.1 * BASIS_POINTS_DIVISOR) {
      return [t`Min leverage: 1.1x`];
    }

    if (!isClosing && nextLeverage && nextLeverage > MAX_ALLOWED_LEVERAGE) {
      return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    if (!isClosing && nextLeverageWithoutDelta && nextLeverageWithoutDelta > MAX_LEVERAGE) {
      return [t`Max Leverage without PnL: 100x`];
    }

    if (position.isLong) {
      if (!isClosing && nextLiquidationPrice && nextLiquidationPrice > position.markPrice) {
        return [t`Invalid Liquidation Price`];
      }
    } else {
      if (!isClosing && nextLiquidationPrice && nextLiquidationPrice < position.markPrice) {
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
    if (isWaitingForPositionRouterApproval) {
      return false;
    }
    if (isPositionRouterApproving) {
      return false;
    }
    if (orderOption === STOP) {
      return false;
    }

    return true;
  };

  const hasPendingProfit = MIN_PROFIT_TIME > 0 && position.delta == 0n && position.pendingDelta > 0;

  const getPrimaryText = () => {
    const [error] = getError();
    if (error) {
      return error;
    }

    if (isWaitingForPositionRouterApproval) {
      return t`Enabling Leverage...`;
    }

    if (isPositionRouterApproving) {
      return t`Enabling Leverage...`;
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
        isHigh: collateralTokenInfo.spread > HIGH_SPREAD_THRESHOLD,
      };
    }

    const swapToTokenInfo = getTokenInfo(infoTokens, swapToToken.address);
    const spread = collateralTokenInfo.spread + swapToTokenInfo.spread;
    return {
      value: spread,
      isHigh: spread > HIGH_SPREAD_THRESHOLD,
    };
  }, [swapToToken, infoTokens, collateralTokenInfo]);
  const showReceiveSpread = receiveSpreadInfo && receiveSpreadInfo.value > 0;

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

    setIsSubmitting(true);

    const collateralTokenAddress = position.collateralToken.isNative
      ? nativeTokenAddress
      : position.collateralToken.address;
    const indexTokenAddress = position.indexToken.isNative ? nativeTokenAddress : position.indexToken.address;

    if (orderOption === STOP) {
      createDecreaseOrder(
        chainId,
        signer,
        account,
        indexTokenAddress,
        sizeDelta,
        collateralTokenAddress,
        collateralDelta,
        position.isLong,
        {
          sentMsg: t`Order submitted!`,
          successMsg: t`Order created!`,
          failMsg: t`Order creation failed.`,
          setPendingTxns,
        }
      )
        .then(() => {
          setFromValue("");

          if (swapToToken) {
            setSavedRecieveTokenAddress(swapToToken.address);
          }

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
    let priceLimit = bigMath.mulDiv(refPrice, BigInt(priceBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
    const minProfitExpiration = position.lastIncreasedTime + MIN_PROFIT_TIME;
    const minProfitTimeExpired = parseInt(Date.now() / 1000) > minProfitExpiration;

    if (nextHasProfit && !minProfitTimeExpired && !isProfitWarningAccepted) {
      if ((position.isLong && priceLimit < profitPrice) || (!position.isLong && priceLimit > profitPrice)) {
        priceLimit = profitPrice;
      }
    }

    const tokenAddress0 = collateralTokenAddress === ZeroAddress ? nativeTokenAddress : collateralTokenAddress;

    const path = [tokenAddress0];

    const isUnwrap = receiveToken.address === ZeroAddress;
    const isSwap = receiveToken.address !== tokenAddress0;

    if (isSwap) {
      if (isUnwrap && tokenAddress0 !== nativeTokenAddress) {
        path.push(nativeTokenAddress);
      } else if (!isUnwrap) {
        path.push(receiveToken.address);
      }
    }

    const sizeDeltaUsd = formatAmount(sizeDelta, USD_DECIMALS, 2);
    const successMsg = t`Requested decrease of ${position.indexToken.symbol} ${longOrShortText} by ${sizeDeltaUsd} USD.`;

    const contract = new ethers.Contract(vaultAddress, abis.Vault, signer);

    const params = [
      account,
      collateralTokenAddress,
      indexTokenAddress,
      collateralDelta,
      sizeDelta,
      position.isLong,
      account,
    ];

    callContract(chainId, contract, "decreasePosition", params, {
      sentMsg: t`Close submitted!`,
      successMsg,
      failMsg: t`Close failed.`,
      setPendingTxns,
      // for Arbitrum, sometimes the successMsg shows after the position has already been executed
      // hide the success message for Arbitrum as a workaround
      hideSuccessMsg: chainId === ARBITRUM,
    })
      .then(async () => {
        setFromValue("");

        if (swapToToken) {
          setSavedRecieveTokenAddress(swapToToken.address);
        }

        setIsVisible(false);

        let nextSize = position.size - sizeDelta;

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

  useKey(
    "Enter",
    () => {
      if (isVisible && isPrimaryEnabled()) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        onClickPrimary();
      }
    },
    {},
    [isVisible, isPrimaryEnabled]
  );

  const renderExistingOrderWarning = useCallback(() => {
    if (!existingOrder) {
      return;
    }
    const indexToken = getTokenInfo(infoTokens, existingOrder.indexToken);
    const sizeInToken = formatAmount(
      bigMath.mulDiv(existingOrder.sizeDelta, PRECISION, existingOrder.triggerPrice),
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
    triggerPricePrefix = triggerPriceUsd > position.markPrice ? TRIGGER_PREFIX_ABOVE : TRIGGER_PREFIX_BELOW;
  }

  const shouldShowExistingOrderWarning = false;

  if (orderOption === STOP && !triggerPriceUsd) {
    receiveUsd = 0n;
    receiveAmount = 0n;
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
            <Button
              buttonRef={submitButtonRef}
              variant="primary-action w-full"
              onClick={onClickPrimary}
              disabled={!isPrimaryEnabled()}
            >
              {primaryTextMessage}
            </Button>
          }
          position="top"
          className="Tooltip-flex"
          renderContent={() => ERROR_TOOLTIP_MSG[errorCode]}
        />
      );
    }

    return (
      <Button
        buttonRef={submitButtonRef}
        variant="primary-action w-full"
        onClick={onClickPrimary}
        disabled={!isPrimaryEnabled()}
      >
        {primaryTextMessage}
      </Button>
    );
  }

  return (
    <div className="PositionEditor">
      {position && (
        <Modal className="PositionSeller-modal" isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          <div className="mb-12 flex flex-col gap-4">
            <BuyInputSection
              inputValue={fromValue}
              onInputValueChange={(e) => setFromValue(e.target.value)}
              topLeftLabel={t`Close`}
              bottomLeftValue={
                convertedAmountFormatted ? `${convertedAmountFormatted} ${position.collateralToken.symbol}` : ""
              }
              isBottomLeftValueMuted={convertedAmount === 0n}
              topRightLabel={t`Max`}
              topRightValue={maxAmount && maxAmountFormatted}
              onClickMax={fromValue !== maxAmountFormattedFree ? () => setFromValue(maxAmountFormattedFree) : undefined}
              showPercentSelector={true}
              onPercentChange={(percentage) => {
                setFromValue(formatAmountFree(bigMath.mulDiv(maxAmount, BigInt(percentage), 100n), USD_DECIMALS, 2));
              }}
            >
              USD
            </BuyInputSection>
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
          </div>
          <div className="Confirmation-box-info">
            <Trans>
              GMX V1 only supports closing positions using market orders. For advanced trading features, use GMX V2.
            </Trans>
          </div>
          {renderReceiveSpreadWarning()}
          {shouldShowExistingOrderWarning && renderExistingOrderWarning()}
          <div className="PositionEditor-info-box">
            {minExecutionFeeErrorMessage && (
              <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>
            )}
            {hasPendingProfit && orderOption !== STOP && (
              <div className="PositionEditor-accept-profit-warning">
                <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                  <span className="text-slate-100">Forfeit profit</span>
                </Checkbox>
              </div>
            )}
            <div className="PositionEditor-keep-leverage-settings">
              <ToggleSwitch isChecked={keepLeverage} setIsChecked={setKeepLeverage} className="mb-10">
                <span className="text-slate-100">
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
                      position="top-start"
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
                  <PercentageInput
                    onChange={setAllowedSlippage}
                    value={allowedSlippage}
                    defaultValue={savedSlippageAmount}
                    highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
                    highValueWarningText={t`Slippage is too high`}
                  />
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
                    {(nextLiquidationPrice === undefined || nextLiquidationPrice == liquidationPrice) && (
                      <div>{`$${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}`}</div>
                    )}
                    {nextLiquidationPrice !== undefined && nextLiquidationPrice != liquidationPrice && (
                      <div>
                        <div className="muted inline-block">
                          ${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}
                          <BsArrowRight className="transition-arrow inline-block" />
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
                {position && position.size !== undefined && fromAmount !== undefined && (
                  <div>
                    <div className="muted inline-block">
                      ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow inline-block" />
                    </div>
                    ${formatAmount(position.size - fromAmount, USD_DECIMALS, 2, true)}
                  </div>
                )}
                {position && position.size && fromAmount === undefined && (
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
                  position="top-start"
                  renderContent={() => {
                    return <Trans>Initial Collateral (Collateral excluding Borrow Fee).</Trans>;
                  }}
                />
              </div>

              <div className="align-right">
                {nextCollateral && nextCollateral != position.collateral ? (
                  <div>
                    <div className="muted inline-block">
                      ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow inline-block" />
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
                          <div className="muted inline-block">
                            {formatAmount(position.leverage, 4, 2)}x
                            <BsArrowRight className="transition-arrow inline-block" />
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
                  executionFees={executionFees}
                  swapFee={swapFee}
                />
              </div>
            </div>
            {showReceiveSpread && (
              <ExchangeInfoRow label={t`Spread`} isWarning={receiveSpreadInfo.isHigh} isTop>
                {formatAmount(receiveSpreadInfo.value * 100n, USD_DECIMALS, 2, true)}%
              </ExchangeInfoRow>
            )}
            <div className={cx("Exchange-info-row PositionSeller-receive-row", !showReceiveSpread ? "top-line" : "")}>
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
                    className={cx({
                      "*:!text-yellow-500 hover:!text-yellow-500":
                        isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded,
                    })}
                    label={t`Receive`}
                    showBalances={false}
                    chainId={chainId}
                    tokenAddress={receiveToken.address}
                    onSelectToken={(token) => {
                      setSwapToToken(token);
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
                        tokenOptionInfo.availableAmount < convertedTokenAmount ||
                        tokenOptionInfo.bufferAmount > tokenOptionInfo.poolAmount - convertedTokenAmount;

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
                                // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
                                value={[
                                  `${formatAmount(maxIn, collateralInfo.decimals, 0, true)} ${collateralInfo.symbol}`,
                                  `($${formatAmount(maxInUsd, USD_DECIMALS, 0, true)})`,
                                ]}
                              />
                              <br />
                              <StatsTooltipRow
                                label={t`Max ${tokenOptionInfo.symbol} out`}
                                // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
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
