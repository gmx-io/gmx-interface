import { Trans, t } from "@lingui/macro";
import React, { useEffect, useMemo, useState } from "react";
import Tooltip from "../Tooltip/Tooltip";
import "./SwapBox.scss";

import { ethers } from "ethers";
import useSWR from "swr";

import { BsArrowRight } from "react-icons/bs";
import { IoMdSwap } from "react-icons/io";

import { ARBITRUM, IS_NETWORK_DISABLED, getChainName, getConstant, isSupportedChain } from "config/chains";
import { getContract } from "config/contracts";
import * as Api from "domain/legacy";
import {
  DUST_BNB,
  LEVERAGE_ORDER_OPTIONS,
  LIMIT,
  LONG,
  MARGIN_FEE_BASIS_POINTS,
  MARKET,
  PRECISION,
  SHORT,
  STOP,
  SWAP,
  SWAP_OPTIONS,
  SWAP_ORDER_OPTIONS,
  USDG_ADDRESS,
  USDG_DECIMALS,
  USD_DECIMALS,
  adjustForDecimals,
  calculatePositionDelta,
  getExchangeRate,
  getExchangeRateDisplay,
  getNextFromAmount,
  getNextToAmount,
  getPositionKey,
  isTriggerRatioInverted,
} from "lib/legacy";
import { DEFAULT_HIGHER_SLIPPAGE_AMOUNT } from "config/factors";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";

import TokenSelector from "components/TokenSelector/TokenSelector";
import Tab from "../Tab/Tab";
import ConfirmationBox from "./ConfirmationBox";
import ExchangeInfoRow from "./ExchangeInfoRow";
import OrdersToa from "./OrdersToa";

import PositionRouter from "abis/PositionRouter.json";
import Router from "abis/Router.json";
import Token from "abis/Token.json";
import WETH from "abis/WETH.json";

import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import { get1InchSwapUrl } from "config/links";
import { getPriceDecimals, getToken, getTokenBySymbol, getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { useUserReferralCode } from "domain/referrals/hooks";
import {
  approveTokens,
  getMostAbundantStableToken,
  replaceNativeTokenAddress,
  shouldRaiseGasError,
} from "domain/tokens";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, limitDecimals, parseValue } from "lib/numbers";
import { getLeverage } from "lib/positions/getLeverage";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { usePrevious } from "lib/usePrevious";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import FeesTooltip from "./FeesTooltip";
import NoLiquidityErrorModal from "./NoLiquidityErrorModal";
import UsefulLinks from "./UsefulLinks";
import { ErrorCode, ErrorDisplayType } from "./constants";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";

const SWAP_ICONS = {
  [LONG]: longImg,
  [SHORT]: shortImg,
  [SWAP]: swapImg,
};

const { AddressZero } = ethers.constants;

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
    positions,
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
    savedShouldDisableValidationForTesting,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
  } = props;
  const isMetamaskMobile = useIsMetamaskMobile();
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

  function getTokenLabel() {
    switch (true) {
      case isLong:
        return t`Long`;
      case isShort:
        return t`Short`;
      case isSwap:
        return t`Receive`;
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

  const isMarketOrder = orderOption === MARKET;
  const orderOptions = isSwap ? SWAP_ORDER_OPTIONS : LEVERAGE_ORDER_OPTIONS;
  const orderOptionLabels = { [STOP]: t`Trigger`, [MARKET]: t`Market`, [LIMIT]: t`Limit` };

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

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokens = getV1Tokens(chainId);
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
      fetcher: contractFetcher(library, Token),
    }
  );

  const { data: hasOutdatedUi } = Api.useHasOutdatedUi();

  const fromToken = getToken(chainId, fromTokenAddress);
  const toToken = getToken(chainId, toTokenAddress);
  const shortCollateralToken = getTokenInfo(infoTokens, shortCollateralAddress);
  const toTokenPriceDecimal = getPriceDecimals(chainId, toToken.symbol);
  const existingPositionPriceDecimal = getPriceDecimals(chainId, existingPosition?.indexToken?.symbol);

  const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
  const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

  const renderAvailableLongLiquidity = () => {
    if (!isLong) {
      return null;
    }

    return (
      <div className="Exchange-info-row">
        <div className="Exchange-info-label">
          <Trans>Available Liquidity</Trans>
        </div>
        <div className="align-right">
          <Tooltip
            handle={`$${formatAmount(toTokenInfo?.maxAvailableLong, USD_DECIMALS, 2, true)}`}
            position="right-bottom"
            renderContent={() => {
              return (
                <>
                  <StatsTooltipRow
                    label={t`Max ${toTokenInfo.symbol} long capacity`}
                    value={formatAmount(toTokenInfo.maxLongCapacity, USD_DECIMALS, 0, true)}
                  />
                  <StatsTooltipRow
                    label={t`Current ${toTokenInfo.symbol} long`}
                    value={formatAmount(toTokenInfo.guaranteedUsd, USD_DECIMALS, 0, true)}
                  />
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

  const maxToTokenOut = useMemo(() => {
    const value = toTokenInfo?.availableAmount?.gt(toTokenInfo.poolAmount?.sub(toTokenInfo.bufferAmount))
      ? toTokenInfo.poolAmount?.sub(toTokenInfo.bufferAmount)
      : toTokenInfo?.availableAmount;

    if (!value) {
      return bigNumberify(0);
    }

    return value.gt(0) ? value : bigNumberify(0);
  }, [toTokenInfo]);

  const maxToTokenOutUSD = useMemo(() => {
    return getUsd(maxToTokenOut, toTokenAddress, false, infoTokens);
  }, [maxToTokenOut, toTokenAddress, infoTokens]);

  const maxFromTokenInUSD = useMemo(() => {
    const value = fromTokenInfo.maxUsdgAmount
      ?.sub(fromTokenInfo.usdgAmount)
      .mul(expandDecimals(1, USD_DECIMALS))
      .div(expandDecimals(1, USDG_DECIMALS));

    if (!value) {
      return bigNumberify(0);
    }

    return value.gt(0) ? value : bigNumberify(0);
  }, [fromTokenInfo]);

  const maxFromTokenIn = useMemo(() => {
    if (!fromTokenInfo.maxPrice) {
      return bigNumberify(0);
    }
    return maxFromTokenInUSD?.mul(expandDecimals(1, fromTokenInfo.decimals)).div(fromTokenInfo.maxPrice).toString();
  }, [maxFromTokenInUSD, fromTokenInfo]);

  let maxSwapAmountUsd = bigNumberify(0);

  if (maxToTokenOutUSD && maxFromTokenInUSD) {
    maxSwapAmountUsd = maxToTokenOutUSD.lt(maxFromTokenInUSD) ? maxToTokenOutUSD : maxFromTokenInUSD;
  }

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
            totalTokenWeights,
            isSwap
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
          totalTokenWeights,
          isSwap
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
            totalTokenWeights,
            isSwap
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
          totalTokenWeights,
          isSwap
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
  let nextDelta = bigNumberify(0);
  let nextHasProfit = false;

  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees));
    }
  }

  let nextAveragePrice = isMarketOrder ? entryMarkPrice : triggerPriceUsd;
  if (hasExistingPosition) {
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

  const getSwapError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      return [t`Swaps disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (fromTokenAddress === toTokenAddress) {
      return [t`Select different tokens`];
    }

    if (!isMarketOrder) {
      if ((toToken.isStable || toToken.isUsdg) && (fromToken.isStable || fromToken.isUsdg)) {
        return [t`Select different tokens`];
      }

      if (fromToken.isNative && toToken.isWrapped) {
        return [t`Select different tokens`];
      }

      if (toToken.isNative && fromToken.isWrapped) {
        return [t`Select different tokens`];
      }
    }

    if (!fromAmount || fromAmount.eq(0)) {
      return [t`Enter an amount`];
    }
    if (!toAmount || toAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
    if (!fromTokenInfo || !fromTokenInfo.minPrice) {
      return [t`Incorrect network`];
    }
    if (
      !savedShouldDisableValidationForTesting &&
      fromTokenInfo &&
      fromTokenInfo.balance &&
      fromAmount &&
      fromAmount.gt(fromTokenInfo.balance)
    ) {
      return [t`Insufficient ${fromTokenInfo.symbol} balance`];
    }

    const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

    if (!isMarketOrder) {
      if (!triggerRatioValue || triggerRatio.eq(0)) {
        return [t`Enter a price`];
      }

      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate && currentRate.lt(triggerRatio)) {
        return triggerRatioInverted ? [t`Price below Mark Price`] : [t`Price above Mark Price`];
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
      return [t`Insufficient Liquidity`];
    }
    if (
      !isWrapOrUnwrap &&
      toAmount &&
      toTokenInfo.bufferAmount &&
      toTokenInfo.poolAmount &&
      toTokenInfo.bufferAmount.gt(toTokenInfo.poolAmount.sub(toAmount))
    ) {
      return [t`Insufficient Liquidity`];
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
        return [t`Insufficient liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientLiquiditySwap];
      }
    }

    return [false];
  };

  const getLeverageError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      return [t`Leverage disabled, pending ${getChainName(chainId)} upgrade`];
    }
    if (hasOutdatedUi) {
      return [t`Page outdated, please refresh`];
    }

    if (!toAmount || toAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    let toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);
    if (toTokenInfo && toTokenInfo.isStable) {
      const SWAP_OPTION_LABEL = {
        [LONG]: "Longing",
        [SHORT]: "Shorting",
      };
      return [t`${SWAP_OPTION_LABEL[swapOption]} ${toTokenInfo.symbol} not supported`];
    }

    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
    if (
      !savedShouldDisableValidationForTesting &&
      fromTokenInfo &&
      fromTokenInfo.balance &&
      fromAmount &&
      fromAmount.gt(fromTokenInfo.balance)
    ) {
      return [t`Insufficient ${fromTokenInfo.symbol} balance`];
    }

    if (leverage && leverage.eq(0)) {
      return [t`Enter an amount`];
    }
    if (!isMarketOrder && (!triggerPriceValue || triggerPriceUsd.eq(0))) {
      return [t`Enter a price`];
    }

    if (!hasExistingPosition && fromUsdMin && fromUsdMin.lt(expandDecimals(10, USD_DECIMALS))) {
      return [t`Min order: 10 USD`];
    }

    if (leverage && leverage.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return [t`Min leverage: 1.1x`];
    }

    if (leverage && leverage.gt(MAX_ALLOWED_LEVERAGE)) {
      return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    if (!isMarketOrder && entryMarkPrice && triggerPriceUsd && !savedShouldDisableValidationForTesting) {
      if (isLong && entryMarkPrice.lt(triggerPriceUsd)) {
        return [t`Price above Mark Price`];
      }
      if (!isLong && entryMarkPrice.gt(triggerPriceUsd)) {
        return [t`Price below Mark Price`];
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
          totalTokenWeights,
          isSwap
        );
        requiredAmount = requiredAmount.add(swapAmount);

        if (toToken && toTokenAddress !== USDG_ADDRESS) {
          if (!toTokenInfo.availableAmount) {
            return [t`Liquidity data not loaded`];
          }
          if (toTokenInfo.availableAmount && requiredAmount.gt(toTokenInfo.availableAmount)) {
            return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientLiquidityLeverage];
          }
        }

        if (
          toTokenInfo.poolAmount &&
          toTokenInfo.bufferAmount &&
          toTokenInfo.bufferAmount.gt(toTokenInfo.poolAmount.sub(swapAmount))
        ) {
          return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientLiquidityLeverage];
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
            return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.TokenPoolExceeded];
          }
        }
      }

      if (toTokenInfo && toTokenInfo.maxPrice) {
        const sizeUsd = toAmount.mul(toTokenInfo.maxPrice).div(expandDecimals(1, toTokenInfo.decimals));
        if (
          toTokenInfo.maxGlobalLongSize &&
          toTokenInfo.maxGlobalLongSize.gt(0) &&
          toTokenInfo.maxAvailableLong &&
          sizeUsd.gt(toTokenInfo.maxAvailableLong)
        ) {
          return [t`Max ${toTokenInfo.symbol} long exceeded`];
        }
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
          totalTokenWeights,
          isSwap
        );
        stableTokenAmount = nextToAmount;
        if (stableTokenAmount.gt(shortCollateralToken.availableAmount)) {
          return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientCollateralIn];
        }

        if (
          shortCollateralToken.bufferAmount &&
          shortCollateralToken.poolAmount &&
          shortCollateralToken.bufferAmount.gt(shortCollateralToken.poolAmount.sub(stableTokenAmount))
        ) {
          // suggest swapping to collateralToken
          return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientCollateralIn];
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
            return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.TokenPoolExceededShorts];
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
        return [t`Fetching token info...`];
      }

      const sizeUsd = toAmount.mul(toTokenInfo.maxPrice).div(expandDecimals(1, toTokenInfo.decimals));
      const sizeTokens = sizeUsd
        .mul(expandDecimals(1, shortCollateralToken.decimals))
        .div(shortCollateralToken.minPrice);

      if (!toTokenInfo.maxAvailableShort) {
        return [t`Liquidity data not loaded`];
      }

      if (
        toTokenInfo.maxGlobalShortSize &&
        toTokenInfo.maxGlobalShortSize.gt(0) &&
        toTokenInfo.maxAvailableShort &&
        sizeUsd.gt(toTokenInfo.maxAvailableShort)
      ) {
        return [t`Max ${toTokenInfo.symbol} short exceeded`];
      }

      stableTokenAmount = stableTokenAmount.add(sizeTokens);
      if (stableTokenAmount.gt(shortCollateralToken.availableAmount)) {
        return [t`Insufficient Liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientProfitLiquidity];
      }
    }

    return [false];
  };

  const getToLabel = () => {
    if (isSwap) {
      return t`Receive`;
    }
    if (isLong) {
      return t`Long`;
    }
    return t`Short`;
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

  const isPrimaryEnabled = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      return false;
    }
    if (isStopOrder) {
      return true;
    }
    if (!active) {
      return true;
    }
    const [error, errorType] = getError();
    if (error && errorType !== ErrorDisplayType.Modal) {
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
    if (isStopOrder) {
      return t`Open a position`;
    }
    if (!active) {
      return t`Connect Wallet`;
    }
    if (!isSupportedChain(chainId)) {
      return t`Incorrect Network`;
    }
    const [error, errorType] = getError();
    if (error && errorType !== ErrorDisplayType.Modal) {
      return error;
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

    if (needApproval && isWaitingForApproval) {
      return t`Waiting for Approval`;
    }
    if (isApproving) {
      return t`Approving ${fromToken.symbol}...`;
    }
    if (needApproval) {
      return t`Approve ${fromToken.symbol}`;
    }

    if (needOrderBookApproval && isWaitingForPluginApproval) {
      return t`Enabling Orders...`;
    }
    if (isPluginApproving) {
      return t`Enabling Orders...`;
    }
    if (needOrderBookApproval) {
      return t`Enable Orders`;
    }

    if (!isMarketOrder) return t`Create ${orderOption.charAt(0) + orderOption.substring(1).toLowerCase()} Order`;

    if (isSwap) {
      if (toUsdMax && toUsdMax.lt(fromUsdMin.mul(95).div(100))) {
        return t`High Slippage, Swap Anyway`;
      }
      return t`Swap`;
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
          totalTokenWeights,
          isSwap
        );
        const nextToAmountUsd = nextToAmount
          .mul(indexTokenInfo.minPrice)
          .div(expandDecimals(1, indexTokenInfo.decimals));
        if (fromTokenAddress === USDG_ADDRESS && nextToAmountUsd.lt(fromUsdMin.mul(98).div(100))) {
          return t`High USDG Slippage, Long Anyway`;
        }
      }
      return t`Long ${toToken.symbol}`;
    }

    return t`Short ${toToken.symbol}`;
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
    const shouldSwitch = toTokens.find((token) => token.address === fromTokenAddress);
    if (shouldSwitch) {
      const updatedTokenSelection = JSON.parse(JSON.stringify(tokenSelection));

      updatedTokenSelection[swapOption] = {
        from: toTokenAddress,
        to: fromTokenAddress,
      };
      setTokenSelection(updatedTokenSelection);
    }
  };

  const wrap = async () => {
    setIsSubmitting(true);

    const contract = new ethers.Contract(nativeTokenAddress, WETH.abi, library.getSigner());
    callContract(chainId, contract, "deposit", {
      value: fromAmount,
      sentMsg: t`Swap submitted.`,
      successMsg: t`Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      failMsg: t`Swap failed.`,
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
    callContract(chainId, contract, "withdraw", [fromAmount], {
      sentMsg: t`Swap submitted!`,
      failMsg: t`Swap failed.`,
      successMsg: t`Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
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
        totalTokenWeights,
        isSwap
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
        totalTokenWeights,
        isSwap
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
        t`Leave at least ${formatAmount(DUST_BNB, 18, 3)} ${getConstant(chainId, "nativeTokenSymbol")} for gas`
      );
      return;
    }

    if (!isMarketOrder) {
      minOut = toAmount;
      Api.createSwapOrder(chainId, library, path, fromAmount, minOut, triggerRatio, nativeTokenAddress, {
        sentMsg: t`Swap Order submitted!`,
        successMsg: t`Swap Order created!`,
        failMsg: t`Swap Order creation failed.`,
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

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: t`Swap ${!isMarketOrder ? " order " : ""} submitted!`,
      successMsg: t`Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      failMsg: t`Swap failed.`,
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
    const successMsg = t`
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
        sentMsg: t`Limit order submitted!`,
        successMsg,
        failMsg: t`Limit order creation failed.`,
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
        totalTokenWeights,
        isSwap
      );
      if (nextToAmount.eq(0)) {
        helperToast.error(t`Insufficient Liquidity`);
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
      AddressZero, // _callbackTarget
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
        AddressZero, // _callbackTarget
      ];
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, fromTokenAddress), fromAmount)) {
      setIsSubmitting(false);
      setIsPendingConfirmation(false);
      helperToast.error(
        t`Leave at least ${formatAmount(DUST_BNB, 18, 3)} ${getConstant(chainId, "nativeTokenSymbol")} for gas`
      );
      return;
    }

    const contractAddress = getContract(chainId, "PositionRouter");
    const contract = new ethers.Contract(contractAddress, PositionRouter.abi, library.getSigner());
    const indexToken = getTokenInfo(infoTokens, indexTokenAddress);
    const tokenSymbol = indexToken.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexToken.symbol;
    const longOrShortText = isLong ? t`Long` : t`Short`;
    const successMsg = t`Requested increase of ${tokenSymbol} ${longOrShortText} by ${formatAmount(
      toUsdMax,
      USD_DECIMALS,
      2
    )} USD.`;

    callContract(chainId, contract, method, params, {
      value,
      setPendingTxns,
      sentMsg: `${longOrShortText} submitted.`,
      failMsg: `${longOrShortText} failed.`,
      successMsg,
      // for Arbitrum, sometimes the successMsg shows after the position has already been executed
      // hide the success message for Arbitrum as a workaround
      hideSuccessMsg: chainId === ARBITRUM,
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
    if (orderOption === STOP) {
      setOrderOption(MARKET);
    }
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
    if (isStopOrder) {
      setOrderOption(MARKET);
      return;
    }

    if (!active) {
      props.connectWallet();
      return;
    }

    if (needPositionRouterApproval) {
      approvePositionRouter({
        sentMsg: t`Enable leverage sent.`,
        failMsg: t`Enable leverage failed.`,
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

    const [, errorType, errorCode] = getError();

    if (errorType === ErrorDisplayType.Modal) {
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

  const isStopOrder = orderOption === STOP;
  const showFromAndToSection = !isStopOrder;
  const showTriggerPriceSection = !isSwap && !isMarketOrder && !isStopOrder;
  const showTriggerRatioSection = isSwap && !isMarketOrder && !isStopOrder;

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
        totalTokenWeights,
        isSwap
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
      totalTokenWeights,
      isSwap
    );
    if (feeBasisPoints) {
      swapFees = fromUsdMin.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
      feesUsd = feesUsd.add(swapFees);
    }
    feeBps = feeBasisPoints;
  }

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

  const fromUsdMinAfterFees = fromUsdMin?.sub(swapFees ?? 0).sub(positionFee ?? 0) || bigNumberify(0);
  const liquidationPrice = getLiquidationPrice({
    isLong,
    size: hasExistingPosition ? existingPosition.size.add(toUsdMax || 0) : toUsdMax ?? bigNumberify(0),
    collateral: hasExistingPosition
      ? existingPosition.collateralAfterFee.add(fromUsdMinAfterFees)
      : fromUsdMinAfterFees ?? bigNumberify(0),
    averagePrice: nextAveragePrice ?? bigNumberify(0),
  });

  const existingLiquidationPrice = existingPosition
    ? getLiquidationPrice({
        isLong: existingPosition.isLong,
        size: existingPosition.size,
        collateral: existingPosition.collateral,
        averagePrice: existingPosition.averagePrice,
        fundingFee: existingPosition.fundingFee,
      })
    : undefined;

  const displayLiquidationPrice = liquidationPrice ? liquidationPrice : existingLiquidationPrice;

  if (hasExistingPosition) {
    leverage = getLeverage({
      size: existingPosition.size.add(toUsdMax || 0),
      collateral: existingPosition.collateralAfterFee.add(fromUsdMinAfterFees),
      delta: nextDelta,
      hasProfit: nextHasProfit,
      includeDelta: savedIsPnlInLeverage,
    });
  } else if (hasLeverageOption) {
    leverage = bigNumberify(parseInt(leverageOption * BASIS_POINTS_DIVISOR));
  }

  function getFundingRate() {
    let fundingRate = "";

    if (isLong && toTokenInfo) {
      fundingRate = formatAmount(toTokenInfo.fundingRate, 4, 4);
    } else if (isShort && shortCollateralToken) {
      fundingRate = formatAmount(shortCollateralToken.fundingRate, 4, 4);
    }

    if (fundingRate) {
      fundingRate += "% / 1h";
    }

    return fundingRate;
  }

  function setFromValueToMaximumAvailable() {
    if (!fromToken || !fromBalance) {
      return;
    }

    const maxAvailableAmount = fromToken.isNative ? fromBalance.sub(bigNumberify(DUST_BNB).mul(2)) : fromBalance;
    const formattedMaxAvailableAmount = formatAmountFree(maxAvailableAmount, fromToken.decimals, fromToken.decimals);
    const finalMaxAmount = isMetamaskMobile
      ? limitDecimals(formattedMaxAvailableAmount, MAX_METAMASK_MOBILE_DECIMALS)
      : formattedMaxAvailableAmount;
    setFromValue(finalMaxAmount);
    setAnchorOnFromAmount(true);
  }

  function shouldShowMaxButton() {
    if (!fromToken || !fromBalance) {
      return false;
    }
    const maxAvailableAmount = fromToken.isNative ? fromBalance.sub(bigNumberify(DUST_BNB).mul(2)) : fromBalance;
    return fromValue !== formatAmountFree(maxAvailableAmount, fromToken.decimals, fromToken.decimals);
  }

  const ERROR_TOOLTIP_MSG = {
    [ErrorCode.InsufficientLiquiditySwap]: t`Swap amount exceeds Available Liquidity.`,
    [ErrorCode.InsufficientLiquidityLeverage]: (
      <Trans>
        <p>{toToken.symbol} is required for collateral.</p>
        <p>
          Swap amount from {fromToken.symbol} to {toToken.symbol} exceeds {toToken.symbol} Available Liquidity. Reduce
          the "Pay" size, or use {toToken.symbol} as the "Pay" token to use it for collateral.
        </p>
        <ExternalLink href={get1InchSwapUrl(chainId, fromToken.symbol, toToken.symbol)}>
          You can buy {toToken.symbol} on 1inch.
        </ExternalLink>
      </Trans>
    ),
    [ErrorCode.TokenPoolExceeded]: (
      <Trans>
        <p>{toToken.symbol} is required for collateral.</p>
        <p>
          Swap amount from {fromToken.symbol} to {toToken.symbol} exceeds {fromToken.symbol} acceptable amount. Reduce
          the "Pay" size, or use {toToken.symbol} as the "Pay" token to use it for collateral.
        </p>
        <ExternalLink href={get1InchSwapUrl(chainId, fromToken.symbol, toToken.symbol)}>
          You can buy {toToken.symbol} on 1inch.
        </ExternalLink>
      </Trans>
    ),
    [ErrorCode.TokenPoolExceededShorts]: (
      <Trans>
        <p>{shortCollateralToken.symbol} is required for collateral.</p>
        <p>
          Swap amount from {fromToken.symbol} to {shortCollateralToken.symbol} exceeds {fromToken.symbol} acceptable
          amount. Reduce the "Pay" size, or use {shortCollateralToken.symbol} as the "Pay" token to use it for
          collateral.
        </p>
        <ExternalLink href={get1InchSwapUrl(chainId, fromToken.symbol, shortCollateralToken.symbol)}>
          You can buy {shortCollateralToken.symbol} on 1inch.
        </ExternalLink>
      </Trans>
    ),
    [ErrorCode.InsufficientCollateralIn]: (
      <Trans>
        <p>{shortCollateralToken.symbol} is required for collateral.</p>
        <p>
          Swap amount from {fromToken.symbol} to {shortCollateralToken.symbol} exceeds {shortCollateralToken.symbol}{" "}
          available liquidity. Reduce the "Pay" size, or change the "Collateral In" token.
        </p>
      </Trans>
    ),
    [ErrorCode.InsufficientProfitLiquidity]: (
      <Trans>
        <p>{shortCollateralToken.symbol} is required for collateral.</p>
        <p>
          Short amount for {toToken.symbol} with {shortCollateralToken.symbol} exceeds potential profits liquidity.
          Reduce the "Short Position" size, or change the "Collateral In" token.
        </p>
      </Trans>
    ),
  };

  const SWAP_LABELS = {
    [LONG]: t`Long`,
    [SHORT]: t`Short`,
    [SWAP]: t`Swap`,
  };

  const SWAP_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "SWAP_ORDER_EXECUTION_GAS_FEE");
  const INCREASE_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "INCREASE_ORDER_EXECUTION_GAS_FEE");
  const executionFee = isSwap ? SWAP_ORDER_EXECUTION_GAS_FEE : INCREASE_ORDER_EXECUTION_GAS_FEE;
  const executionFeeUsd = getUsd(executionFee, nativeTokenAddress, false, infoTokens);
  const currentExecutionFee = isMarketOrder ? minExecutionFee : executionFee;
  const currentExecutionFeeUsd = isMarketOrder ? minExecutionFeeUSD : executionFeeUsd;

  const existingCurrentIndexShortPosition =
    isShort &&
    positions
      ?.filter((p) => !p.isLong)
      ?.find((position) => position?.indexToken?.address.toLowerCase() === toTokenAddress.toLowerCase());
  const existingCurrentIndexCollateralToken = existingCurrentIndexShortPosition?.collateralToken;

  const isExistingAndCollateralTokenDifferent =
    existingCurrentIndexCollateralToken &&
    existingCurrentIndexCollateralToken.address.toLowerCase() !== shortCollateralAddress?.toLowerCase();

  function renderPrimaryButton() {
    const [errorMessage, errorType, errorCode] = getError();
    const primaryTextMessage = getPrimaryText();
    if (errorType === ErrorDisplayType.Tooltip && errorMessage === primaryTextMessage && ERROR_TOOLTIP_MSG[errorCode]) {
      return (
        <Tooltip
          isHandlerDisabled
          handle={
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {primaryTextMessage}
            </Button>
          }
          position="center-bottom"
          className="Tooltip-flex"
          renderContent={() => ERROR_TOOLTIP_MSG[errorCode]}
        />
      );
    }
    return (
      <Button
        type="submit"
        variant="primary-action"
        className="w-full"
        onClick={onClickPrimary}
        disabled={!isPrimaryEnabled()}
      >
        {primaryTextMessage}
      </Button>
    );
  }

  return (
    <div className="Exchange-swap-box">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClickPrimary();
        }}
      >
        <div className="Exchange-swap-box-inner App-box-highlight">
          <div>
            <Tab
              icons={SWAP_ICONS}
              options={SWAP_OPTIONS}
              optionLabels={SWAP_LABELS}
              option={swapOption}
              onChange={onSwapOptionChange}
              className="Exchange-swap-option-tabs"
            />
            {flagOrdersEnabled && (
              <Tab
                options={orderOptions}
                optionLabels={orderOptionLabels}
                className="Exchange-swap-order-type-tabs"
                type="inline"
                option={orderOption}
                onChange={onOrderOptionChange}
              />
            )}
          </div>
          {showFromAndToSection && (
            <React.Fragment>
              <BuyInputSection
                topLeftLabel={t`Pay`}
                topLeftValue={fromUsdMin && `$${formatAmount(fromUsdMin, USD_DECIMALS, 2, true)}`}
                topRightLabel={t`Balance`}
                topRightValue={fromBalance && `${formatAmount(fromBalance, fromToken.decimals, 4, true)}`}
                onClickTopRightLabel={setFromValueToMaximumAvailable}
                showMaxButton={shouldShowMaxButton()}
                inputValue={fromValue}
                onInputValueChange={onFromValueChange}
                onClickMax={setFromValueToMaximumAvailable}
              >
                <TokenSelector
                  label={t`Pay`}
                  chainId={chainId}
                  tokenAddress={fromTokenAddress}
                  onSelectToken={onSelectFromToken}
                  tokens={fromTokens}
                  infoTokens={infoTokens}
                  showMintingCap={false}
                  showTokenImgInDropdown={true}
                  showSymbolImage
                />
              </BuyInputSection>
              <div className="Exchange-swap-ball-container">
                <button type="button" className="Exchange-swap-ball" onClick={switchTokens}>
                  <IoMdSwap className="Exchange-swap-ball-icon" />
                </button>
              </div>
              <BuyInputSection
                topLeftLabel={getToLabel()}
                topRightLabel={isSwap ? t`Balance` : t`Leverage`}
                topLeftValue={toUsdMax && `$${formatAmount(toUsdMax, USD_DECIMALS, 2, true)}`}
                topRightValue={
                  isSwap
                    ? formatAmount(toBalance, toToken.decimals, 4, true)
                    : `${parseFloat(leverageOption).toFixed(2)}x`
                }
                showMaxButton={false}
                inputValue={toValue}
                onInputValueChange={onToValueChange}
              >
                <TokenSelector
                  label={getTokenLabel()}
                  chainId={chainId}
                  tokenAddress={toTokenAddress}
                  onSelectToken={onSelectToToken}
                  tokens={toTokens}
                  infoTokens={infoTokens}
                  showTokenImgInDropdown={true}
                  showSymbolImage
                  showBalances={false}
                />
              </BuyInputSection>
            </React.Fragment>
          )}
          {showTriggerRatioSection && (
            <BuyInputSection
              topLeftLabel={t`Price`}
              topRightLabel={formatAmount(
                getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted),
                USD_DECIMALS,
                4
              )}
              onClickTopRightLabel={() => {
                setTriggerRatioValue(
                  formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10)
                );
              }}
              showMaxButton={false}
              inputValue={triggerRatioValue}
              onInputValueChange={onTriggerRatioChange}
            >
              {(() => {
                if (!toTokenInfo || !fromTokenInfo) return;
                const [tokenA, tokenB] = triggerRatioInverted
                  ? [toTokenInfo, fromTokenInfo]
                  : [fromTokenInfo, toTokenInfo];
                return (
                  <div className="PositionEditor-token-symbol">
                    <TokenWithIcon className="Swap-limit-icon" symbol={tokenA.symbol} displaySize={20} />
                    &nbsp;per&nbsp;
                    <TokenWithIcon className="Swap-limit-icon" symbol={tokenB.symbol} displaySize={20} />
                  </div>
                );
              })()}
            </BuyInputSection>
          )}
          {showTriggerPriceSection && (
            <BuyInputSection
              topLeftLabel={t`Price`}
              topRightLabel={t`Mark`}
              topRightValue={formatAmount(entryMarkPrice, USD_DECIMALS, toTokenPriceDecimal, true)}
              onClickTopRightLabel={() => {
                setTriggerPriceValue(formatAmountFree(entryMarkPrice, USD_DECIMALS, toTokenPriceDecimal));
              }}
              showMaxButton={false}
              inputValue={triggerPriceValue}
              onInputValueChange={onTriggerPriceChange}
            >
              USD
            </BuyInputSection>
          )}
          {isSwap && (
            <div className="Exchange-swap-box-info">
              <ExchangeInfoRow label={t`Fees`}>
                <div>
                  {!fees && "-"}
                  {fees && (
                    <FeesTooltip
                      swapFee={feesUsd}
                      executionFees={
                        !isMarketOrder && {
                          fee: currentExecutionFee,
                          feeUsd: currentExecutionFeeUsd,
                        }
                      }
                    />
                  )}
                </div>
              </ExchangeInfoRow>
            </div>
          )}
          {(isLong || isShort) && !isStopOrder && (
            <div className="Exchange-leverage-box">
              <ToggleSwitch
                className="Exchange-leverage-toggle-wrapper"
                isChecked={isLeverageSliderEnabled}
                setIsChecked={setIsLeverageSliderEnabled}
              >
                <span className="muted">Leverage slider</span>
              </ToggleSwitch>
              {isLeverageSliderEnabled && (
                <LeverageSlider isPositive={isLong} value={leverageOption} onChange={setLeverageOption} />
              )}
              {isShort && (
                <div className="Exchange-info-row">
                  {isExistingAndCollateralTokenDifferent ? (
                    <Tooltip
                      className="Collateral-warning"
                      position="left-bottom"
                      handle={<Trans>Collateral In</Trans>}
                      renderContent={() => (
                        <span>
                          <Trans>
                            You have an existing position with {existingCurrentIndexCollateralToken?.symbol} as
                            collateral.
                          </Trans>
                          <br />
                          <br />
                          <div
                            onClick={() => {
                              setShortCollateralAddress(existingCurrentIndexCollateralToken?.address);
                            }}
                            className="text-gray underline cursor-pointer"
                          >
                            <Trans>Switch to {existingCurrentIndexCollateralToken?.symbol} collateral.</Trans>
                          </div>
                        </span>
                      )}
                    />
                  ) : (
                    <div className="Exchange-info-label">
                      <Trans>Collateral In</Trans>
                    </div>
                  )}

                  <div className="align-right">
                    <TokenSelector
                      label={t`Collateral In`}
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
                  <div className="Exchange-info-label">
                    <Trans>Collateral In</Trans>
                  </div>
                  <div className="align-right">
                    <Tooltip
                      position="right-bottom"
                      handle="USD"
                      renderContent={() => (
                        <span className="SwapBox-collateral-tooltip-text">
                          <Trans>
                            A snapshot of the USD value of your {existingPosition?.collateralToken?.symbol} collateral
                            is taken when the position is opened.
                          </Trans>
                          <br />
                          <br />
                          <Trans>
                            When closing the position, you can select which token you would like to receive the profits
                            in.
                          </Trans>
                        </span>
                      )}
                    />
                  </div>
                </div>
              )}
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Leverage</Trans>
                </div>
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
                <div className="Exchange-info-label">
                  <Trans>Entry Price</Trans>
                </div>
                <div className="align-right">
                  {hasExistingPosition && toAmount && toAmount.gt(0) && (
                    <div className="inline-block muted">
                      ${formatAmount(existingPosition.averagePrice, USD_DECIMALS, existingPositionPriceDecimal, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                  )}
                  {nextAveragePrice && `$${formatAmount(nextAveragePrice, USD_DECIMALS, toTokenPriceDecimal, true)}`}
                  {!nextAveragePrice && `-`}
                </div>
              </div>
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Liq. Price</Trans>
                </div>
                <div className="align-right">
                  {hasExistingPosition && toAmount && toAmount.gt(0) && (
                    <div className="inline-block muted">
                      ${formatAmount(existingLiquidationPrice, USD_DECIMALS, existingPositionPriceDecimal, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                  )}
                  {toAmount &&
                    displayLiquidationPrice &&
                    `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, toTokenPriceDecimal, true)}`}
                  {!toAmount && displayLiquidationPrice && `-`}
                  {!displayLiquidationPrice && `-`}
                </div>
              </div>
              <ExchangeInfoRow label={t`Fees`}>
                <div>
                  {!feesUsd && "-"}

                  {feesUsd && (
                    <FeesTooltip
                      fundingRate={getFundingRate()}
                      executionFees={{
                        fee: currentExecutionFee,
                        feeUsd: currentExecutionFeeUsd,
                      }}
                      positionFee={positionFee}
                      swapFee={swapFees}
                      titleText={swapFees && <Trans>{collateralToken.symbol} is required for collateral.</Trans>}
                    />
                  )}
                </div>
              </ExchangeInfoRow>
            </div>
          )}
          {isStopOrder && (
            <div className="Exchange-swap-section Exchange-trigger-order-info">
              <Trans>
                Take-profit and stop-loss orders can be set after opening a position. <br />
                <br />
                There will be a "Close" button on each position row, clicking this will display the option to set
                trigger orders. <br />
                <br />
                For screenshots and more information, please see the{" "}
                <ExternalLink href="https://docs.gmx.io/docs/trading/v1#stop-loss--take-profit-orders">
                  docs
                </ExternalLink>
                .
              </Trans>
            </div>
          )}
          <div className="Exchange-swap-button-container">{renderPrimaryButton()}</div>
        </div>
      </form>
      <div className="Exchange-swap-info-group">
        {isSwap && (
          <div className="Exchange-swap-market-box App-box App-box-border">
            <div className="Exchange-swap-market-box-title">
              <Trans>Swap</Trans>
            </div>
            <div className="App-card-divider"></div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>{fromToken.symbol} Price</Trans>
              </div>
              <div className="align-right">
                ${fromTokenInfo && formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>{toToken.symbol} Price</Trans>
              </div>
              <div className="align-right">
                ${toTokenInfo && formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Available Liquidity</Trans>
              </div>

              <div className="align-right al-swap">
                <Tooltip
                  handle={`$${formatAmount(maxSwapAmountUsd, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <StatsTooltipRow
                          label={t`Max ${fromTokenInfo.symbol} in`}
                          value={[
                            `${formatAmount(maxFromTokenIn, fromTokenInfo.decimals, 0, true)} ${fromTokenInfo.symbol}`,
                            `($${formatAmount(maxFromTokenInUSD, USD_DECIMALS, 0, true)})`,
                          ]}
                        />
                        <StatsTooltipRow
                          label={t`Max ${toTokenInfo.symbol} out`}
                          value={[
                            `${formatAmount(maxToTokenOut, toTokenInfo.decimals, 0, true)} ${toTokenInfo.symbol}`,
                            `($${formatAmount(maxToTokenOutUSD, USD_DECIMALS, 0, true)})`,
                          ]}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            {!isMarketOrder && (
              <ExchangeInfoRow label={t`Price`}>
                {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromToken, toToken)}
              </ExchangeInfoRow>
            )}
          </div>
        )}
        {(isLong || isShort) && (
          <div className="Exchange-swap-market-box App-box App-box-border">
            <div className="Exchange-swap-market-box-title">
              {isLong ? t`Long` : t`Short`} {toToken.symbol}
            </div>
            <div className="App-card-divider" />
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Entry Price</Trans>
              </div>
              <div className="align-right">
                <Tooltip
                  handle={`$${formatAmount(entryMarkPrice, USD_DECIMALS, toTokenPriceDecimal, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          The position will be opened at{" "}
                          {formatAmount(entryMarkPrice, USD_DECIMALS, toTokenPriceDecimal, true)} USD with a max
                          slippage of {parseFloat(savedSlippageAmount / 100.0).toFixed(2)}%.
                          <br />
                          <br />
                          The slippage amount can be configured under Settings, found by clicking on your address at the
                          top right of the page after connecting your wallet.
                          <br />
                          <br />
                          <ExternalLink href="https://docs.gmx.io/docs/trading/v1#opening-a-position">
                            More Info
                          </ExternalLink>
                        </Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Exit Price</Trans>
              </div>
              <div className="align-right">
                <Tooltip
                  handle={`$${formatAmount(exitMarkPrice, USD_DECIMALS, toTokenPriceDecimal, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          If you have an existing position, the position will be closed at{" "}
                          {formatAmount(entryMarkPrice, USD_DECIMALS, toTokenPriceDecimal, true)} USD.
                          <br />
                          <br />
                          This exit price will change with the price of the asset.
                          <br />
                          <br />
                          <ExternalLink href="https://docs.gmx.io/docs/trading/v1#opening-a-position">
                            More Info
                          </ExternalLink>
                        </Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Borrow Fee</Trans>
              </div>
              <div className="align-right">
                <Tooltip
                  handle={borrowFeeText}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        {hasZeroBorrowFee && (
                          <div>
                            {isLong && t`There are more shorts than longs, borrow fees for longing is currently zero`}
                            {isShort && t`There are more longs than shorts, borrow fees for shorting is currently zero`}
                          </div>
                        )}
                        {!hasZeroBorrowFee && (
                          <div>
                            <Trans>
                              The borrow fee is calculated as (assets borrowed) / (total assets in pool) * 0.01% per
                              hour.
                            </Trans>
                            <br />
                            <br />
                            {isShort && t`You can change the "Collateral In" token above to find lower fees`}
                          </div>
                        )}
                        <br />
                        <ExternalLink href="https://docs.gmx.io/docs/trading/v1#opening-a-position">
                          <Trans>More Info</Trans>
                        </ExternalLink>
                      </div>
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
                <div className="Exchange-info-label">
                  <Trans>Available Liquidity</Trans>
                </div>
                <div className="align-right">
                  <Tooltip
                    handle={`$${formatAmount(toTokenInfo.maxAvailableShort, USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={t`Max ${toTokenInfo.symbol} short capacity`}
                            value={formatAmount(toTokenInfo.maxGlobalShortSize, USD_DECIMALS, 0, true)}
                          />
                          <StatsTooltipRow
                            label={t`Current ${toTokenInfo.symbol} shorts`}
                            value={formatAmount(toTokenInfo.globalShortSize, USD_DECIMALS, 0, true)}
                          />
                        </>
                      );
                    }}
                  ></Tooltip>
                </div>
              </div>
            )}
          </div>
        )}
        <UsefulLinks className="Useful-links-swapbox" />
      </div>
      <NoLiquidityErrorModal
        chainId={chainId}
        fromToken={fromToken}
        toToken={toToken}
        shortCollateralToken={shortCollateralToken}
        isLong={isLong}
        isShort={isShort}
        modalError={modalError}
        setModalError={setModalError}
      />
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
          minExecutionFee={minExecutionFee}
          minExecutionFeeUSD={minExecutionFeeUSD}
          minExecutionFeeErrorMessage={minExecutionFeeErrorMessage}
          entryMarkPrice={entryMarkPrice}
          swapFees={swapFees}
          positionFee={positionFee}
        />
      )}
    </div>
  );
}
