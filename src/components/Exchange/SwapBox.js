import React, { useState, useEffect, useMemo } from "react";

import Tooltip from "../Tooltip/Tooltip";
import Modal from "../Modal/Modal";
import Slider, { SliderTooltip } from "rc-slider";
import "rc-slider/assets/index.css";

import cx from "classnames";
import useSWR from "swr";
import { ethers } from "ethers";

import { IoMdSwap } from "react-icons/io";
import { BsArrowRight } from "react-icons/bs";

import {
  helperToast,
  formatAmount,
  bigNumberify,
  ARBITRUM,
  AVALANCHE,
  USD_DECIMALS,
  USDG_DECIMALS,
  LONG,
  SHORT,
  SWAP,
  MARKET,
  SWAP_ORDER_OPTIONS,
  LEVERAGE_ORDER_OPTIONS,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  getPositionKey,
  getUsd,
  BASIS_POINTS_DIVISOR,
  MARGIN_FEE_BASIS_POINTS,
  PRECISION,
  USDG_ADDRESS,
  STOP,
  LIMIT,
  SWAP_OPTIONS,
  DUST_BNB,
  isTriggerRatioInverted,
  usePrevious,
  formatAmountFree,
  fetcher,
  parseValue,
  expandDecimals,
  shouldRaiseGasError,
  getTokenInfo,
  getLiquidationPrice,
  approveTokens,
  getLeverage,
  isSupportedChain,
  getExchangeRate,
  getExchangeRateDisplay,
  getNextToAmount,
  getNextFromAmount,
  getMostAbundantStableToken,
  useLocalStorageSerializeKey,
  useLocalStorageByChainId,
  calculatePositionDelta,
  replaceNativeTokenAddress,
  adjustForDecimals,
} from "../../Helpers";
import { getConstant } from "../../Constants";
import * as Api from "../../Api";
import { getContract } from "../../Addresses";

import Checkbox from "../Checkbox/Checkbox";
import Tab from "../Tab/Tab";
import TokenSelector from "./TokenSelector";
import ExchangeInfoRow from "./ExchangeInfoRow";
import ConfirmationBox from "./ConfirmationBox";
import OrdersToa from "./OrdersToa";

import { getTokens, getWhitelistedTokens, getToken, getTokenBySymbol } from "../../data/Tokens";
import PositionRouter from "../../abis/PositionRouter.json";
import Router from "../../abis/Router.json";
import Token from "../../abis/Token.json";
import WETH from "../../abis/WETH.json";

import longImg from "../../img/long.svg";
import shortImg from "../../img/short.svg";
import swapImg from "../../img/swap.svg";
import { useUserReferralCode } from "../../Api/referrals";

const SWAP_ICONS = {
  [LONG]: longImg,
  [SHORT]: shortImg,
  [SWAP]: swapImg,
};
const { AddressZero } = ethers.constants;

const leverageSliderHandle = (props) => {
  const { value, dragging, index, ...restProps } = props;
  return (
    <SliderTooltip
      prefixCls="rc-slider-tooltip"
      overlay={`${parseFloat(value).toFixed(2)}x`}
      visible={dragging}
      placement="top"
      key={index}
    >
      <Slider.Handle value={value} {...restProps} />
    </SliderTooltip>
  );
};

function getNextAveragePrice({ size, sizeDelta, hasProfit, delta, nextPrice, isLong }) {
  if (!size || !sizeDelta || !delta || !nextPrice) {
    return;
  }
  const nextSize = size.add(sizeDelta);
  let divisor;
  if (isLong) {
    divisor = hasProfit ? nextSize.add(delta) : nextSize.sub(delta);
  } else {
    divisor = hasProfit ? nextSize.sub(delta) : nextSize.add(delta);
  }
  if (!divisor || divisor.eq(0)) {
    return;
  }
  const nextAveragePrice = nextPrice.mul(nextSize).div(divisor);
  return nextAveragePrice;
}

export default function SwapBox(props) {
  const {
    pendingPositions,
    setPendingPositions,
    infoTokens,
    active,
    library,
    account,
    fromTokenAddress,
    setFromTokenAddress,
    toTokenAddress,
    setToTokenAddress,
    swapOption,
    setSwapOption,
    positionsMap,
    pendingTxns,
    setPendingTxns,
    tokenSelection,
    setTokenSelection,
    setIsConfirming,
    isConfirming,
    isPendingConfirmation,
    setIsPendingConfirmation,
    flagOrdersEnabled,
    chainId,
    nativeTokenAddress,
    savedSlippageAmount,
    totalTokenWeights,
    usdgSupply,
    orders,
    savedIsPnlInLeverage,
    orderBookApproved,
    positionRouterApproved,
    isWaitingForPluginApproval,
    approveOrderBook,
    approvePositionRouter,
    setIsWaitingForPluginApproval,
    isWaitingForPositionRouterApproval,
    setIsWaitingForPositionRouterApproval,
    isPluginApproving,
    isPositionRouterApproving,
    savedShouldDisableOrderValidation,
  } = props;

  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [anchorOnFromAmount, setAnchorOnFromAmount] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  const { attachedOnChain, userReferralCode } = useUserReferralCode(library, chainId, account);

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const defaultCollateralSymbol = getConstant(chainId, "defaultCollateralSymbol");
  // TODO hack with useLocalStorageSerializeKey
  const [shortCollateralAddress, setShortCollateralAddress] = useLocalStorageByChainId(
    chainId,
    "Short-Collateral-Address",
    getTokenBySymbol(chainId, defaultCollateralSymbol).address
  );
  const isLong = swapOption === LONG;
  const isShort = swapOption === SHORT;
  const isSwap = swapOption === SWAP;

  const getLeaderboardLink = () => {
    if (chainId === ARBITRUM) {
      return "https://www.gmx.house/arbitrum/leaderboard";
    }
    if (chainId === AVALANCHE) {
      return "https://www.gmx.house/avalanche/leaderboard";
    }
    return "https://www.gmx.house";
  };

  function getTokenLabel() {
    switch (true) {
      case isLong:
        return "Long";
      case isShort:
        return "Short";
      case isSwap:
        return "Receive";
      default:
        return "";
    }
  }
  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(
    [chainId, "Exchange-swap-leverage-option"],
    "2"
  );
  const [isLeverageSliderEnabled, setIsLeverageSliderEnabled] = useLocalStorageSerializeKey(
    [chainId, "Exchange-swap-leverage-slider-enabled"],
    true
  );

  const hasLeverageOption = isLeverageSliderEnabled && !isNaN(parseFloat(leverageOption));

  const [ordersToaOpen, setOrdersToaOpen] = useState(false);

  let [orderOption, setOrderOption] = useLocalStorageSerializeKey([chainId, "Order-option"], MARKET);
  if (!flagOrdersEnabled) {
    orderOption = MARKET;
  }

  const onOrderOptionChange = (option) => {
    setOrderOption(option);
  };

  const [sellValue, setSellValue] = useState("");

  const onSellChange = (evt) => {
    setSellValue(evt.target.value || "");
  };

  const isMarketOrder = orderOption === MARKET;
  const orderOptions = isSwap ? SWAP_ORDER_OPTIONS : LEVERAGE_ORDER_OPTIONS;

  const [triggerPriceValue, setTriggerPriceValue] = useState("");
  const triggerPriceUsd = isMarketOrder ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };

  const onTriggerRatioChange = (evt) => {
    setTriggerRatioValue(evt.target.value || "");
  };

  let positionKey;
  if (isLong) {
    positionKey = getPositionKey(account, toTokenAddress, toTokenAddress, true, nativeTokenAddress);
  }
  if (isShort) {
    positionKey = getPositionKey(account, shortCollateralAddress, toTokenAddress, false, nativeTokenAddress);
  }

  const existingPosition = positionKey ? positionsMap[positionKey] : undefined;
  const hasExistingPosition = existingPosition && existingPosition.size && existingPosition.size.gt(0);

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokens = getTokens(chainId);
  const fromTokens = tokens;
  const stableTokens = tokens.filter((token) => token.isStable);
  const indexTokens = whitelistedTokens.filter((token) => !token.isStable && !token.isWrapped);
  const shortableTokens = indexTokens.filter((token) => token.isShortable);
  let toTokens = tokens;
  if (isLong) {
    toTokens = indexTokens;
  }
  if (isShort) {
    toTokens = shortableTokens;
  }

  const needOrderBookApproval = !isMarketOrder && !orderBookApproved;
  const prevNeedOrderBookApproval = usePrevious(needOrderBookApproval);

  const needPositionRouterApproval = (isLong || isShort) && isMarketOrder && !positionRouterApproved;
  const prevNeedPositionRouterApproval = usePrevious(needPositionRouterApproval);

  useEffect(() => {
    if (!needOrderBookApproval && prevNeedOrderBookApproval && isWaitingForPluginApproval) {
      setIsWaitingForPluginApproval(false);
      helperToast.success(<div>Orders enabled!</div>);
    }
  }, [needOrderBookApproval, prevNeedOrderBookApproval, setIsWaitingForPluginApproval, isWaitingForPluginApproval]);

  useEffect(() => {
    if (!needPositionRouterApproval && prevNeedPositionRouterApproval && isWaitingForPositionRouterApproval) {
      setIsWaitingForPositionRouterApproval(false);
      helperToast.success(<div>Leverage enabled!</div>);
    }
  }, [
    needPositionRouterApproval,
    prevNeedPositionRouterApproval,
    setIsWaitingForPositionRouterApproval,
    isWaitingForPositionRouterApproval,
  ]);

  useEffect(() => {
    if (!needOrderBookApproval && prevNeedOrderBookApproval && isWaitingForPluginApproval) {
      setIsWaitingForPluginApproval(false);
      helperToast.success(<div>Orders enabled!</div>);
    }
  }, [needOrderBookApproval, prevNeedOrderBookApproval, setIsWaitingForPluginApproval, isWaitingForPluginApproval]);

  const routerAddress = getContract(chainId, "Router");
  const tokenAllowanceAddress = fromTokenAddress === AddressZero ? nativeTokenAddress : fromTokenAddress;
  const { data: tokenAllowance } = useSWR(
    active && [active, chainId, tokenAllowanceAddress, "allowance", account, routerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const positionRouterAddress = getContract(chainId, "PositionRouter");

  const { data: minExecutionFee } = useSWR([active, chainId, positionRouterAddress, "minExecutionFee"], {
    fetcher: fetcher(library, PositionRouter),
  });

  const { data: hasOutdatedUi } = Api.useHasOutdatedUi();

  const fromToken = getToken(chainId, fromTokenAddress);
  const toToken = getToken(chainId, toTokenAddress);
  const shortCollateralToken = getTokenInfo(infoTokens, shortCollateralAddress);

  const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
  const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

  const renderAvailableLongLiquidity = () => {
    if (!isLong) {
      return null;
    }

    return (
      <div className="Exchange-info-row">
        <div className="Exchange-info-label">Available Liquidity</div>
        <div className="align-right">
          <Tooltip
            handle={`${formatAmount(toTokenInfo.maxAvailableLong, USD_DECIMALS, 2, true)}`}
            position="right-bottom"
            renderContent={() => {
              return (
                <>
                  Max {toTokenInfo.symbol} long capacity: $
                  {formatAmount(toTokenInfo.maxLongCapacity, USD_DECIMALS, 2, true)}
                  <br />
                  <br />
                  Current {toTokenInfo.symbol} long: ${formatAmount(toTokenInfo.guaranteedUsd, USD_DECIMALS, 2, true)}
                  <br />
                </>
              );
            }}
          ></Tooltip>
        </div>
      </div>
    );
  };

  const fromBalance = fromTokenInfo ? fromTokenInfo.balance : bigNumberify(0);
  const toBalance = toTokenInfo ? toTokenInfo.balance : bigNumberify(0);

  const fromAmount = parseValue(fromValue, fromToken && fromToken.decimals);
  const toAmount = parseValue(toValue, toToken && toToken.decimals);

  const isPotentialWrap = (fromToken.isNative && toToken.isWrapped) || (fromToken.isWrapped && toToken.isNative);
  const isWrapOrUnwrap = isSwap && isPotentialWrap;
  const needApproval =
    fromTokenAddress !== AddressZero &&
    tokenAllowance &&
    fromAmount &&
    fromAmount.gt(tokenAllowance) &&
    !isWrapOrUnwrap;
  const prevFromTokenAddress = usePrevious(fromTokenAddress);
  const prevNeedApproval = usePrevious(needApproval);
  const prevToTokenAddress = usePrevious(toTokenAddress);

  const fromUsdMin = getUsd(fromAmount, fromTokenAddress, false, infoTokens);
  const toUsdMax = getUsd(toAmount, toTokenAddress, true, infoTokens, orderOption, triggerPriceUsd);

  const indexTokenAddress = toTokenAddress === AddressZero ? nativeTokenAddress : toTokenAddress;
  const collateralTokenAddress = isLong ? indexTokenAddress : shortCollateralAddress;
  const collateralToken = getToken(chainId, collateralTokenAddress);

  const [triggerRatioValue, setTriggerRatioValue] = useState("");

  const triggerRatioInverted = useMemo(() => {
    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo);
  }, [toTokenInfo, fromTokenInfo]);

  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return bigNumberify(0);
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS);
    if (ratio.eq(0)) {
      return bigNumberify(0);
    }
    if (triggerRatioInverted) {
      ratio = PRECISION.mul(PRECISION).div(ratio);
    }
    return ratio;
  }, [triggerRatioValue, triggerRatioInverted]);

  useEffect(() => {
    if (
      fromToken &&
      fromTokenAddress === prevFromTokenAddress &&
      !needApproval &&
      prevNeedApproval &&
      isWaitingForApproval
    ) {
      setIsWaitingForApproval(false);
      helperToast.success(<div>{fromToken.symbol} approved!</div>);
    }
  }, [
    fromTokenAddress,
    prevFromTokenAddress,
    needApproval,
    prevNeedApproval,
    setIsWaitingForApproval,
    fromToken.symbol,
    isWaitingForApproval,
    fromToken,
  ]);

  useEffect(() => {
    if (!toTokens.find((token) => token.address === toTokenAddress)) {
      setToTokenAddress(swapOption, toTokens[0].address);
    }
  }, [swapOption, toTokens, toTokenAddress, setToTokenAddress]);

  useEffect(() => {
    if (swapOption !== SHORT) {
      return;
    }
    if (toTokenAddress === prevToTokenAddress) {
      return;
    }
    for (let i = 0; i < stableTokens.length; i++) {
      const stableToken = stableTokens[i];
      const key = getPositionKey(account, stableToken.address, toTokenAddress, false, nativeTokenAddress);
      const position = positionsMap[key];
      if (position && position.size && position.size.gt(0)) {
        setShortCollateralAddress(position.collateralToken.address);
        return;
      }
    }
  }, [
    account,
    toTokenAddress,
    prevToTokenAddress,
    swapOption,
    positionsMap,
    stableTokens,
    nativeTokenAddress,
    shortCollateralAddress,
    setShortCollateralAddress,
  ]);

  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnFromAmount) {
        if (!fromAmount) {
          setToValue("");
          return;
        }
        if (toToken) {
          const { amount: nextToAmount } = getNextToAmount(
            chainId,
            fromAmount,
            fromTokenAddress,
            toTokenAddress,
            infoTokens,
            undefined,
            !isMarketOrder && triggerRatio,
            usdgSupply,
            totalTokenWeights
          );

          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals);
          setToValue(nextToValue);
        }
        return;
      }

      if (!toAmount) {
        setFromValue("");
        return;
      }
      if (fromToken) {
        const { amount: nextFromAmount } = getNextFromAmount(
          chainId,
          toAmount,
          fromTokenAddress,
          toTokenAddress,
          infoTokens,
          undefined,
          !isMarketOrder && triggerRatio,
          usdgSupply,
          totalTokenWeights
        );
        const nextFromValue = formatAmountFree(nextFromAmount, fromToken.decimals, fromToken.decimals);
        setFromValue(nextFromValue);
      }
    };

    const updateLeverageAmounts = () => {
      if (!hasLeverageOption) {
        return;
      }
      if (anchorOnFromAmount) {
        if (!fromAmount) {
          setToValue("");
          return;
        }

        const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);
        if (toTokenInfo && toTokenInfo.maxPrice && fromUsdMin && fromUsdMin.gt(0)) {
          const leverageMultiplier = parseInt(leverageOption * BASIS_POINTS_DIVISOR);
          const toTokenPriceUsd =
            !isMarketOrder && triggerPriceUsd && triggerPriceUsd.gt(0) ? triggerPriceUsd : toTokenInfo.maxPrice;

          const { feeBasisPoints } = getNextToAmount(
            chainId,
            fromAmount,
            fromTokenAddress,
            collateralTokenAddress,
            infoTokens,
            undefined,
            undefined,
            usdgSupply,
            totalTokenWeights
          );

          let fromUsdMinAfterFee = fromUsdMin;
          if (feeBasisPoints) {
            fromUsdMinAfterFee = fromUsdMin.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR);
          }

          const toNumerator = fromUsdMinAfterFee.mul(leverageMultiplier).mul(BASIS_POINTS_DIVISOR);
          const toDenominator = bigNumberify(MARGIN_FEE_BASIS_POINTS)
            .mul(leverageMultiplier)
            .add(bigNumberify(BASIS_POINTS_DIVISOR).mul(BASIS_POINTS_DIVISOR));

          const nextToUsd = toNumerator.div(toDenominator);

          const nextToAmount = nextToUsd.mul(expandDecimals(1, toToken.decimals)).div(toTokenPriceUsd);

          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals);

          setToValue(nextToValue);
        }
        return;
      }

      if (!toAmount) {
        setFromValue("");
        return;
      }

      const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
      if (fromTokenInfo && fromTokenInfo.minPrice && toUsdMax && toUsdMax.gt(0)) {
        const leverageMultiplier = parseInt(leverageOption * BASIS_POINTS_DIVISOR);

        const baseFromAmountUsd = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(leverageMultiplier);

        let fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);

        const { feeBasisPoints } = getNextToAmount(
          chainId,
          fromAmount,
          fromTokenAddress,
          collateralTokenAddress,
          infoTokens,
          undefined,
          undefined,
          usdgSupply,
          totalTokenWeights
        );

        if (feeBasisPoints) {
          const swapFees = baseFromAmountUsd.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
          fees = fees.add(swapFees);
        }

        const nextFromUsd = baseFromAmountUsd.add(fees);

        const nextFromAmount = nextFromUsd.mul(expandDecimals(1, fromToken.decimals)).div(fromTokenInfo.minPrice);

        const nextFromValue = formatAmountFree(nextFromAmount, fromToken.decimals, fromToken.decimals);

        setFromValue(nextFromValue);
      }
    };

    if (isSwap) {
      updateSwapAmounts();
    }

    if (isLong || isShort) {
      updateLeverageAmounts();
    }
  }, [
    anchorOnFromAmount,
    fromAmount,
    toAmount,
    fromToken,
    toToken,
    fromTokenAddress,
    toTokenAddress,
    infoTokens,
    isSwap,
    isLong,
    isShort,
    leverageOption,
    fromUsdMin,
    toUsdMax,
    isMarketOrder,
    triggerPriceUsd,
    triggerRatio,
    hasLeverageOption,
    usdgSupply,
    totalTokenWeights,
    chainId,
    collateralTokenAddress,
    indexTokenAddress,
  ]);

  let entryMarkPrice;
  let exitMarkPrice;
  if (toTokenInfo) {
    entryMarkPrice = swapOption === LONG ? toTokenInfo.maxPrice : toTokenInfo.minPrice;
    exitMarkPrice = swapOption === LONG ? toTokenInfo.minPrice : toTokenInfo.maxPrice;
  }

  let leverage = bigNumberify(0);
  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees));
    }
  }

  let nextAveragePrice = isMarketOrder ? entryMarkPrice : triggerPriceUsd;
  if (hasExistingPosition) {
    let nextDelta, nextHasProfit;

    if (isMarketOrder) {
      nextDelta = existingPosition.delta;
      nextHasProfit = existingPosition.hasProfit;
    } else {
      const data = calculatePositionDelta(triggerPriceUsd || bigNumberify(0), existingPosition);
      nextDelta = data.delta;
      nextHasProfit = data.hasProfit;
    }

    nextAveragePrice = getNextAveragePrice({
      size: existingPosition.size,
      sizeDelta: toUsdMax,
      hasProfit: nextHasProfit,
      delta: nextDelta,
      nextPrice: isMarketOrder ? entryMarkPrice : triggerPriceUsd,
      isLong,
    });
  }

  const liquidationPrice = getLiquidationPrice({
    isLong,
    size: hasExistingPosition ? existingPosition.size : bigNumberify(0),
    collateral: hasExistingPosition ? existingPosition.collateral : bigNumberify(0),
    averagePrice: nextAveragePrice,
    entryFundingRate: hasExistingPosition ? existingPosition.entryFundingRate : bigNumberify(0),
    cumulativeFundingRate: hasExistingPosition ? existingPosition.cumulativeFundingRate : bigNumberify(0),
    sizeDelta: toUsdMax,
    collateralDelta: fromUsdMin,
    increaseCollateral: true,
    increaseSize: true,
  });

  const existingLiquidationPrice = existingPosition ? getLiquidationPrice(existingPosition) : undefined;
  let displayLiquidationPrice = liquidationPrice ? liquidationPrice : existingLiquidationPrice;

  if (hasExistingPosition) {
    const collateralDelta = fromUsdMin ? fromUsdMin : bigNumberify(0);
    const sizeDelta = toUsdMax ? toUsdMax : bigNumberify(0);
    leverage = getLeverage({
      size: existingPosition.size,
      sizeDelta,
      collateral: existingPosition.collateral,
      collateralDelta,
      increaseCollateral: true,
      entryFundingRate: existingPosition.entryFundingRate,
      cumulativeFundingRate: existingPosition.cumulativeFundingRate,
      increaseSize: true,
      hasProfit: existingPosition.hasProfit,
      delta: existingPosition.delta,
      includeDelta: savedIsPnlInLeverage,
    });
  } else if (hasLeverageOption) {
    leverage = bigNumberify(parseInt(leverageOption * BASIS_POINTS_DIVISOR));
  }

  const getSwapError = () => {
    if (fromTokenAddress === toTokenAddress) {
      return ["Select different tokens"];
    }

    if (!isMarketOrder) {
      if ((toToken.isStable || toToken.isUsdg) && (fromToken.isStable || fromToken.isUsdg)) {
        return ["Select different tokens"];
      }

      if (fromToken.isNative && toToken.isWrapped) {
        return ["Select different tokens"];
      }

      if (toToken.isNative && fromToken.isWrapped) {
        return ["Select different tokens"];
      }
    }

    if (!fromAmount || fromAmount.eq(0)) {
      return ["Enter an amount"];
    }
    if (!toAmount || toAmount.eq(0)) {
      return ["Enter an amount"];
    }

    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
    if (!fromTokenInfo || !fromTokenInfo.minPrice) {
      return ["Incorrect network"];
    }
    if (fromTokenInfo && fromTokenInfo.balance && fromAmount && fromAmount.gt(fromTokenInfo.balance)) {
      return [`Insufficient ${fromTokenInfo.symbol} balance`];
    }

    const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

    if (!isMarketOrder) {
      if (!triggerRatioValue || triggerRatio.eq(0)) {
        return ["Enter a price"];
      }

      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate && currentRate.lt(triggerRatio)) {
        return [`Price ${triggerRatioInverted ? "below" : "above"} Mark Price`];
      }
    }

    if (
      !isWrapOrUnwrap &&
      toToken &&
      toTokenAddress !== USDG_ADDRESS &&
      toTokenInfo &&
      toTokenInfo.availableAmount &&
      toAmount.gt(toTokenInfo.availableAmount)
    ) {
      return ["Insufficient liquidity"];
    }
    if (
      !isWrapOrUnwrap &&
      toAmount &&
      toTokenInfo.bufferAmount &&
      toTokenInfo.poolAmount &&
      toTokenInfo.bufferAmount.gt(toTokenInfo.poolAmount.sub(toAmount))
    ) {
      return ["Insufficient liquidity"];
    }

    if (
      fromUsdMin &&
      fromTokenInfo.maxUsdgAmount &&
      fromTokenInfo.maxUsdgAmount.gt(0) &&
      fromTokenInfo.usdgAmount &&
      fromTokenInfo.maxPrice
    ) {
      const usdgFromAmount = adjustForDecimals(fromUsdMin, USD_DECIMALS, USDG_DECIMALS);
      const nextUsdgAmount = fromTokenInfo.usdgAmount.add(usdgFromAmount);

      if (nextUsdgAmount.gt(fromTokenInfo.maxUsdgAmount)) {
        return [`${fromTokenInfo.symbol} pool exceeded`];
      }
    }

    return [false];
  };

  const getLeverageError = () => {
    if (hasOutdatedUi) {
      return ["Page outdated, please refresh"];
    }

    if (!toAmount || toAmount.eq(0)) {
      return ["Enter an amount"];
    }

    let toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);
    if (toTokenInfo && toTokenInfo.isStable) {
      return [`${swapOption === LONG ? "Longing" : "Shorting"} ${toTokenInfo.symbol} not supported`];
    }

    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
    if (fromTokenInfo && fromTokenInfo.balance && fromAmount && fromAmount.gt(fromTokenInfo.balance)) {
      return [`Insufficient ${fromTokenInfo.symbol} balance`];
    }

    if (leverage && leverage.eq(0)) {
      return ["Enter an amount"];
    }
    if (!isMarketOrder && (!triggerPriceValue || triggerPriceUsd.eq(0))) {
      return ["Enter a price"];
    }

    if (!hasExistingPosition && fromUsdMin && fromUsdMin.lt(expandDecimals(10, USD_DECIMALS))) {
      return ["Min order: 10 USD"];
    }

    if (leverage && leverage.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return ["Min leverage: 1.1x"];
    }

    if (leverage && leverage.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return ["Max leverage: 30.5x"];
    }

    if (!isMarketOrder && entryMarkPrice && triggerPriceUsd && !savedShouldDisableOrderValidation) {
      if (isLong && entryMarkPrice.lt(triggerPriceUsd)) {
        return ["Price above Mark Price"];
      }
      if (!isLong && entryMarkPrice.gt(triggerPriceUsd)) {
        return ["Price below Mark Price"];
      }
    }

    if (isLong) {
      let requiredAmount = toAmount;
      if (fromTokenAddress !== toTokenAddress) {
        const { amount: swapAmount } = getNextToAmount(
          chainId,
          fromAmount,
          fromTokenAddress,
          toTokenAddress,
          infoTokens,
          undefined,
          undefined,
          usdgSupply,
          totalTokenWeights
        );
        requiredAmount = requiredAmount.add(swapAmount);

        if (toToken && toTokenAddress !== USDG_ADDRESS) {
          if (!toTokenInfo.availableAmount) {
            return ["Liquidity data not loaded"];
          }
          if (toTokenInfo.availableAmount && requiredAmount.gt(toTokenInfo.availableAmount)) {
            return ["Insufficient liquidity"];
          }
        }

        if (
          toTokenInfo.poolAmount &&
          toTokenInfo.bufferAmount &&
          toTokenInfo.bufferAmount.gt(toTokenInfo.poolAmount.sub(swapAmount))
        ) {
          return ["Insufficient liquidity", true, "BUFFER"];
        }

        if (
          fromUsdMin &&
          fromTokenInfo.maxUsdgAmount &&
          fromTokenInfo.maxUsdgAmount.gt(0) &&
          fromTokenInfo.minPrice &&
          fromTokenInfo.usdgAmount
        ) {
          const usdgFromAmount = adjustForDecimals(fromUsdMin, USD_DECIMALS, USDG_DECIMALS);
          const nextUsdgAmount = fromTokenInfo.usdgAmount.add(usdgFromAmount);
          if (nextUsdgAmount.gt(fromTokenInfo.maxUsdgAmount)) {
            return [`${fromTokenInfo.symbol} pool exceeded, try different token`, true, "MAX_USDG"];
          }
        }
      }

      const sizeUsd = toAmount.mul(toTokenInfo.maxPrice).div(expandDecimals(1, toTokenInfo.decimals));
      if (
        toTokenInfo.maxGlobalLongSize &&
        toTokenInfo.maxGlobalLongSize.gt(0) &&
        toTokenInfo.maxAvailableLong &&
        sizeUsd.gt(toTokenInfo.maxAvailableLong)
      ) {
        return [`Max ${toTokenInfo.symbol} long exceeded`];
      }
    }

    if (isShort) {
      let stableTokenAmount = bigNumberify(0);
      if (fromTokenAddress !== shortCollateralAddress && fromAmount && fromAmount.gt(0)) {
        const { amount: nextToAmount } = getNextToAmount(
          chainId,
          fromAmount,
          fromTokenAddress,
          shortCollateralAddress,
          infoTokens,
          undefined,
          undefined,
          usdgSupply,
          totalTokenWeights
        );
        stableTokenAmount = nextToAmount;
        if (stableTokenAmount.gt(shortCollateralToken.availableAmount)) {
          return [`Insufficient liquidity, change "Profits In"`];
        }

        if (
          shortCollateralToken.bufferAmount &&
          shortCollateralToken.poolAmount &&
          shortCollateralToken.bufferAmount.gt(shortCollateralToken.poolAmount.sub(stableTokenAmount))
        ) {
          // suggest swapping to collateralToken
          return [`Insufficient liquidity, change "Profits In"`, true, "BUFFER"];
        }

        if (
          fromTokenInfo.maxUsdgAmount &&
          fromTokenInfo.maxUsdgAmount.gt(0) &&
          fromTokenInfo.minPrice &&
          fromTokenInfo.usdgAmount
        ) {
          const usdgFromAmount = adjustForDecimals(fromUsdMin, USD_DECIMALS, USDG_DECIMALS);
          const nextUsdgAmount = fromTokenInfo.usdgAmount.add(usdgFromAmount);
          if (nextUsdgAmount.gt(fromTokenInfo.maxUsdgAmount)) {
            return [`${fromTokenInfo.symbol} pool exceeded, try different token`, true, "MAX_USDG"];
          }
        }
      }
      if (
        !shortCollateralToken ||
        !fromTokenInfo ||
        !toTokenInfo ||
        !toTokenInfo.maxPrice ||
        !shortCollateralToken.availableAmount
      ) {
        return ["Fetching token info..."];
      }

      const sizeUsd = toAmount.mul(toTokenInfo.maxPrice).div(expandDecimals(1, toTokenInfo.decimals));
      const sizeTokens = sizeUsd
        .mul(expandDecimals(1, shortCollateralToken.decimals))
        .div(shortCollateralToken.minPrice);

      if (!toTokenInfo.maxAvailableShort) {
        return ["Liquidity data not loaded"];
      }

      if (
        toTokenInfo.maxGlobalShortSize &&
        toTokenInfo.maxGlobalShortSize.gt(0) &&
        toTokenInfo.maxAvailableShort &&
        sizeUsd.gt(toTokenInfo.maxAvailableShort)
      ) {
        return [`Max ${toTokenInfo.symbol} short exceeded`];
      }

      stableTokenAmount = stableTokenAmount.add(sizeTokens);
      if (stableTokenAmount.gt(shortCollateralToken.availableAmount)) {
        return [`Insufficient liquidity, change "Profits In"`];
      }
    }

    return [false];
  };

  const getToLabel = () => {
    if (isSwap) {
      return "Receive";
    }
    if (isLong) {
      return "Long";
    }
    return "Short";
  };

  const getError = () => {
    if (isSwap) {
      return getSwapError();
    }
    return getLeverageError();
  };

  const renderOrdersToa = () => {
    if (!ordersToaOpen) {
      return null;
    }

    return (
      <OrdersToa
        setIsVisible={setOrdersToaOpen}
        approveOrderBook={approveOrderBook}
        isPluginApproving={isPluginApproving}
      />
    );
  };

  const renderErrorModal = () => {
    const inputCurrency = fromToken.address === AddressZero ? "ETH" : fromToken.address;
    let outputCurrency;
    if (isLong) {
      outputCurrency = toToken.address === AddressZero ? "ETH" : toToken.address;
    } else {
      outputCurrency = shortCollateralToken.address;
    }
    let externalSwapUrl = "";
    if (chainId === AVALANCHE) {
      externalSwapUrl = `https://traderjoexyz.com/trade?outputCurrency=${outputCurrency}#/`;
    } else {
      externalSwapUrl = `https://app.uniswap.org/#/swap?inputCurrency=${inputCurrency}&outputCurrency=${outputCurrency}`;
    }
    let externalSwapName = chainId === AVALANCHE ? "Trader Joe" : "Uniswap";
    const label =
      modalError === "BUFFER" ? `${shortCollateralToken.symbol} Required` : `${fromToken.symbol} Capacity Reached`;
    const swapTokenSymbol = isLong ? toToken.symbol : shortCollateralToken.symbol;
    return (
      <Modal isVisible={!!modalError} setIsVisible={setModalError} label={label} className="Error-modal font-base">
        <div>You need to select {swapTokenSymbol} as the "Pay" token to initiate this trade.</div>
        <br />
        {isShort && (
          <div>
            Alternatively you can select a different "Profits In" token.
            <br />
            <br />
          </div>
        )}
        <a href={externalSwapUrl} target="_blank" rel="noreferrer">
          Buy {swapTokenSymbol} on {externalSwapName}
        </a>
      </Modal>
    );
  };

  const isPrimaryEnabled = () => {
    if (!active) {
      return true;
    }
    const [error, modal] = getError();
    if (error && !modal) {
      return false;
    }
    if (needOrderBookApproval && isWaitingForPluginApproval) {
      return false;
    }
    if ((needApproval && isWaitingForApproval) || isApproving) {
      return false;
    }
    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return false;
    }
    if (isPositionRouterApproving) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isSubmitting) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    if (!active) {
      return "Connect Wallet";
    }
    if (!isSupportedChain(chainId)) {
      return "Incorrect Network";
    }
    const [error, modal] = getError();
    if (error && !modal) {
      return error;
    }

    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return "Enabling Leverage...";
    }
    if (isPositionRouterApproving) {
      return "Enabling Leverage...";
    }
    if (needPositionRouterApproval) {
      return "Enable Leverage";
    }

    if (needApproval && isWaitingForApproval) {
      return "Waiting for Approval";
    }
    if (isApproving) {
      return `Approving ${fromToken.symbol}...`;
    }
    if (needApproval) {
      return `Approve ${fromToken.symbol}`;
    }

    if (needOrderBookApproval && isWaitingForPluginApproval) {
      return "Enabling Orders...";
    }
    if (isPluginApproving) {
      return "Enabling Orders...";
    }
    if (needOrderBookApproval) {
      return "Enable Orders";
    }

    if (!isMarketOrder) return `Create ${orderOption.charAt(0) + orderOption.substring(1).toLowerCase()} Order`;

    if (isSwap) {
      if (toUsdMax && toUsdMax.lt(fromUsdMin.mul(95).div(100))) {
        return "High Slippage, Swap Anyway";
      }
      return "Swap";
    }

    if (isLong) {
      const indexTokenInfo = getTokenInfo(infoTokens, toTokenAddress);
      if (indexTokenInfo && indexTokenInfo.minPrice) {
        const { amount: nextToAmount } = getNextToAmount(
          chainId,
          fromAmount,
          fromTokenAddress,
          indexTokenAddress,
          infoTokens,
          undefined,
          undefined,
          usdgSupply,
          totalTokenWeights
        );
        const nextToAmountUsd = nextToAmount
          .mul(indexTokenInfo.minPrice)
          .div(expandDecimals(1, indexTokenInfo.decimals));
        if (fromTokenAddress === USDG_ADDRESS && nextToAmountUsd.lt(fromUsdMin.mul(98).div(100))) {
          return "High USDG Slippage, Long Anyway";
        }
      }
      return `Long ${toToken.symbol}`;
    }

    return `Short ${toToken.symbol}`;
  };

  const onSelectFromToken = (token) => {
    setFromTokenAddress(swapOption, token.address);
    setIsWaitingForApproval(false);

    if (isShort && token.isStable) {
      setShortCollateralAddress(token.address);
    }
  };

  const onSelectShortCollateralAddress = (token) => {
    setShortCollateralAddress(token.address);
  };

  const onSelectToToken = (token) => {
    setToTokenAddress(swapOption, token.address);
  };

  const onFromValueChange = (e) => {
    setAnchorOnFromAmount(true);
    setFromValue(e.target.value);
  };

  const onToValueChange = (e) => {
    setAnchorOnFromAmount(false);
    setToValue(e.target.value);
  };

  const switchTokens = () => {
    if (fromAmount && toAmount) {
      if (anchorOnFromAmount) {
        setToValue(formatAmountFree(fromAmount, fromToken.decimals, 8));
      } else {
        setFromValue(formatAmountFree(toAmount, toToken.decimals, 8));
      }
      setAnchorOnFromAmount(!anchorOnFromAmount);
    }
    setIsWaitingForApproval(false);

    const updatedTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
    updatedTokenSelection[swapOption] = {
      from: toTokenAddress,
      to: fromTokenAddress,
    };
    setTokenSelection(updatedTokenSelection);
  };

  const wrap = async () => {
    setIsSubmitting(true);

    const contract = new ethers.Contract(nativeTokenAddress, WETH.abi, library.getSigner());
    Api.callContract(chainId, contract, "deposit", {
      value: fromAmount,
      sentMsg: "Swap submitted.",
      successMsg: `Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      failMsg: "Swap failed.",
      setPendingTxns,
    })
      .then(async (res) => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const unwrap = async () => {
    setIsSubmitting(true);

    const contract = new ethers.Contract(nativeTokenAddress, WETH.abi, library.getSigner());
    Api.callContract(chainId, contract, "withdraw", [fromAmount], {
      sentMsg: "Swap submitted!",
      failMsg: "Swap failed.",
      successMsg: `Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      setPendingTxns,
    })
      .then(async (res) => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const swap = async () => {
    if (fromToken.isNative && toToken.isWrapped) {
      wrap();
      return;
    }

    if (fromTokenAddress.isWrapped && toToken.isNative) {
      unwrap();
      return;
    }

    setIsSubmitting(true);
    let path = [fromTokenAddress, toTokenAddress];
    if (anchorOnFromAmount) {
      const { path: multiPath } = getNextToAmount(
        chainId,
        fromAmount,
        fromTokenAddress,
        toTokenAddress,
        infoTokens,
        undefined,
        undefined,
        usdgSupply,
        totalTokenWeights
      );
      if (multiPath) {
        path = multiPath;
      }
    } else {
      const { path: multiPath } = getNextFromAmount(
        chainId,
        toAmount,
        fromTokenAddress,
        toTokenAddress,
        infoTokens,
        undefined,
        undefined,
        usdgSupply,
        totalTokenWeights
      );
      if (multiPath) {
        path = multiPath;
      }
    }

    let method;
    let contract;
    let value;
    let params;
    let minOut;
    if (shouldRaiseGasError(getTokenInfo(infoTokens, fromTokenAddress), fromAmount)) {
      setIsSubmitting(false);
      setIsPendingConfirmation(true);
      helperToast.error(
        `Leave at least ${formatAmount(DUST_BNB, 18, 3)} ${getConstant(chainId, "nativeTokenSymbol")} for gas`
      );
      return;
    }

    if (!isMarketOrder) {
      minOut = toAmount;
      Api.createSwapOrder(chainId, library, path, fromAmount, minOut, triggerRatio, nativeTokenAddress, {
        sentMsg: "Swap Order submitted!",
        successMsg: "Swap Order created!",
        failMsg: "Swap Order creation failed.",
        pendingTxns,
        setPendingTxns,
      })
        .then(() => {
          setIsConfirming(false);
        })
        .finally(() => {
          setIsSubmitting(false);
          setIsPendingConfirmation(false);
        });
      return;
    }

    path = replaceNativeTokenAddress(path, nativeTokenAddress);
    method = "swap";
    value = bigNumberify(0);
    if (toTokenAddress === AddressZero) {
      method = "swapTokensToETH";
    }

    minOut = toAmount.mul(BASIS_POINTS_DIVISOR - allowedSlippage).div(BASIS_POINTS_DIVISOR);
    params = [path, fromAmount, minOut, account];
    if (fromTokenAddress === AddressZero) {
      method = "swapETHToTokens";
      value = fromAmount;
      params = [path, minOut, account];
    }
    contract = new ethers.Contract(routerAddress, Router.abi, library.getSigner());

    Api.callContract(chainId, contract, method, params, {
      value,
      sentMsg: `Swap ${!isMarketOrder ? " order " : ""} submitted!`,
      successMsg: `Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      failMsg: "Swap failed.",
      setPendingTxns,
    })
      .then(async () => {
        setIsConfirming(false);
      })
      .finally(() => {
        setIsSubmitting(false);
        setIsPendingConfirmation(false);
      });
  };

  const createIncreaseOrder = () => {
    let path = [fromTokenAddress];

    if (path[0] === USDG_ADDRESS) {
      if (isLong) {
        const stableToken = getMostAbundantStableToken(chainId, infoTokens);
        path.push(stableToken.address);
      } else {
        path.push(shortCollateralAddress);
      }
    }

    const minOut = 0;
    const indexToken = getToken(chainId, indexTokenAddress);
    const successMsg = `
      Created limit order for ${indexToken.symbol} ${isLong ? "Long" : "Short"}: ${formatAmount(
      toUsdMax,
      USD_DECIMALS,
      2
    )} USD!
    `;
    return Api.createIncreaseOrder(
      chainId,
      library,
      nativeTokenAddress,
      path,
      fromAmount,
      indexTokenAddress,
      minOut,
      toUsdMax,
      collateralTokenAddress,
      isLong,
      triggerPriceUsd,
      {
        pendingTxns,
        setPendingTxns,
        sentMsg: "Limit order submitted!",
        successMsg,
        failMsg: "Limit order creation failed.",
      }
    )
      .then(() => {
        setIsConfirming(false);
      })
      .finally(() => {
        setIsSubmitting(false);
        setIsPendingConfirmation(false);
      });
  };

  let referralCode = ethers.constants.HashZero;
  if (!attachedOnChain && userReferralCode) {
    referralCode = userReferralCode;
  }

  const increasePosition = async () => {
    setIsSubmitting(true);
    const tokenAddress0 = fromTokenAddress === AddressZero ? nativeTokenAddress : fromTokenAddress;
    const indexTokenAddress = toTokenAddress === AddressZero ? nativeTokenAddress : toTokenAddress;
    let path = [indexTokenAddress]; // assume long
    if (toTokenAddress !== fromTokenAddress) {
      path = [tokenAddress0, indexTokenAddress];
    }

    if (fromTokenAddress === AddressZero && toTokenAddress === nativeTokenAddress) {
      path = [nativeTokenAddress];
    }

    if (fromTokenAddress === nativeTokenAddress && toTokenAddress === AddressZero) {
      path = [nativeTokenAddress];
    }

    if (isShort) {
      path = [shortCollateralAddress];
      if (tokenAddress0 !== shortCollateralAddress) {
        path = [tokenAddress0, shortCollateralAddress];
      }
    }

    const refPrice = isLong ? toTokenInfo.maxPrice : toTokenInfo.minPrice;
    const priceBasisPoints = isLong ? BASIS_POINTS_DIVISOR + allowedSlippage : BASIS_POINTS_DIVISOR - allowedSlippage;
    const priceLimit = refPrice.mul(priceBasisPoints).div(BASIS_POINTS_DIVISOR);

    const boundedFromAmount = fromAmount ? fromAmount : bigNumberify(0);

    if (fromAmount && fromAmount.gt(0) && fromTokenAddress === USDG_ADDRESS && isLong) {
      const { amount: nextToAmount, path: multiPath } = getNextToAmount(
        chainId,
        fromAmount,
        fromTokenAddress,
        indexTokenAddress,
        infoTokens,
        undefined,
        undefined,
        usdgSupply,
        totalTokenWeights
      );
      if (nextToAmount.eq(0)) {
        helperToast.error("Insufficient liquidity");
        return;
      }
      if (multiPath) {
        path = replaceNativeTokenAddress(multiPath);
      }
    }

    let params = [
      path, // _path
      indexTokenAddress, // _indexToken
      boundedFromAmount, // _amountIn
      0, // _minOut
      toUsdMax, // _sizeDelta
      isLong, // _isLong
      priceLimit, // _acceptablePrice
      minExecutionFee, // _executionFee
      referralCode, // _referralCode
    ];

    let method = "createIncreasePosition";
    let value = minExecutionFee;
    if (fromTokenAddress === AddressZero) {
      method = "createIncreasePositionETH";
      value = boundedFromAmount.add(minExecutionFee);
      params = [
        path, // _path
        indexTokenAddress, // _indexToken
        0, // _minOut
        toUsdMax, // _sizeDelta
        isLong, // _isLong
        priceLimit, // _acceptablePrice
        minExecutionFee, // _executionFee
        referralCode, // _referralCode
      ];
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, fromTokenAddress), fromAmount)) {
      setIsSubmitting(false);
      setIsPendingConfirmation(false);
      helperToast.error(
        `Leave at least ${formatAmount(DUST_BNB, 18, 3)} ${getConstant(chainId, "nativeTokenSymbol")} for gas`
      );
      return;
    }

    const contractAddress = getContract(chainId, "PositionRouter");
    const contract = new ethers.Contract(contractAddress, PositionRouter.abi, library.getSigner());
    const indexToken = getTokenInfo(infoTokens, indexTokenAddress);
    const tokenSymbol = indexToken.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexToken.symbol;
    const successMsg = `Requested increase of ${tokenSymbol} ${isLong ? "Long" : "Short"} by ${formatAmount(
      toUsdMax,
      USD_DECIMALS,
      2
    )} USD.`;

    Api.callContract(chainId, contract, method, params, {
      value,
      setPendingTxns,
      sentMsg: `${isLong ? "Long" : "Short"} submitted.`,
      failMsg: `${isLong ? "Long" : "Short"} failed.`,
      successMsg,
    })
      .then(async () => {
        setIsConfirming(false);

        const key = getPositionKey(account, path[path.length - 1], indexTokenAddress, isLong);
        let nextSize = toUsdMax;
        if (hasExistingPosition) {
          nextSize = existingPosition.size.add(toUsdMax);
        }

        pendingPositions[key] = {
          updatedAt: Date.now(),
          pendingChanges: {
            size: nextSize,
          },
        };

        setPendingPositions({ ...pendingPositions });
      })
      .finally(() => {
        setIsSubmitting(false);
        setIsPendingConfirmation(false);
      });
  };

  const onSwapOptionChange = (opt) => {
    setSwapOption(opt);
    setAnchorOnFromAmount(true);
    setFromValue("");
    setToValue("");
    setTriggerPriceValue("");
    setTriggerRatioValue("");

    if (opt === SHORT && infoTokens) {
      const fromToken = getToken(chainId, tokenSelection[opt].from);
      if (fromToken && fromToken.isStable) {
        setShortCollateralAddress(fromToken.address);
      } else {
        const stableToken = getMostAbundantStableToken(chainId, infoTokens);
        setShortCollateralAddress(stableToken.address);
      }
    }
  };

  const onConfirmationClick = () => {
    if (!active) {
      props.connectWallet();
      return;
    }

    if (needOrderBookApproval) {
      approveOrderBook();
      return;
    }

    setIsPendingConfirmation(true);

    if (isSwap) {
      swap();
      return;
    }

    if (orderOption === LIMIT) {
      createIncreaseOrder();
      return;
    }

    increasePosition();
  };

  function approveFromToken() {
    approveTokens({
      setIsApproving,
      library,
      tokenAddress: fromToken.address,
      spender: routerAddress,
      chainId: chainId,
      onApproveSubmitted: () => {
        setIsWaitingForApproval(true);
      },
      infoTokens,
      getTokenInfo,
      pendingTxns,
      setPendingTxns,
    });
  }

  const onClickPrimary = () => {
    if (!active) {
      props.connectWallet();
      return;
    }

    if (needPositionRouterApproval) {
      approvePositionRouter({
        sentMsg: "Enable leverage sent.",
        failMsg: "Enable leverage failed.",
      });
      return;
    }

    if (needApproval) {
      approveFromToken();
      return;
    }

    if (needOrderBookApproval) {
      setOrdersToaOpen(true);
      return;
    }

    const [, modal, errorCode] = getError();

    if (modal) {
      setModalError(errorCode);
      return;
    }

    if (isSwap) {
      if (fromTokenAddress === AddressZero && toTokenAddress === nativeTokenAddress) {
        wrap();
        return;
      }

      if (fromTokenAddress === nativeTokenAddress && toTokenAddress === AddressZero) {
        unwrap();
        return;
      }
    }

    setIsConfirming(true);
    setIsHigherSlippageAllowed(false);
  };

  const showFromAndToSection = orderOption !== STOP;
  const showSizeSection = orderOption === STOP;
  const showTriggerPriceSection = !isSwap && !isMarketOrder;
  const showTriggerRatioSection = isSwap && !isMarketOrder;

  let fees;
  let feesUsd;
  let feeBps;
  let swapFees;
  let positionFee;
  if (isSwap) {
    if (fromAmount) {
      const { feeBasisPoints } = getNextToAmount(
        chainId,
        fromAmount,
        fromTokenAddress,
        toTokenAddress,
        infoTokens,
        undefined,
        undefined,
        usdgSupply,
        totalTokenWeights
      );
      if (feeBasisPoints !== undefined) {
        fees = fromAmount.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
        const feeTokenPrice =
          fromTokenInfo.address === USDG_ADDRESS ? expandDecimals(1, USD_DECIMALS) : fromTokenInfo.maxPrice;
        feesUsd = fees.mul(feeTokenPrice).div(expandDecimals(1, fromTokenInfo.decimals));
      }
      feeBps = feeBasisPoints;
    }
  } else if (toUsdMax) {
    positionFee = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
    feesUsd = positionFee;

    const { feeBasisPoints } = getNextToAmount(
      chainId,
      fromAmount,
      fromTokenAddress,
      collateralTokenAddress,
      infoTokens,
      undefined,
      undefined,
      usdgSupply,
      totalTokenWeights
    );
    if (feeBasisPoints) {
      swapFees = fromUsdMin.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
      feesUsd = feesUsd.add(swapFees);
    }
    feeBps = feeBasisPoints;
  }

  const leverageMarks = {
    2: "2x",
    5: "5x",
    10: "10x",
    15: "15x",
    20: "20x",
    25: "25x",
    30: "30x",
  };

  if (!fromToken || !toToken) {
    return null;
  }

  let hasZeroBorrowFee = false;
  let borrowFeeText;
  if (isLong && toTokenInfo && toTokenInfo.fundingRate) {
    borrowFeeText = formatAmount(toTokenInfo.fundingRate, 4, 4) + "% / 1h";
    if (toTokenInfo.fundingRate.eq(0)) {
      // hasZeroBorrowFee = true
    }
  }
  if (isShort && shortCollateralToken && shortCollateralToken.fundingRate) {
    borrowFeeText = formatAmount(shortCollateralToken.fundingRate, 4, 4) + "% / 1h";
    if (shortCollateralToken.fundingRate.eq(0)) {
      // hasZeroBorrowFee = true
    }
  }

  function setFromValueToMaximumAvailable() {
    if (!fromToken || !fromBalance) {
      return;
    }

    const maxAvailableAmount = fromToken.isNative ? fromBalance.sub(bigNumberify(DUST_BNB).mul(2)) : fromBalance;
    setFromValue(formatAmountFree(maxAvailableAmount, fromToken.decimals, fromToken.decimals));
    setAnchorOnFromAmount(true);
  }

  function shouldShowMaxButton() {
    if (!fromToken || !fromBalance) {
      return false;
    }
    const maxAvailableAmount = fromToken.isNative ? fromBalance.sub(bigNumberify(DUST_BNB).mul(2)) : fromBalance;
    return fromValue !== formatAmountFree(maxAvailableAmount, fromToken.decimals, fromToken.decimals);
  }

  return (
    <div className="Exchange-swap-box">
      {/* <div className="Exchange-swap-wallet-box App-box">
        {active && <div className="Exchange-swap-account" >
        </div>}
      </div> */}
      <div className="Exchange-swap-box-inner App-box-highlight">
        <div>
          <Tab
            icons={SWAP_ICONS}
            options={SWAP_OPTIONS}
            option={swapOption}
            onChange={onSwapOptionChange}
            className="Exchange-swap-option-tabs"
          />
          {flagOrdersEnabled && (
            <Tab
              options={orderOptions}
              className="Exchange-swap-order-type-tabs"
              type="inline"
              option={orderOption}
              onChange={onOrderOptionChange}
            />
          )}
        </div>
        {showFromAndToSection && (
          <React.Fragment>
            <div className="Exchange-swap-section">
              <div className="Exchange-swap-section-top">
                <div className="muted">
                  {fromUsdMin && (
                    <div className="Exchange-swap-usd">Pay: {formatAmount(fromUsdMin, USD_DECIMALS, 2, true)} USD</div>
                  )}
                  {!fromUsdMin && "Pay"}
                </div>
                {fromBalance && (
                  <div className="muted align-right clickable" onClick={setFromValueToMaximumAvailable}>
                    Balance: {formatAmount(fromBalance, fromToken.decimals, 4, true)}
                  </div>
                )}
              </div>
              <div className="Exchange-swap-section-bottom">
                <div className="Exchange-swap-input-container">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    className="Exchange-swap-input"
                    value={fromValue}
                    onChange={onFromValueChange}
                  />
                  {shouldShowMaxButton() && (
                    <div className="Exchange-swap-max" onClick={setFromValueToMaximumAvailable}>
                      MAX
                    </div>
                  )}
                </div>
                <div>
                  <TokenSelector
                    label="Pay"
                    chainId={chainId}
                    tokenAddress={fromTokenAddress}
                    onSelectToken={onSelectFromToken}
                    tokens={fromTokens}
                    infoTokens={infoTokens}
                    showMintingCap={false}
                    showTokenImgInDropdown={true}
                  />
                </div>
              </div>
            </div>
            <div className="Exchange-swap-ball-container">
              <div className="Exchange-swap-ball" onClick={switchTokens}>
                <IoMdSwap className="Exchange-swap-ball-icon" />
              </div>
            </div>
            <div className="Exchange-swap-section">
              <div className="Exchange-swap-section-top">
                <div className="muted">
                  {toUsdMax && (
                    <div className="Exchange-swap-usd">
                      {getToLabel()}: {formatAmount(toUsdMax, USD_DECIMALS, 2, true)} USD
                    </div>
                  )}
                  {!toUsdMax && getToLabel()}
                </div>
                {toBalance && isSwap && (
                  <div className="muted align-right">Balance: {formatAmount(toBalance, toToken.decimals, 4, true)}</div>
                )}
                {(isLong || isShort) && hasLeverageOption && (
                  <div className="muted align-right">Leverage: {parseFloat(leverageOption).toFixed(2)}x</div>
                )}
              </div>
              <div className="Exchange-swap-section-bottom">
                <div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    className="Exchange-swap-input"
                    value={toValue}
                    onChange={onToValueChange}
                  />
                </div>
                <div>
                  <TokenSelector
                    label={getTokenLabel()}
                    chainId={chainId}
                    tokenAddress={toTokenAddress}
                    onSelectToken={onSelectToToken}
                    tokens={toTokens}
                    infoTokens={infoTokens}
                    showTokenImgInDropdown={true}
                  />
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
        {showSizeSection && (
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">Sell, USD</div>
              {existingPosition && (
                <div
                  className="muted align-right clickable"
                  onClick={() => {
                    setSellValue(formatAmountFree(existingPosition.size, USD_DECIMALS, 2));
                  }}
                >
                  Position: {formatAmount(existingPosition.size, USD_DECIMALS, 2, true)}
                </div>
              )}
            </div>
            <div className="Exchange-swap-section-bottom">
              <div className="Exchange-swap-input-container">
                <input
                  type="number"
                  min="0"
                  placeholder="0.0"
                  className="Exchange-swap-input"
                  value={sellValue}
                  onChange={onSellChange}
                />
                {existingPosition && sellValue !== formatAmountFree(existingPosition.size, USD_DECIMALS, 2) && (
                  <div
                    className="Exchange-swap-max"
                    onClick={() => {
                      setSellValue(formatAmountFree(existingPosition.size, USD_DECIMALS, 2));
                    }}
                  >
                    MAX
                  </div>
                )}
              </div>
              <div>
                <TokenSelector
                  label="To"
                  chainId={chainId}
                  tokenAddress={toTokenAddress}
                  onSelectToken={onSelectToToken}
                  tokens={toTokens}
                  infoTokens={infoTokens}
                />
              </div>
            </div>
          </div>
        )}
        {showTriggerRatioSection && (
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">Price</div>
              {fromTokenInfo && toTokenInfo && (
                <div
                  className="muted align-right clickable"
                  onClick={() => {
                    setTriggerRatioValue(
                      formatAmountFree(
                        getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted),
                        USD_DECIMALS,
                        10
                      )
                    );
                  }}
                >
                  {formatAmount(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 4)}
                </div>
              )}
            </div>
            <div className="Exchange-swap-section-bottom">
              <div className="Exchange-swap-input-container">
                <input
                  type="number"
                  min="0"
                  placeholder="0.0"
                  className="Exchange-swap-input small"
                  value={triggerRatioValue}
                  onChange={onTriggerRatioChange}
                />
              </div>
              {(() => {
                if (!toTokenInfo) return;
                if (!fromTokenInfo) return;
                const [tokenA, tokenB] = triggerRatioInverted
                  ? [toTokenInfo, fromTokenInfo]
                  : [fromTokenInfo, toTokenInfo];
                return (
                  <div className="PositionEditor-token-symbol">
                    {tokenA.symbol}&nbsp;per&nbsp;{tokenB.symbol}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {showTriggerPriceSection && (
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">Price</div>
              <div
                className="muted align-right clickable"
                onClick={() => {
                  setTriggerPriceValue(formatAmountFree(entryMarkPrice, USD_DECIMALS, 2));
                }}
              >
                Mark: {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-swap-section-bottom">
              <div className="Exchange-swap-input-container">
                <input
                  type="number"
                  min="0"
                  placeholder="0.0"
                  className="Exchange-swap-input"
                  value={triggerPriceValue}
                  onChange={onTriggerPriceChange}
                />
              </div>
              <div className="PositionEditor-token-symbol">USD</div>
            </div>
          </div>
        )}
        {isSwap && (
          <div className="Exchange-swap-box-info">
            <ExchangeInfoRow label="Fees">
              <div>
                {!fees && "-"}
                {fees && (
                  <div>
                    {formatAmount(feeBps, 2, 2, false)}%&nbsp; ({formatAmount(fees, fromToken.decimals, 4, true)}{" "}
                    {fromToken.symbol}: ${formatAmount(feesUsd, USD_DECIMALS, 2, true)})
                  </div>
                )}
              </div>
            </ExchangeInfoRow>
          </div>
        )}
        {(isLong || isShort) && (
          <div className="Exchange-leverage-box">
            <div className="Exchange-leverage-slider-settings">
              <Checkbox isChecked={isLeverageSliderEnabled} setIsChecked={setIsLeverageSliderEnabled}>
                <span className="muted">Leverage slider</span>
              </Checkbox>
            </div>
            {isLeverageSliderEnabled && (
              <div
                className={cx("Exchange-leverage-slider", "App-slider", {
                  positive: isLong,
                  negative: isShort,
                })}
              >
                <Slider
                  min={1.1}
                  max={30.5}
                  step={0.1}
                  marks={leverageMarks}
                  handle={leverageSliderHandle}
                  onChange={(value) => setLeverageOption(value)}
                  value={leverageOption}
                  defaultValue={leverageOption}
                />
              </div>
            )}
            {isShort && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">Profits In</div>
                <div className="align-right">
                  <TokenSelector
                    label="Profits In"
                    chainId={chainId}
                    tokenAddress={shortCollateralAddress}
                    onSelectToken={onSelectShortCollateralAddress}
                    tokens={stableTokens}
                    showTokenImgInDropdown={true}
                  />
                </div>
              </div>
            )}
            {isLong && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">Profits In</div>
                <div className="align-right strong">{toToken.symbol}</div>
              </div>
            )}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Leverage</div>
              <div className="align-right">
                {hasExistingPosition && toAmount && toAmount.gt(0) && (
                  <div className="inline-block muted">
                    {formatAmount(existingPosition.leverage, 4, 2)}x
                    <BsArrowRight className="transition-arrow" />
                  </div>
                )}
                {toAmount && leverage && leverage.gt(0) && `${formatAmount(leverage, 4, 2)}x`}
                {!toAmount && leverage && leverage.gt(0) && `-`}
                {leverage && leverage.eq(0) && `-`}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Entry Price</div>
              <div className="align-right">
                {hasExistingPosition && toAmount && toAmount.gt(0) && (
                  <div className="inline-block muted">
                    ${formatAmount(existingPosition.averagePrice, USD_DECIMALS, 2, true)}
                    <BsArrowRight className="transition-arrow" />
                  </div>
                )}
                {nextAveragePrice && `$${formatAmount(nextAveragePrice, USD_DECIMALS, 2, true)}`}
                {!nextAveragePrice && `-`}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Liq. Price</div>
              <div className="align-right">
                {hasExistingPosition && toAmount && toAmount.gt(0) && (
                  <div className="inline-block muted">
                    ${formatAmount(existingLiquidationPrice, USD_DECIMALS, 2, true)}
                    <BsArrowRight className="transition-arrow" />
                  </div>
                )}
                {toAmount &&
                  displayLiquidationPrice &&
                  `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, 2, true)}`}
                {!toAmount && displayLiquidationPrice && `-`}
                {!displayLiquidationPrice && `-`}
              </div>
            </div>
            <ExchangeInfoRow label="Fees">
              <div>
                {!feesUsd && "-"}
                {feesUsd && (
                  <Tooltip
                    handle={`$${formatAmount(feesUsd, USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          {swapFees && (
                            <div>
                              {collateralToken.symbol} is required for collateral. <br />
                              <br />
                              Swap {fromToken.symbol} to {collateralToken.symbol} Fee: $
                              {formatAmount(swapFees, USD_DECIMALS, 2, true)}
                              <br />
                              <br />
                            </div>
                          )}
                          <div>
                            Position Fee (0.1% of position size): ${formatAmount(positionFee, USD_DECIMALS, 2, true)}
                          </div>
                        </>
                      );
                    }}
                  />
                )}
              </div>
            </ExchangeInfoRow>
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </div>
      {isSwap && (
        <div className="Exchange-swap-market-box App-box App-box-border">
          <div className="Exchange-swap-market-box-title">Swap</div>
          <div className="App-card-divider"></div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{fromToken.symbol} Price</div>
            <div className="align-right">
              {fromTokenInfo && formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)} USD
            </div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">{toToken.symbol} Price</div>
            <div className="align-right">
              {toTokenInfo && formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)} USD
            </div>
          </div>
          {!isMarketOrder && (
            <ExchangeInfoRow label="Price">
              {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromToken, toToken)}
            </ExchangeInfoRow>
          )}
        </div>
      )}
      {(isLong || isShort) && (
        <div className="Exchange-swap-market-box App-box App-box-border">
          <div className="Exchange-swap-market-box-title">
            {isLong ? "Long" : "Short"}&nbsp;{toToken.symbol}
          </div>
          <div className="App-card-divider"></div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Entry Price</div>
            <div className="align-right">
              <Tooltip
                handle={`${formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD`}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <>
                      The position will be opened at {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD with a
                      max slippage of {parseFloat(savedSlippageAmount / 100.0).toFixed(2)}%.
                      <br />
                      <br />
                      The slippage amount can be configured under Settings, found by clicking on your address at the top
                      right of the page after connecting your wallet.
                      <br />
                      <br />
                      <a
                        href="https://gmxio.gitbook.io/gmx/trading#opening-a-position"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More Info
                      </a>
                    </>
                  );
                }}
              />
            </div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Exit Price</div>
            <div className="align-right">
              <Tooltip
                handle={`${formatAmount(exitMarkPrice, USD_DECIMALS, 2, true)} USD`}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <>
                      If you have an existing position, the position will be closed at{" "}
                      {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD.
                      <br />
                      <br />
                      This exit price will change with the price of the asset.
                      <br />
                      <br />
                      <a
                        href="https://gmxio.gitbook.io/gmx/trading#opening-a-position"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More Info
                      </a>
                    </>
                  );
                }}
              />
            </div>
          </div>
          <div className="Exchange-info-row">
            <div className="Exchange-info-label">Borrow Fee</div>
            <div className="align-right">
              <Tooltip
                handle={borrowFeeText}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <>
                      {hasZeroBorrowFee && (
                        <div>
                          {isLong && "There are more shorts than longs, borrow fees for longing is currently zero"}
                          {isShort && "There are more longs than shorts, borrow fees for shorting is currently zero"}
                        </div>
                      )}
                      {!hasZeroBorrowFee && (
                        <div>
                          The borrow fee is calculated as (assets borrowed) / (total assets in pool) * 0.01% per hour.
                          <br />
                          <br />
                          {isShort && `You can change the "Profits In" token above to find lower fees`}
                        </div>
                      )}
                      <br />
                      <a
                        href="https://gmxio.gitbook.io/gmx/trading#opening-a-position"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        More Info
                      </a>
                    </>
                  );
                }}
              >
                {!hasZeroBorrowFee && null}
              </Tooltip>
            </div>
          </div>
          {renderAvailableLongLiquidity()}
          {isShort && toTokenInfo.hasMaxAvailableShort && (
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">Available Liquidity</div>
              <div className="align-right">
                <Tooltip
                  handle={`${formatAmount(toTokenInfo.maxAvailableShort, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        Max {toTokenInfo.symbol} short capacity: $
                        {formatAmount(toTokenInfo.maxGlobalShortSize, USD_DECIMALS, 2, true)}
                        <br />
                        <br />
                        Current {toTokenInfo.symbol} shorts: $
                        {formatAmount(toTokenInfo.globalShortSize, USD_DECIMALS, 2, true)}
                        <br />
                      </>
                    );
                  }}
                ></Tooltip>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="Exchange-swap-market-box App-box App-box-border">
        <div className="Exchange-swap-market-box-title">Useful Links</div>
        <div className="App-card-divider"></div>
        <div className="Exchange-info-row">
          <div className="Exchange-info-label-button">
            <a href="https://gmxio.gitbook.io/gmx/trading" target="_blank" rel="noopener noreferrer">
              Trading guide
            </a>
          </div>
        </div>
        <div className="Exchange-info-row">
          <div className="Exchange-info-label-button">
            <a href={getLeaderboardLink()} target="_blank" rel="noopener noreferrer">
              Leaderboard
            </a>
          </div>
        </div>
        <div className="Exchange-info-row">
          <div className="Exchange-info-label-button">
            <a href="https://gmxio.gitbook.io/gmx/trading#backup-rpc-urls" target="_blank" rel="noopener noreferrer">
              Speed up page loading
            </a>
          </div>
        </div>
      </div>
      {renderErrorModal()}
      {renderOrdersToa()}
      {isConfirming && (
        <ConfirmationBox
          library={library}
          isHigherSlippageAllowed={isHigherSlippageAllowed}
          setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
          orders={orders}
          isSwap={isSwap}
          isLong={isLong}
          isMarketOrder={isMarketOrder}
          orderOption={orderOption}
          isShort={isShort}
          fromToken={fromToken}
          fromTokenInfo={fromTokenInfo}
          toToken={toToken}
          toTokenInfo={toTokenInfo}
          toAmount={toAmount}
          fromAmount={fromAmount}
          feeBps={feeBps}
          onConfirmationClick={onConfirmationClick}
          setIsConfirming={setIsConfirming}
          hasExistingPosition={hasExistingPosition}
          shortCollateralAddress={shortCollateralAddress}
          shortCollateralToken={shortCollateralToken}
          leverage={leverage}
          existingPosition={existingPosition}
          existingLiquidationPrice={existingLiquidationPrice}
          displayLiquidationPrice={displayLiquidationPrice}
          nextAveragePrice={nextAveragePrice}
          triggerPriceUsd={triggerPriceUsd}
          triggerRatio={triggerRatio}
          fees={fees}
          feesUsd={feesUsd}
          isSubmitting={isSubmitting}
          isPendingConfirmation={isPendingConfirmation}
          fromUsdMin={fromUsdMin}
          toUsdMax={toUsdMax}
          collateralTokenAddress={collateralTokenAddress}
          infoTokens={infoTokens}
          chainId={chainId}
          setPendingTxns={setPendingTxns}
          pendingTxns={pendingTxns}
        />
      )}
    </div>
  );
}
