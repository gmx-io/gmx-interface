import { Trans, msg, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { BsArrowRight } from "react-icons/bs";
import { IoMdSwap } from "react-icons/io";
import { useHistory } from "react-router-dom";

import { ARBITRUM, getConstant } from "config/chains";
import { getContract } from "config/contracts";
import {
  BASIS_POINTS_DIVISOR,
  BASIS_POINTS_DIVISOR_BIGINT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  USD_DECIMALS,
} from "config/factors";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import * as Api from "domain/legacy";
import { useUserReferralCode } from "domain/referrals/hooks";
import { useTokensAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import { getMostAbundantStableToken, replaceNativeTokenAddress, shouldRaiseGasError } from "domain/tokens";
import { getMinResidualAmount, getTokenInfo, getUsd } from "domain/tokens/utils";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import {
  DUST_BNB,
  LEVERAGE_ORDER_OPTIONS,
  LIMIT,
  LONG,
  MARGIN_FEE_BASIS_POINTS,
  MARKET,
  SHORT,
  STOP,
  SWAP,
  SWAP_OPTIONS,
  SWAP_OPTIONS_CLASSNAMES,
  SWAP_ORDER_OPTIONS,
  USDG_ADDRESS,
  USDG_DECIMALS,
  calculatePositionDelta,
  getExchangeRate,
  getExchangeRateDisplay,
  getNextFromAmount,
  getNextToAmount,
  getPositionKey,
  isTriggerRatioInverted,
} from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  PRECISION,
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import { getLeverage } from "lib/positions/getLeverage";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { usePrevious } from "lib/usePrevious";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { getPriceDecimals, getToken, getV1Tokens, getWhitelistedV1Tokens } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import Tabs from "components/Tabs/Tabs";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";
import SwapIcon from "img/swap.svg?react";

import ConfirmationBox from "./ConfirmationBox";
import ExchangeInfoRow from "./ExchangeInfoRow";
import FeesTooltip from "./FeesTooltip";
import NoLiquidityErrorModal from "./NoLiquidityErrorModal";
import OrdersToa from "./OrdersToa";
import UsefulLinks from "./UsefulLinks";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import Tooltip from "../Tooltip/Tooltip";

import "./SwapBox.scss";

const SWAP_ICONS = {
  [LONG]: <LongIcon />,
  [SHORT]: <ShortIcon />,
  [SWAP]: <SwapIcon />,
};

const { ZeroAddress } = ethers;

function getNextAveragePrice({ size, sizeDelta, hasProfit, delta, nextPrice, isLong }) {
  if (!size || !sizeDelta || !delta || !nextPrice) {
    return;
  }
  const nextSize = size + sizeDelta;
  let divisor;
  if (isLong) {
    divisor = hasProfit ? nextSize + delta : nextSize - delta;
  } else {
    divisor = hasProfit ? nextSize - delta : nextSize + delta;
  }
  if (!divisor) {
    return;
  }
  const nextAveragePrice = bigMath.mulDiv(nextPrice, nextSize, divisor);
  return nextAveragePrice;
}

const SWAP_LABELS = {
  [LONG]: msg`Long`,
  [SHORT]: msg`Short`,
  [SWAP]: msg`Swap`,
};

const ORDER_OPTION_LABELS = { [STOP]: msg`Trigger`, [MARKET]: msg`Market`, [LIMIT]: msg`Limit` };

export default function SwapBox(props) {
  const {
    pendingPositions,
    setPendingPositions,
    infoTokens,
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
    setIsWaitingForPluginApproval,
    isWaitingForPositionRouterApproval,
    setIsWaitingForPositionRouterApproval,
    isPluginApproving,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
    orderOption,
    setOrderOption,
    setShortCollateralAddress,
    shortCollateralAddress,
  } = props;
  const { account, active, signer } = useWallet();
  const isMetamaskMobile = useIsMetamaskMobile();
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [anchorOnFromAmount, setAnchorOnFromAmount] = useState(true);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  const { attachedOnChain, userReferralCode } = useUserReferralCode(signer, chainId, account);
  const { openConnectModal } = useConnectModal();
  const history = useHistory();
  const localizedSwapLabels = useLocalizedMap(SWAP_LABELS);
  const localizedOrderOptionLabels = useLocalizedMap(ORDER_OPTION_LABELS);

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

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

  const onOrderOptionChange = (option) => {
    setOrderOption(option);
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
  const hasExistingPosition = existingPosition && existingPosition.size && existingPosition.size > 0;

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
  const tokenAllowanceAddress = fromTokenAddress === ZeroAddress ? nativeTokenAddress : fromTokenAddress;
  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: [tokenAllowanceAddress].filter(Boolean),
  });
  const tokenAllowance = tokensAllowanceData?.[tokenAllowanceAddress];

  const fromToken = getToken(chainId, fromTokenAddress);
  const toToken = getToken(chainId, toTokenAddress);
  const shortCollateralToken = getTokenInfo(infoTokens, shortCollateralAddress);
  const toTokenPriceDecimal = getPriceDecimals(chainId, toToken.symbol);
  const existingPositionPriceDecimal = getPriceDecimals(chainId, existingPosition?.indexToken?.symbol);

  const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
  const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

  const nativeTokenInfo = getTokenInfo(infoTokens, nativeTokenAddress);
  const minResidualAmount = getMinResidualAmount(nativeTokenInfo?.decimals, nativeTokenInfo?.maxPrice);

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
            position="bottom-end"
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

  const fromBalance = fromTokenInfo ? fromTokenInfo.balance : 0n;
  const toBalance = toTokenInfo ? toTokenInfo.balance : 0n;

  const fromAmount = parseValue(fromValue, fromToken && fromToken.decimals);
  const toAmount = parseValue(toValue, toToken && toToken.decimals);

  const isPotentialWrap = (fromToken.isNative && toToken.isWrapped) || (fromToken.isWrapped && toToken.isNative);
  const isWrapOrUnwrap = isSwap && isPotentialWrap;
  const needApproval =
    fromTokenAddress !== ZeroAddress &&
    tokenAllowance !== undefined &&
    fromAmount !== undefined &&
    fromAmount > tokenAllowance &&
    !isWrapOrUnwrap;
  const prevFromTokenAddress = usePrevious(fromTokenAddress);
  const prevNeedApproval = usePrevious(needApproval);
  const prevToTokenAddress = usePrevious(toTokenAddress);

  const fromUsdMin = getUsd(fromAmount, fromTokenAddress, false, infoTokens);
  const toUsdMax = getUsd(toAmount, toTokenAddress, true, infoTokens, orderOption, triggerPriceUsd);

  const indexTokenAddress = toTokenAddress === ZeroAddress ? nativeTokenAddress : toTokenAddress;
  const collateralTokenAddress = isLong ? indexTokenAddress : shortCollateralAddress;
  const collateralToken = getToken(chainId, collateralTokenAddress);

  const [triggerRatioValue, setTriggerRatioValue] = useState("");

  const triggerRatioInverted = useMemo(() => {
    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo);
  }, [toTokenInfo, fromTokenInfo]);

  const maxToTokenOut = useMemo(() => {
    const value =
      toTokenInfo?.availableAmount === undefined
        ? undefined
        : toTokenInfo?.availableAmount >
            (toTokenInfo.poolAmount === undefined ? undefined : toTokenInfo.poolAmount - toTokenInfo.bufferAmount)
          ? toTokenInfo.poolAmount - toTokenInfo.bufferAmount
          : toTokenInfo?.availableAmount;

    if (value === undefined) {
      return 0n;
    }

    return value > 0 ? value : 0n;
  }, [toTokenInfo]);

  const maxToTokenOutUSD = useMemo(() => {
    return getUsd(maxToTokenOut, toTokenAddress, false, infoTokens);
  }, [maxToTokenOut, toTokenAddress, infoTokens]);

  const maxFromTokenInUSD = useMemo(() => {
    if (!fromTokenInfo || fromTokenInfo.maxUsdgAmount === undefined) return 0n;

    const value = bigMath.mulDiv(
      fromTokenInfo.maxUsdgAmount - fromTokenInfo.usdgAmount,
      expandDecimals(1, USD_DECIMALS),
      expandDecimals(1, USDG_DECIMALS)
    );

    if (value === 0n) {
      return 0n;
    }

    return value > 0 ? value : 0n;
  }, [fromTokenInfo]);

  const maxFromTokenIn = useMemo(() => {
    if (!fromTokenInfo || fromTokenInfo.maxPrice === undefined) {
      return 0n;
    }
    if (maxFromTokenInUSD === undefined) return undefined;

    return bigMath
      .mulDiv(maxFromTokenInUSD, expandDecimals(1, fromTokenInfo.decimals), fromTokenInfo.maxPrice)
      .toString();
  }, [maxFromTokenInUSD, fromTokenInfo]);

  let maxSwapAmountUsd = 0n;

  if (maxToTokenOutUSD !== undefined && maxFromTokenInUSD !== undefined) {
    maxSwapAmountUsd = maxToTokenOutUSD < maxFromTokenInUSD ? maxToTokenOutUSD : maxFromTokenInUSD;
  }

  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return 0n;
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS);
    if (ratio == 0n) {
      return 0n;
    }
    if (triggerRatioInverted) {
      ratio = bigMath.mulDiv(PRECISION, PRECISION, ratio);
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
      if (position && position.size && position.size > 0) {
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
        if (fromAmount === undefined) {
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
            !isMarketOrder && triggerRatio !== undefined ? triggerRatio : undefined,
            usdgSupply,
            totalTokenWeights,
            isSwap
          );

          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals);
          setToValue(nextToValue);
        }
        return;
      }

      if (toAmount === undefined) {
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
          !isMarketOrder && triggerRatio !== undefined ? triggerRatio : undefined,
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
        if (fromAmount === undefined) {
          setToValue("");
          return;
        }

        const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);
        if (toTokenInfo && toTokenInfo.maxPrice !== undefined && fromUsdMin !== undefined && fromUsdMin > 0) {
          const leverageMultiplier = parseInt(Number(leverageOption) * BASIS_POINTS_DIVISOR);
          const toTokenPriceUsd =
            !isMarketOrder && triggerPriceUsd && triggerPriceUsd > 0 ? triggerPriceUsd : toTokenInfo.maxPrice;

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
            fromUsdMinAfterFee = bigMath.mulDiv(
              fromUsdMin,
              BASIS_POINTS_DIVISOR_BIGINT - BigInt(feeBasisPoints),
              BASIS_POINTS_DIVISOR_BIGINT
            );
          }

          const toNumerator = fromUsdMinAfterFee * BigInt(leverageMultiplier) * BASIS_POINTS_DIVISOR_BIGINT;
          const toDenominator =
            BigInt(MARGIN_FEE_BASIS_POINTS) * BigInt(leverageMultiplier) +
            BASIS_POINTS_DIVISOR_BIGINT * BASIS_POINTS_DIVISOR_BIGINT;

          const nextToUsd = toNumerator / toDenominator;
          const nextToAmount = bigMath.mulDiv(nextToUsd, expandDecimals(1, toToken.decimals), toTokenPriceUsd);
          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals);

          setToValue(nextToValue);
        }
        return;
      }

      if (toAmount === undefined) {
        setFromValue("");
        return;
      }

      const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
      if (fromTokenInfo && fromTokenInfo.minPrice !== undefined && toUsdMax !== undefined && toUsdMax > 0) {
        const leverageMultiplier = parseInt(Number(leverageOption) * BASIS_POINTS_DIVISOR);

        const baseFromAmountUsd = bigMath.mulDiv(toUsdMax, BASIS_POINTS_DIVISOR_BIGINT, BigInt(leverageMultiplier));

        let fees = bigMath.mulDiv(toUsdMax, BigInt(MARGIN_FEE_BASIS_POINTS), BASIS_POINTS_DIVISOR_BIGINT);

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
          const swapFees = bigMath.mulDiv(baseFromAmountUsd, BigInt(feeBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
          fees = fees + swapFees;
        }

        const nextFromUsd = baseFromAmountUsd + fees;

        const nextFromAmount = bigMath.mulDiv(
          nextFromUsd,
          expandDecimals(1, fromToken.decimals),
          fromTokenInfo.minPrice
        );

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

  let leverage = 0n;
  let nextDelta = 0n;
  let nextHasProfit = false;

  if (fromUsdMin !== undefined && toUsdMax !== undefined && fromUsdMin > 0) {
    const fees = bigMath.mulDiv(toUsdMax, BigInt(MARGIN_FEE_BASIS_POINTS), BASIS_POINTS_DIVISOR_BIGINT);
    if (fromUsdMin - fees > 0) {
      leverage = bigMath.mulDiv(toUsdMax, BASIS_POINTS_DIVISOR_BIGINT, fromUsdMin - fees);
    }
  }

  let nextAveragePrice = isMarketOrder ? entryMarkPrice : triggerPriceUsd;
  if (hasExistingPosition) {
    if (isMarketOrder) {
      nextDelta = existingPosition.delta;
      nextHasProfit = existingPosition.hasProfit;
    } else {
      const data = calculatePositionDelta(triggerPriceUsd || 0n, existingPosition);
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

  const getToLabel = () => {
    if (isSwap) {
      return t`Receive`;
    }
    if (isLong) {
      return t`Long`;
    }
    return t`Short`;
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
    if (fromAmount !== undefined && toAmount !== undefined) {
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

    const contract = new ethers.Contract(nativeTokenAddress, abis.WETH, signer);
    callContract(chainId, contract, "deposit", {
      value: fromAmount,
      sentMsg: t`Swap submitted.`,
      successMsg: t`Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      failMsg: t`Swap failed.`,
      setPendingTxns,
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const unwrap = async () => {
    setIsSubmitting(true);

    const contract = new ethers.Contract(nativeTokenAddress, abis.WETH, signer);
    callContract(chainId, contract, "withdraw", [fromAmount], {
      sentMsg: t`Swap submitted!`,
      failMsg: t`Swap failed.`,
      successMsg: t`Swapped ${formatAmount(fromAmount, fromToken.decimals, 4, true)} ${
        fromToken.symbol
      } for ${formatAmount(toAmount, toToken.decimals, 4, true)} ${toToken.symbol}!`,
      setPendingTxns,
    }).finally(() => {
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
      Api.createSwapOrder(chainId, signer, path, fromAmount, minOut, triggerRatio, nativeTokenAddress, {
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
    value = 0n;
    if (toTokenAddress === ZeroAddress) {
      method = "swapTokensToETH";
    }

    minOut = bigMath.mulDiv(
      toAmount,
      BASIS_POINTS_DIVISOR_BIGINT - BigInt(allowedSlippage),
      BASIS_POINTS_DIVISOR_BIGINT
    );
    params = [path, fromAmount, minOut, account];
    if (fromTokenAddress === ZeroAddress) {
      method = "swapETHToTokens";
      value = fromAmount;
      params = [path, minOut, account];
    }
    contract = new ethers.Contract(routerAddress, abis.Router, signer);

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
      signer,
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

  let referralCode = ethers.ZeroHash;
  if (!attachedOnChain && userReferralCode) {
    referralCode = userReferralCode;
  }

  const increasePosition = async () => {
    setIsSubmitting(true);
    const tokenAddress0 = fromTokenAddress === ZeroAddress ? nativeTokenAddress : fromTokenAddress;
    const indexTokenAddress = toTokenAddress === ZeroAddress ? nativeTokenAddress : toTokenAddress;
    let path = [indexTokenAddress]; // assume long
    if (toTokenAddress !== fromTokenAddress) {
      path = [tokenAddress0, indexTokenAddress];
    }

    if (fromTokenAddress === ZeroAddress && toTokenAddress === nativeTokenAddress) {
      path = [nativeTokenAddress];
    }

    if (fromTokenAddress === nativeTokenAddress && toTokenAddress === ZeroAddress) {
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
    const priceLimit = bigMath.mulDiv(refPrice, BigInt(priceBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);

    const boundedFromAmount = fromAmount ? fromAmount : 0n;

    if (fromAmount !== undefined && fromAmount > 0 && fromTokenAddress === USDG_ADDRESS && isLong) {
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
      if (nextToAmount == 0n) {
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
      ZeroAddress, // _callbackTarget
    ];

    let method = "createIncreasePosition";
    let value = minExecutionFee;
    if (fromTokenAddress === ZeroAddress) {
      method = "createIncreasePositionETH";
      value = boundedFromAmount + minExecutionFee;
      params = [
        path, // _path
        indexTokenAddress, // _indexToken
        0, // _minOut
        toUsdMax, // _sizeDelta
        isLong, // _isLong
        priceLimit, // _acceptablePrice
        minExecutionFee, // _executionFee
        referralCode, // _referralCode
        ZeroAddress, // _callbackTarget
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
    const contract = new ethers.Contract(contractAddress, abis.PositionRouter, signer);
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
          nextSize = existingPosition.size + toUsdMax;
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

    if (swapOption !== opt) {
      history.push(`/v1/${opt.toLowerCase()}`);
    }
  };

  const onConfirmationClick = () => {
    if (!active) {
      openConnectModal();
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
    if (fromAmount !== undefined) {
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
        fees = bigMath.mulDiv(fromAmount, BigInt(feeBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
        const feeTokenPrice =
          fromTokenInfo.address === USDG_ADDRESS ? expandDecimals(1, USD_DECIMALS) : fromTokenInfo.maxPrice;
        feesUsd = bigMath.mulDiv(fees, feeTokenPrice, expandDecimals(1, fromTokenInfo.decimals));
      }
      feeBps = feeBasisPoints;
    }
  } else if (toUsdMax !== undefined) {
    positionFee = bigMath.mulDiv(toUsdMax, BigInt(MARGIN_FEE_BASIS_POINTS), BASIS_POINTS_DIVISOR_BIGINT);
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
      swapFees = bigMath.mulDiv(fromUsdMin, BigInt(feeBasisPoints), BASIS_POINTS_DIVISOR_BIGINT);
      feesUsd = feesUsd + swapFees;
    }
    feeBps = feeBasisPoints;
  }

  const maxInValue = useMemo(
    () =>
      fromTokenInfo
        ? [
            `${formatAmount(maxFromTokenIn, fromTokenInfo.decimals, 0, true)} ${fromTokenInfo.symbol}`,
            `($${formatAmount(maxFromTokenInUSD, USD_DECIMALS, 0, true)})`,
          ]
        : null,
    [fromTokenInfo, maxFromTokenIn, maxFromTokenInUSD]
  );
  const maxOutValue = useMemo(
    () =>
      toTokenInfo
        ? [
            `${formatAmount(maxToTokenOut, toTokenInfo.decimals, 0, true)} ${toTokenInfo.symbol}`,
            `($${formatAmount(maxToTokenOutUSD, USD_DECIMALS, 0, true)})`,
          ]
        : null,
    [maxToTokenOut, maxToTokenOutUSD, toTokenInfo]
  );

  const SWAP_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "SWAP_ORDER_EXECUTION_GAS_FEE");
  const INCREASE_ORDER_EXECUTION_GAS_FEE = getConstant(chainId, "INCREASE_ORDER_EXECUTION_GAS_FEE");
  const executionFee = isSwap ? SWAP_ORDER_EXECUTION_GAS_FEE : INCREASE_ORDER_EXECUTION_GAS_FEE;
  const executionFeeUsd = getUsd(executionFee, nativeTokenAddress, false, infoTokens);
  const currentExecutionFee = isMarketOrder ? minExecutionFee : executionFee;
  const currentExecutionFeeUsd = isMarketOrder ? minExecutionFeeUSD : executionFeeUsd;

  const executionFees = useMemo(
    () => ({
      fee: currentExecutionFee,
      feeUsd: currentExecutionFeeUsd,
    }),
    [currentExecutionFee, currentExecutionFeeUsd]
  );

  if (!fromToken || !toToken) {
    return null;
  }

  let hasZeroBorrowFee = false;
  let borrowFeeText;
  if (isLong && toTokenInfo && toTokenInfo.fundingRate !== undefined) {
    borrowFeeText = formatAmount(toTokenInfo.fundingRate, 4, 4) + "% / 1h";
    if (toTokenInfo.fundingRate == 0n) {
      // hasZeroBorrowFee = true
    }
  }
  if (isShort && shortCollateralToken && shortCollateralToken.fundingRate !== undefined) {
    borrowFeeText = formatAmount(shortCollateralToken.fundingRate, 4, 4) + "% / 1h";
    if (shortCollateralToken.fundingRate == 0n) {
      // hasZeroBorrowFee = true
    }
  }

  const fromUsdMinAfterFees = fromUsdMin === undefined ? 0n : fromUsdMin - (swapFees ?? 0n) - (positionFee ?? 0n);
  const liquidationPrice = getLiquidationPrice({
    isLong,
    size: hasExistingPosition ? existingPosition.size + (toUsdMax ?? 0n) : toUsdMax ?? 0n,
    collateral: hasExistingPosition
      ? existingPosition.collateralAfterFee + fromUsdMinAfterFees
      : fromUsdMinAfterFees ?? 0n,
    averagePrice: nextAveragePrice ?? 0n,
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
      size: existingPosition.size + (toUsdMax ?? 0n),
      collateral: existingPosition.collateralAfterFee + fromUsdMinAfterFees,
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
    if (!fromToken || fromBalance === undefined) {
      return;
    }

    let maxAvailableAmount =
      (fromToken?.isNative ? minResidualAmount !== undefined && fromBalance - minResidualAmount : fromBalance) ||
      undefined;

    if (maxAvailableAmount < 0) {
      maxAvailableAmount = 0n;
    }

    const formattedMaxAvailableAmount = formatAmountFree(maxAvailableAmount, fromToken.decimals, fromToken.decimals);
    const finalMaxAmount = isMetamaskMobile
      ? limitDecimals(formattedMaxAvailableAmount, MAX_METAMASK_MOBILE_DECIMALS)
      : formattedMaxAvailableAmount;
    setFromValue(finalMaxAmount);
    setAnchorOnFromAmount(true);
  }

  function shouldShowMaxButton() {
    if (!fromToken || fromBalance === undefined) {
      return false;
    }
    const maxAvailableAmount = fromToken?.isNative ? fromBalance - minResidualAmount : fromBalance;
    const shoudShowMaxButtonBasedOnGasAmount = fromToken?.isNative
      ? minResidualAmount !== undefined && fromBalance > minResidualAmount
      : true;
    return (
      shoudShowMaxButtonBasedOnGasAmount &&
      fromValue !== formatAmountFree(maxAvailableAmount, fromToken.decimals, fromToken.decimals)
    );
  }

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
    return (
      <Button disabled variant="primary-action" className="w-full">
        <Trans>V1 trading disabled. Switch to V2</Trans>
      </Button>
    );
  }

  const swapTabsOptions = SWAP_OPTIONS.map((option) => ({
    value: option,
    label: localizedSwapLabels[option],
    className: SWAP_OPTIONS_CLASSNAMES[option],
    icon: SWAP_ICONS[option],
  }));

  const orderTabsOptions = orderOptions.map((option) => ({
    value: option,
    label: localizedOrderOptionLabels[option],
  }));

  return (
    <div className="Exchange-swap-box">
      <form>
        <div className="Exchange-swap-box-inner App-box-highlight">
          <div>
            <Tabs
              options={swapTabsOptions}
              selectedValue={swapOption}
              onChange={onSwapOptionChange}
              className="Exchange-swap-option-tabs"
            />
            {flagOrdersEnabled && (
              <Tabs
                options={orderTabsOptions}
                className="Exchange-swap-order-type-tabs"
                type="inline"
                selectedValue={orderOption}
                onChange={onOrderOptionChange}
              />
            )}
          </div>
          {(showFromAndToSection || showTriggerRatioSection || showTriggerPriceSection) && (
            <div className="mb-12 flex flex-col gap-4">
              {showFromAndToSection && (
                <>
                  <BuyInputSection
                    topLeftLabel={t`Pay`}
                    bottomLeftValue={fromUsdMin !== undefined && `$${formatAmount(fromUsdMin, USD_DECIMALS, 2, true)}`}
                    bottomRightLabel={t`Balance`}
                    bottomRightValue={
                      fromBalance !== undefined && formatAmount(fromBalance, fromToken.decimals, 4, true)
                    }
                    onClickBottomRightLabel={setFromValueToMaximumAvailable}
                    showMaxButton={shouldShowMaxButton()}
                    inputValue={fromValue}
                    onInputValueChange={onFromValueChange}
                    onClickMax={setFromValueToMaximumAvailable}
                  >
                    <TokenSelector
                      label={t`Pay`}
                      size="l"
                      chainId={chainId}
                      tokenAddress={fromTokenAddress}
                      onSelectToken={onSelectFromToken}
                      tokens={fromTokens}
                      infoTokens={infoTokens}
                      showTokenImgInDropdown={true}
                      showSymbolImage
                    />
                  </BuyInputSection>
                  <div>
                    <div className="Exchange-swap-ball-container">
                      <button type="button" className="Exchange-swap-ball" onClick={switchTokens}>
                        <IoMdSwap className="Exchange-swap-ball-icon" />
                      </button>
                    </div>
                    <BuyInputSection
                      topLeftLabel={getToLabel()}
                      bottomRightLabel={isSwap ? t`Balance` : t`Leverage`}
                      bottomLeftValue={toUsdMax !== undefined && `$${formatAmount(toUsdMax, USD_DECIMALS, 2, true)}`}
                      bottomRightValue={
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
                        size="l"
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
                  </div>
                </>
              )}
              {showTriggerRatioSection && (
                <BuyInputSection
                  topLeftLabel={t`Price`}
                  topRightValue={formatAmount(
                    getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted),
                    USD_DECIMALS,
                    4
                  )}
                  topRightLabel={t`Mark`}
                  onClickTopRightLabel={() => {
                    setTriggerRatioValue(
                      formatAmountFree(
                        getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted),
                        USD_DECIMALS,
                        10
                      )
                    );
                  }}
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
            </div>
          )}
          {isSwap && (
            <div className="Exchange-swap-box-info">
              <ExchangeInfoRow label={t`Fees`}>
                <div>
                  {fees === undefined && "-"}
                  {fees !== undefined && (
                    <FeesTooltip swapFee={feesUsd} executionFees={!isMarketOrder && executionFees} />
                  )}
                </div>
              </ExchangeInfoRow>
            </div>
          )}
          {(isLong || isShort) && !isStopOrder && (
            <div className="Exchange-leverage-box">
              <ToggleSwitch
                className="mb-8"
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
                      position="bottom-start"
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
                            className="cursor-pointer text-slate-100 underline"
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
                      position="bottom-end"
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
                  {hasExistingPosition && toAmount !== undefined && toAmount > 0 && (
                    <div className="muted inline-block">
                      {formatAmount(existingPosition.leverage, 4, 2)}x
                      <BsArrowRight className="transition-arrow inline-block" />
                    </div>
                  )}
                  {toAmount !== undefined &&
                    leverage !== undefined &&
                    leverage > 0 &&
                    `${formatAmount(leverage, 4, 2)}x`}
                  {toAmount === undefined && leverage > 0 && `-`}
                  {leverage == 0n && `-`}
                </div>
              </div>
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Entry Price</Trans>
                </div>
                <div className="align-right">
                  {hasExistingPosition && toAmount !== undefined && toAmount > 0 && (
                    <div className="muted inline-block">
                      ${formatAmount(existingPosition.averagePrice, USD_DECIMALS, existingPositionPriceDecimal, true)}
                      <BsArrowRight className="transition-arrow inline-block" />
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
                  {hasExistingPosition && toAmount !== undefined && toAmount > 0 && (
                    <div className="muted inline-block">
                      ${formatAmount(existingLiquidationPrice, USD_DECIMALS, existingPositionPriceDecimal, true)}
                      <BsArrowRight className="transition-arrow inline-block" />
                    </div>
                  )}
                  {toAmount !== undefined &&
                    displayLiquidationPrice !== undefined &&
                    `$${formatAmount(displayLiquidationPrice, USD_DECIMALS, toTokenPriceDecimal, true)}`}
                  {toAmount === undefined && displayLiquidationPrice !== undefined && `-`}
                  {displayLiquidationPrice === undefined && `-`}
                </div>
              </div>
              <ExchangeInfoRow label={t`Fees`}>
                <div>
                  {feesUsd === undefined && "-"}

                  {feesUsd !== undefined && (
                    <FeesTooltip
                      fundingRate={getFundingRate()}
                      executionFees={executionFees}
                      positionFee={positionFee}
                      swapFee={swapFees}
                      titleText={
                        swapFees !== undefined && <Trans>{collateralToken.symbol} is required for collateral.</Trans>
                      }
                    />
                  )}
                </div>
              </ExchangeInfoRow>
            </div>
          )}
          {isStopOrder && (
            <div className="Exchange-swap-section Exchange-trigger-order-info">
              <Trans>
                There is a "Close" button on each position row, clicking it will display the option to close positions
                via market orders.
              </Trans>
              <br />
              <br />
              <Trans>
                Trigger orders, increasing positions (market or limit), adding collateral, and swapping on GMX V1 are
                now disabled. You can still close existing positions using market orders.
              </Trans>
              <br />
              <br />
              <Trans>Please migrate your positions to GMX V2.</Trans>
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
                  position="bottom-end"
                  renderContent={() => {
                    return (
                      <div>
                        <StatsTooltipRow label={t`Max ${fromTokenInfo.symbol} in`} value={maxInValue} />
                        <StatsTooltipRow label={t`Max ${toTokenInfo.symbol} out`} value={maxOutValue} />
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
                  position="bottom-end"
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
                            Read more
                          </ExternalLink>
                          .
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
                  position="bottom-end"
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
                            Read more
                          </ExternalLink>
                          .
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
                  position="bottom-end"
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
                          <Trans>Read more</Trans>
                        </ExternalLink>
                        .
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
                    position="bottom-end"
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
