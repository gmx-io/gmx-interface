import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import {
  adjustForDecimals,
  DUST_BNB,
  getBuyGlpFromAmount,
  getBuyGlpToAmount,
  getSellGlpFromAmount,
  getSellGlpToAmount,
  GLP_COOLDOWN_DURATION,
  GLP_DECIMALS,
  PLACEHOLDER_ACCOUNT,
  SECONDS_PER_YEAR,
  USD_DECIMALS,
  USDG_DECIMALS,
} from "lib/legacy";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import useSWR from "swr";
import Tab from "../Tab/Tab";

import { useGmxPrice } from "domain/legacy";

import TokenSelector from "components/TokenSelector/TokenSelector";
import BuyInputSection from "../BuyInputSection/BuyInputSection";
import Tooltip from "../Tooltip/Tooltip";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import RewardRouter from "abis/RewardRouter.json";
import RewardTracker from "abis/RewardTracker.json";
import Token from "abis/Token.json";
import VaultV2 from "abis/VaultV2.json";
import Vester from "abis/Vester.json";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ARBITRUM, FEES_HIGH_BPS, getChainName, IS_NETWORK_DISABLED } from "config/chains";
import { getIcon } from "config/icons";
import { getNativeToken, getToken, getV1Tokens, getWhitelistedV1Tokens, getWrappedToken } from "config/tokens";
import { approveTokens, useInfoTokens } from "domain/tokens";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { useChainId } from "lib/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useLocalStorageByChainId } from "lib/localStorage";
import {
  applyFactor,
  basisPointsToFloat,
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatKeyAmount,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import { IoChevronDownOutline } from "react-icons/io5";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import "./GlpSwap.css";
import SwapErrorModal from "./SwapErrorModal";
import useWallet from "lib/wallets/useWallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import TokenIcon from "components/TokenIcon/TokenIcon";
import PageTitle from "components/PageTitle/PageTitle";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { getFeeItem } from "domain/synthetics/fees";
import { differenceInSeconds, intervalToDuration, nextWednesday } from "date-fns";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import Checkbox from "components/Checkbox/Checkbox";

const { AddressZero } = ethers.constants;

function getNextWednesdayUTC() {
  const now = new Date();
  const nextWed = nextWednesday(now);
  return Date.UTC(nextWed.getUTCFullYear(), nextWed.getUTCMonth(), nextWed.getUTCDate());
}

function getTimeLeftToNextWednesday() {
  const now = new Date();
  const nextWedUtc = getNextWednesdayUTC();
  const duration = intervalToDuration({
    start: now,
    end: nextWedUtc,
  });

  const days = duration.days ? `${duration.days}d ` : "";
  const hours = duration.hours ? `${duration.hours}h ` : "";
  const minutes = duration.minutes ? `${duration.minutes}m` : "";
  return `${days}${hours}${minutes}`.trim();
}

function getMinutesToNextEpochIfLessThanHour() {
  const now = new Date();
  const nextWedUtc = getNextWednesdayUTC();
  const totalSeconds = differenceInSeconds(nextWedUtc, now);
  const totalMinutes = Math.ceil(totalSeconds / 60);

  if (totalMinutes < 60) {
    return totalMinutes;
  }
  return null;
}

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = ["stakedGlpTracker", "feeGlpTracker"];
  const data = {};
  const propsLength = 5;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4],
    };
  }

  return data;
}

function getTooltipContent(managedUsd, tokenInfo, token) {
  return (
    <>
      <StatsTooltipRow
        label={t`Current Pool Amount`}
        value={[
          `$${formatAmount(managedUsd, USD_DECIMALS, 0, true)}`,
          `(${formatKeyAmount(tokenInfo, "managedAmount", token.decimals, 0, true)} ${token.symbol})`,
        ]}
      />
      <StatsTooltipRow label={t`Max Pool Capacity`} value={formatAmount(tokenInfo.maxUsdgAmount, 18, 0, true)} />
    </>
  );
}

export default function GlpSwap(props) {
  const { savedSlippageAmount, isBuying, setPendingTxns, setIsBuying, savedShouldDisableValidationForTesting } = props;
  const history = useHistory();
  const isMetamaskMobile = useIsMetamaskMobile();
  const swapLabel = isBuying ? "BuyGlp" : "SellGlp";
  const tabLabel = isBuying ? t`Buy GLP` : t`Sell GLP`;
  const { active, signer, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { chainId } = useChainId();
  const tokens = getV1Tokens(chainId);
  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);
  const minutesToNextEpoch = getMinutesToNextEpochIfLessThanHour();

  const [swapValue, setSwapValue] = useState("");
  const [glpValue, setGlpValue] = useState("");
  const [swapTokenAddress, setSwapTokenAddress] = useLocalStorageByChainId(
    chainId,
    `${swapLabel}-swap-token-address`,
    AddressZero
  );
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anchorOnSwapAmount, setAnchorOnSwapAmount] = useState(true);
  const [feeBasisPoints, setFeeBasisPoints] = useState("");
  const [modalError, setModalError] = useState(false);
  const [isEpochAcknowledgeSelected, setIsEpochAcknowledgeSelected] = useState(false);

  const readerAddress = getContract(chainId, "Reader");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const usdgAddress = getContract(chainId, "USDG");
  const glpManagerAddress = getContract(chainId, "GlpManager");
  const glpRewardRouterAddress = getContract(chainId, "GlpRewardRouter");

  const tokensForBalanceAndSupplyQuery = [stakedGlpTrackerAddress, usdgAddress];
  const glpIcon = getIcon(chainId, "glp");

  const isFeesHigh = feeBasisPoints > FEES_HIGH_BPS;

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(
    [`GlpSwap:getTokenBalances:${active}`, chainId, readerAddress, "getTokenBalances", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, ReaderV2, [tokenAddresses]),
    }
  );

  const incentiveStats = useIncentiveStats();

  function getFeesLabel() {
    if (isFeesHigh) {
      return t`WARNING: High Fees`;
    }

    if (!isBuying && incentiveStats?.migration?.isActive) {
      return t`Fees (Rebated)`;
    }

    return t`Fees`;
  }

  const { data: balancesAndSupplies } = useSWR(
    [
      `GlpSwap:getTokenBalancesWithSupplies:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, ReaderV2, [tokensForBalanceAndSupplyQuery]),
    }
  );

  const { data: aums } = useSWR([`GlpSwap:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: contractFetcher(signer, GlpManager),
  });

  const { data: totalTokenWeights } = useSWR(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(signer, VaultV2),
    }
  );

  const tokenAllowanceAddress = swapTokenAddress === AddressZero ? nativeTokenAddress : swapTokenAddress;
  const { data: tokenAllowance } = useSWR(
    [active, chainId, tokenAllowanceAddress, "allowance", account || PLACEHOLDER_ACCOUNT, glpManagerAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  const { data: lastPurchaseTime } = useSWR(
    [`GlpSwap:lastPurchaseTime:${active}`, chainId, glpManagerAddress, "lastAddedAt", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, GlpManager),
    }
  );

  const { data: glpBalance } = useSWR(
    [`GlpSwap:glpBalance:${active}`, chainId, feeGlpTrackerAddress, "stakedAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  const glpVesterAddress = getContract(chainId, "GlpVester");
  const { data: reservedAmount } = useSWR(
    [`GlpSwap:reservedAmount:${active}`, chainId, glpVesterAddress, "pairAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, Vester),
    }
  );

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const rewardTrackersForStakingInfo = [stakedGlpTrackerAddress, feeGlpTrackerAddress];
  const { data: stakingInfo } = useSWR(
    [`GlpSwap:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const stakingData = getStakingData(stakingInfo);

  const redemptionTime = lastPurchaseTime ? lastPurchaseTime.add(GLP_COOLDOWN_DURATION) : undefined;
  const inCooldownWindow = redemptionTime && parseInt(Date.now() / 1000) < redemptionTime;

  const glpSupply = balancesAndSupplies ? balancesAndSupplies[1] : bigNumberify(0);
  const usdgSupply = balancesAndSupplies ? balancesAndSupplies[3] : bigNumberify(0);
  let aum;
  if (aums && aums.length > 0) {
    aum = isBuying ? aums[0] : aums[1];
  }
  const glpPrice =
    aum && aum.gt(0) && glpSupply.gt(0)
      ? aum.mul(expandDecimals(1, GLP_DECIMALS)).div(glpSupply)
      : expandDecimals(1, USD_DECIMALS);
  let glpBalanceUsd;
  if (glpBalance) {
    glpBalanceUsd = glpBalance.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));
  }
  const glpSupplyUsd = glpSupply.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));

  let reserveAmountUsd;
  if (reservedAmount) {
    reserveAmountUsd = reservedAmount.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS));
  }

  let maxSellAmount = glpBalance;
  if (glpBalance && reservedAmount) {
    maxSellAmount = glpBalance.sub(reservedAmount);
  }

  const { infoTokens } = useInfoTokens(signer, chainId, active, tokenBalances, undefined);
  const swapToken = getToken(chainId, swapTokenAddress);
  const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);

  const swapTokenBalance = swapTokenInfo && swapTokenInfo.balance ? swapTokenInfo.balance : bigNumberify(0);

  const swapAmount = parseValue(swapValue, swapToken && swapToken.decimals);
  const glpAmount = parseValue(glpValue, GLP_DECIMALS);

  const needApproval =
    isBuying && swapTokenAddress !== AddressZero && tokenAllowance && swapAmount && swapAmount.gt(tokenAllowance);

  const swapUsdMin = getUsd(swapAmount, swapTokenAddress, false, infoTokens);
  const glpUsdMax = glpAmount && glpPrice ? glpAmount.mul(glpPrice).div(expandDecimals(1, GLP_DECIMALS)) : undefined;

  let isSwapTokenCapReached;
  if (swapTokenInfo.managedUsd && swapTokenInfo.maxUsdgAmount) {
    isSwapTokenCapReached = swapTokenInfo.managedUsd.gt(
      adjustForDecimals(swapTokenInfo.maxUsdgAmount, USDG_DECIMALS, USD_DECIMALS)
    );
  }

  const onSwapValueChange = (e) => {
    setAnchorOnSwapAmount(true);
    setSwapValue(e.target.value);
  };

  const onGlpValueChange = (e) => {
    setAnchorOnSwapAmount(false);
    setGlpValue(e.target.value);
  };

  const onSelectSwapToken = (token) => {
    setSwapTokenAddress(token.address);
    setIsWaitingForApproval(false);
  };

  const nativeToken = getTokenInfo(infoTokens, AddressZero);

  let totalApr = bigNumberify(0);

  let feeGlpTrackerAnnualRewardsUsd;
  let feeGlpTrackerApr;
  if (
    stakingData &&
    stakingData.feeGlpTracker &&
    stakingData.feeGlpTracker.tokensPerInterval &&
    nativeToken &&
    nativeToken.minPrice &&
    glpSupplyUsd &&
    glpSupplyUsd.gt(0)
  ) {
    feeGlpTrackerAnnualRewardsUsd = stakingData.feeGlpTracker.tokensPerInterval
      .mul(SECONDS_PER_YEAR)
      .mul(nativeToken.minPrice)
      .div(expandDecimals(1, 18));
    feeGlpTrackerApr = feeGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(glpSupplyUsd);
    totalApr = totalApr.add(feeGlpTrackerApr);
  }

  let stakedGlpTrackerAnnualRewardsUsd;
  let stakedGlpTrackerApr;

  if (
    gmxPrice &&
    stakingData &&
    stakingData.stakedGlpTracker &&
    stakingData.stakedGlpTracker.tokensPerInterval &&
    glpSupplyUsd &&
    glpSupplyUsd.gt(0)
  ) {
    stakedGlpTrackerAnnualRewardsUsd = stakingData.stakedGlpTracker.tokensPerInterval
      .mul(SECONDS_PER_YEAR)
      .mul(gmxPrice)
      .div(expandDecimals(1, 18));
    stakedGlpTrackerApr = stakedGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(glpSupplyUsd);
    totalApr = totalApr.add(stakedGlpTrackerApr);
  }

  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnSwapAmount) {
        if (!swapAmount) {
          setGlpValue("");
          setFeeBasisPoints("");
          return;
        }

        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyGlpToAmount(
            swapAmount,
            swapTokenAddress,
            infoTokens,
            glpPrice,
            usdgSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, GLP_DECIMALS, GLP_DECIMALS);
          setGlpValue(nextValue);
          setFeeBasisPoints(feeBps);
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellGlpFromAmount(
            swapAmount,
            swapTokenAddress,
            infoTokens,
            glpPrice,
            usdgSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, GLP_DECIMALS, GLP_DECIMALS);
          setGlpValue(nextValue);
          setFeeBasisPoints(feeBps);
        }

        return;
      }

      if (!glpAmount) {
        setSwapValue("");
        setFeeBasisPoints("");
        return;
      }

      if (swapToken) {
        if (isBuying) {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getBuyGlpFromAmount(
            glpAmount,
            swapTokenAddress,
            infoTokens,
            glpPrice,
            usdgSupply,
            totalTokenWeights
          );
          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals);
          setSwapValue(nextValue);
          setFeeBasisPoints(feeBps);
        } else {
          const { amount: nextAmount, feeBasisPoints: feeBps } = getSellGlpToAmount(
            glpAmount,
            swapTokenAddress,
            infoTokens,
            glpPrice,
            usdgSupply,
            totalTokenWeights,
            true
          );

          const nextValue = formatAmountFree(nextAmount, swapToken.decimals, swapToken.decimals);
          setSwapValue(nextValue);
          setFeeBasisPoints(feeBps);
        }
      }
    };

    updateSwapAmounts();
  }, [
    isBuying,
    anchorOnSwapAmount,
    swapAmount,
    glpAmount,
    swapToken,
    swapTokenAddress,
    infoTokens,
    glpPrice,
    usdgSupply,
    totalTokenWeights,
  ]);

  const switchSwapOption = (hash = "") => {
    const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    history.push(`${history.location.pathname}#${hash}`);
    props.setIsBuying(hash === "redeem" ? false : true);
    window.scrollTo(0, currentScrollPosition);
  };

  const fillMaxAmount = () => {
    if (isBuying) {
      setAnchorOnSwapAmount(true);
      const maxAvailableAmount = swapToken.isNative
        ? swapTokenBalance.sub(bigNumberify(DUST_BNB).mul(2))
        : swapTokenBalance;

      const formattedAmount = formatAmountFree(
        maxAvailableAmount.gt(0) ? maxAvailableAmount : 0,
        swapToken.decimals,
        swapToken.decimals
      );
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedAmount;
      setSwapValue(finalAmount);
      return;
    }

    setAnchorOnSwapAmount(false);
    const formattedMaxSellAmount = formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS);
    setGlpValue(formattedMaxSellAmount);
  };

  const getError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      if (isBuying) return [t`GLP buy disabled, pending ${getChainName(chainId)} upgrade`];
      return [t`GLP sell disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (
      !isBuying &&
      feeBasisPoints &&
      minutesToNextEpoch &&
      !isEpochAcknowledgeSelected &&
      incentiveStats?.migration?.isActive
    ) {
      return [t`Epoch ending is not acknowledged`];
    }

    if (!isBuying && inCooldownWindow) {
      return [t`Redemption time not yet reached`];
    }

    if (!swapAmount || swapAmount.eq(0)) {
      return [t`Enter an amount`];
    }
    if (!glpAmount || glpAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    if (isBuying) {
      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (
        !savedShouldDisableValidationForTesting &&
        swapTokenInfo &&
        swapTokenInfo.balance &&
        swapAmount &&
        swapAmount.gt(swapTokenInfo.balance)
      ) {
        return [t`Insufficient ${swapTokenInfo.symbol} balance`];
      }

      if (swapTokenInfo.maxUsdgAmount && swapTokenInfo.usdgAmount && swapUsdMin) {
        const usdgFromAmount = adjustForDecimals(swapUsdMin, USD_DECIMALS, USDG_DECIMALS);
        const nextUsdgAmount = swapTokenInfo.usdgAmount.add(usdgFromAmount);
        if (swapTokenInfo.maxUsdgAmount.gt(0) && nextUsdgAmount.gt(swapTokenInfo.maxUsdgAmount)) {
          return [t`${swapTokenInfo.symbol} pool exceeded, try different token`, true];
        }
      }
    }

    if (!isBuying) {
      if (maxSellAmount && glpAmount && glpAmount.gt(maxSellAmount)) {
        return [t`Insufficient GLP balance`];
      }

      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (
        swapTokenInfo &&
        swapTokenInfo.availableAmount &&
        swapAmount &&
        swapAmount.gt(swapTokenInfo.availableAmount)
      ) {
        return [t`Insufficient liquidity`];
      }
    }

    return [false];
  };

  const isPrimaryEnabled = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      return false;
    }
    if (!active) {
      return true;
    }

    if (
      !isBuying &&
      feeBasisPoints &&
      minutesToNextEpoch &&
      !isEpochAcknowledgeSelected &&
      incentiveStats?.migration?.isActive
    ) {
      return false;
    }

    const [error, modal] = getError();
    if (error && !modal) {
      return false;
    }
    if ((needApproval && isWaitingForApproval) || isApproving) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isSubmitting) {
      return false;
    }
    if (isBuying && isSwapTokenCapReached) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    if (!active) {
      return t`Connect Wallet`;
    }
    const [error, modal] = getError();
    if (error && !modal) {
      return error;
    }
    if (isBuying && isSwapTokenCapReached) {
      return t`Max Capacity for ${swapToken.symbol} Reached`;
    }

    if (needApproval && isWaitingForApproval) {
      return t`Waiting for Approval`;
    }
    if (isApproving) {
      return t`Approving ${swapToken.assetSymbol ?? swapToken.symbol}...`;
    }
    if (needApproval) {
      return t`Approve ${swapToken.assetSymbol ?? swapToken.symbol}`;
    }

    if (isSubmitting) {
      return isBuying ? t`Buying...` : t`Selling...`;
    }

    return isBuying ? t`Buy GLP` : t`Sell GLP`;
  };

  const approveFromToken = () => {
    approveTokens({
      setIsApproving,
      signer,
      tokenAddress: swapToken.address,
      spender: glpManagerAddress,
      chainId: chainId,
      onApproveSubmitted: () => {
        setIsWaitingForApproval(true);
      },
      infoTokens,
      getTokenInfo,
    });
  };

  const buyGlp = () => {
    setIsSubmitting(true);

    const minGlp = glpAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    const contract = new ethers.Contract(glpRewardRouterAddress, RewardRouter.abi, signer);
    const method = swapTokenAddress === AddressZero ? "mintAndStakeGlpETH" : "mintAndStakeGlp";
    const params = swapTokenAddress === AddressZero ? [0, minGlp] : [swapTokenAddress, swapAmount, 0, minGlp];
    const value = swapTokenAddress === AddressZero ? swapAmount : 0;

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: t`Buy submitted.`,
      failMsg: t`Buy failed.`,
      successMsg: t`${formatAmount(glpAmount, 18, 4, true)} GLP bought with ${formatAmount(
        swapAmount,
        swapTokenInfo.decimals,
        4,
        true
      )} ${swapTokenInfo.symbol}!`,
      setPendingTxns,
    })
      .then(async () => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const sellGlp = () => {
    setIsSubmitting(true);

    const minOut = swapAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);

    const contract = new ethers.Contract(glpRewardRouterAddress, RewardRouter.abi, signer);
    const method = swapTokenAddress === AddressZero ? "unstakeAndRedeemGlpETH" : "unstakeAndRedeemGlp";
    const params =
      swapTokenAddress === AddressZero ? [glpAmount, minOut, account] : [swapTokenAddress, glpAmount, minOut, account];

    callContract(chainId, contract, method, params, {
      sentMsg: t`Sell submitted!`,
      failMsg: t`Sell failed.`,
      successMsg: t`${formatAmount(glpAmount, 18, 4, true)} GLP sold for ${formatAmount(
        swapAmount,
        swapTokenInfo.decimals,
        4,
        true
      )} ${swapTokenInfo.symbol}!`,
      setPendingTxns,
    })
      .then(async () => {})
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onClickPrimary = () => {
    if (!active) {
      openConnectModal();
      return;
    }

    if (needApproval) {
      approveFromToken();
      return;
    }

    const [, modal] = getError();

    if (modal) {
      setModalError(true);
      return;
    }

    if (isBuying) {
      buyGlp();
    } else {
      sellGlp();
    }
  };

  let payLabel = t`Pay`;
  let receiveLabel = t`Receive`;
  let payBalance = "$0.00";
  let receiveBalance = "$0.00";
  if (isBuying) {
    if (swapUsdMin) {
      payBalance = `$${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)}`;
    }
    if (glpUsdMax) {
      receiveBalance = `$${formatAmount(glpUsdMax, USD_DECIMALS, 2, true)}`;
    }
  } else {
    if (glpUsdMax) {
      payBalance = `$${formatAmount(glpUsdMax, USD_DECIMALS, 2, true)}`;
    }
    if (swapUsdMin) {
      receiveBalance = `$${formatAmount(swapUsdMin, USD_DECIMALS, 2, true)}`;
    }
  }

  const selectToken = (token) => {
    setAnchorOnSwapAmount(false);
    setSwapTokenAddress(token.address);
    helperToast.success(t`${token.symbol} selected in order form`);
  };

  let feePercentageText = formatAmount(feeBasisPoints, 2, 2, true, "-");
  if (feeBasisPoints !== undefined && feeBasisPoints.toString().length > 0) {
    feePercentageText += "%";
  }

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  const onSwapOptionChange = (opt) => {
    if (opt === t`Sell GLP`) {
      switchSwapOption("redeem");
    } else {
      switchSwapOption();
    }
  };

  function renderMigrationIncentive() {
    if (!incentiveStats?.migration?.isActive) return;

    const feeFactor = basisPointsToFloat(BigNumber.from(feeBasisPoints));
    const glpUsdMaxNegative = glpUsdMax?.mul(-1);
    const feeItem =
      glpUsdMax &&
      getFeeItem(applyFactor(glpUsdMaxNegative, feeFactor), glpUsdMax, {
        shouldRoundUp: true,
      });
    const rebateBasisPoints = basisPointsToFloat(
      BigNumber.from(Math.min(feeBasisPoints, incentiveStats?.migration?.maxRebateBps || 25))
    );
    const maxRebateUsd = glpUsdMax && applyFactor(glpUsdMax?.abs(), rebateBasisPoints);
    const rebateFeeItem = glpUsdMax && getFeeItem(maxRebateUsd, glpUsdMax, { shouldRoundUp: true });

    return (
      <>
        <StatsTooltipRow
          label="Base Fee"
          value={formatDeltaUsd(feeItem?.deltaUsd, feeItem?.bps)}
          showDollar={false}
          className="text-red"
        />
        <StatsTooltipRow
          label="Max Bonus Rebate"
          value={formatDeltaUsd(rebateFeeItem?.deltaUsd, rebateFeeItem?.bps)}
          showDollar={false}
          className="text-green"
        />
        <br />
        <div className="text-white">
          <Trans>
            The Bonus Rebate is an estimate and will be airdropped as ARB tokens when migrating this liquidity to GM
            pools within the same epoch.{" "}
            <ExternalLink
              href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3#a2d1ea61dd1147b195b7e3bd769348d3"
              newTab
            >
              Read more
            </ExternalLink>
            .
          </Trans>
        </div>
        <br />
        <div className="text-white">
          <Trans>
            Buy GM tokens before the epoch resets in {getTimeLeftToNextWednesday()} to be eligible for the Bonus Rebate.
            Alternatively, wait for the epoch to reset to redeem GLP and buy GM within the same epoch.
          </Trans>
        </div>
        <br />
      </>
    );
  }

  function renderEpochEndingCheckbox(minutes) {
    if (isBuying || !feeBasisPoints || !incentiveStats?.migration?.isActive) return;
    return (
      <div className="PositionSeller-price-impact-warning">
        <Checkbox asRow isChecked={isEpochAcknowledgeSelected} setIsChecked={setIsEpochAcknowledgeSelected}>
          <span className="text-warning font-sm">
            <Trans>Acknowledge epoch is ending in {minutes} minutes</Trans>
          </span>
        </Checkbox>
      </div>
    );
  }
  return (
    <div className="GlpSwap">
      <SwapErrorModal
        isVisible={Boolean(modalError)}
        setIsVisible={setModalError}
        swapToken={swapToken}
        chainId={chainId}
        glpAmount={glpAmount}
        usdgSupply={usdgSupply}
        totalTokenWeights={totalTokenWeights}
        glpPrice={glpPrice}
        infoTokens={infoTokens}
        swapUsdMin={swapUsdMin}
      />
      <div className="GlpSwap-content">
        <div className="App-card GlpSwap-stats-card">
          <div className="App-card-title">
            <div className="App-card-title-mark">
              <div className="App-card-title-mark-icon">
                <img width="40" src={glpIcon} alt="GLP" />
              </div>
              <div className="App-card-title-mark-info">
                <div className="App-card-title-mark-title">GLP</div>
                <div className="App-card-title-mark-subtitle">GLP</div>
              </div>
              <div>
                <AssetDropdown assetSymbol="GLP" />
              </div>
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">
                <Trans>Price</Trans>
              </div>
              <div className="value">${formatAmount(glpPrice, USD_DECIMALS, 3, true)}</div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div className="value">
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} GLP ($
                {formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div className="value">
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} GLP ($
                {formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
          <div className="App-card-divider" />
          <div className="App-card-content">
            {!isBuying && (
              <div className="App-card-row">
                <div className="label">
                  <Trans>Reserved</Trans>
                </div>
                <div className="value">
                  <Tooltip
                    handle={`${formatAmount(reservedAmount, 18, 4, true)} GLP ($${formatAmount(
                      reserveAmountUsd,
                      USD_DECIMALS,
                      2,
                      true
                    )})`}
                    position="right-bottom"
                    renderContent={() =>
                      t`${formatAmount(reservedAmount, 18, 4, true)} GLP have been reserved for vesting.`
                    }
                  />
                </div>
              </div>
            )}
            <div className="App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div className="value">
                <Tooltip
                  handle={`${formatAmount(totalApr, 2, 2, true)}%`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        <StatsTooltipRow
                          label={t`${nativeTokenSymbol} (${wrappedTokenSymbol}) APR`}
                          value={`${formatAmount(feeGlpTrackerApr, 2, 2, false)}%`}
                          showDollar={false}
                        />
                        <StatsTooltipRow
                          label={t`Escrowed GMX APR`}
                          value={`${formatAmount(stakedGlpTrackerApr, 2, 2, false)}%`}
                          showDollar={false}
                        />
                      </>
                    );
                  }}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Total Supply</Trans>
              </div>
              <div className="value">
                <Trans>
                  {formatAmount(glpSupply, GLP_DECIMALS, 4, true)} GLP ($
                  {formatAmount(glpSupplyUsd, USD_DECIMALS, 2, true)})
                </Trans>
              </div>
            </div>
          </div>
        </div>
        <div className="GlpSwap-box App-box">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onClickPrimary();
            }}
          >
            <Tab
              options={[t`Buy GLP`, t`Sell GLP`]}
              option={tabLabel}
              onChange={onSwapOptionChange}
              className="Exchange-swap-option-tabs"
            />
            {isBuying && (
              <BuyInputSection
                topLeftLabel={payLabel}
                topRightLabel={t`Balance`}
                topRightValue={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
                inputValue={swapValue}
                onInputValueChange={onSwapValueChange}
                showMaxButton={swapValue !== formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals)}
                onClickTopRightLabel={fillMaxAmount}
                onClickMax={fillMaxAmount}
                topLeftValue={payBalance}
              >
                <TokenSelector
                  label={t`Pay`}
                  chainId={chainId}
                  tokenAddress={swapTokenAddress}
                  onSelectToken={onSelectSwapToken}
                  tokens={whitelistedTokens}
                  infoTokens={infoTokens}
                  className="GlpSwap-from-token"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                />
              </BuyInputSection>
            )}

            {!isBuying && (
              <BuyInputSection
                topLeftLabel={payLabel}
                topRightLabel={t`Available`}
                topRightValue={`${formatAmount(maxSellAmount, GLP_DECIMALS, 4, true)}`}
                inputValue={glpValue}
                onInputValueChange={onGlpValueChange}
                showMaxButton={glpValue !== formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS)}
                onClickTopRightLabel={fillMaxAmount}
                onClickMax={fillMaxAmount}
                topLeftValue={payBalance}
              >
                <div className="selected-token inline-items-center">
                  <img className="mr-xs" width={20} src={glpIcon} alt="GLP" />
                  GLP
                </div>
              </BuyInputSection>
            )}

            <div className="AppOrder-ball-container">
              <button
                type="button"
                className="AppOrder-ball"
                onClick={() => {
                  setIsBuying(!isBuying);
                  switchSwapOption(isBuying ? "redeem" : "");
                }}
              >
                <IoChevronDownOutline className="AppOrder-ball-icon" />
              </button>
            </div>

            {isBuying && (
              <BuyInputSection
                topLeftLabel={receiveLabel}
                topRightLabel={t`Balance`}
                topLeftValue={receiveBalance}
                topRightValue={`${formatAmount(glpBalance, GLP_DECIMALS, 4, true)}`}
                inputValue={glpValue}
                onInputValueChange={onGlpValueChange}
                defaultTokenName={"GLP"}
              >
                <div className="selected-token inline-items-center">
                  <img className="mr-xs" width={20} src={glpIcon} alt="GLP" />
                  GLP
                </div>
              </BuyInputSection>
            )}

            {!isBuying && (
              <BuyInputSection
                topLeftLabel={receiveLabel}
                topRightLabel={t`Balance`}
                topLeftValue={receiveBalance}
                topRightValue={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
                inputValue={swapValue}
                onInputValueChange={onSwapValueChange}
                selectedToken={swapToken}
              >
                <TokenSelector
                  label={t`Receive`}
                  chainId={chainId}
                  tokenAddress={swapTokenAddress}
                  onSelectToken={onSelectSwapToken}
                  tokens={whitelistedTokens}
                  infoTokens={infoTokens}
                  className="GlpSwap-from-token"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                />
              </BuyInputSection>
            )}

            <div>
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">{getFeesLabel()}</div>
                <div className="align-right fee-block">
                  {isBuying && (
                    <Tooltip
                      handle={isBuying && isSwapTokenCapReached ? "NA" : feePercentageText}
                      position="right-bottom"
                      renderContent={() => {
                        if (!feeBasisPoints) {
                          return (
                            <div className="text-white">
                              <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                            </div>
                          );
                        }
                        return (
                          <div className="text-white">
                            {isFeesHigh && <Trans>To reduce fees, select a different asset to pay with.</Trans>}
                            <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                          </div>
                        );
                      }}
                    />
                  )}
                  {!isBuying && (
                    <Tooltip
                      handle={feePercentageText}
                      position="right-bottom"
                      renderContent={() => {
                        if (!feeBasisPoints) {
                          return (
                            <div className="text-white">
                              <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                            </div>
                          );
                        }
                        return (
                          <div className="text-white">
                            {renderMigrationIncentive()}
                            {isFeesHigh && (
                              <>
                                <Trans>To reduce fees, select a different asset to pay with.</Trans>
                                <br />
                                <br />
                              </>
                            )}
                            <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            {minutesToNextEpoch && renderEpochEndingCheckbox(minutesToNextEpoch)}
            <div className="GlpSwap-cta Exchange-swap-button-container">
              <Button type="submit" variant="primary-action" className="w-full" disabled={!isPrimaryEnabled()}>
                {getPrimaryText()}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <PageTitle
        title={t`Save on Fees`}
        subtitle={
          <div>
            {isBuying && (
              <div className="Page-description">
                <Trans>
                  Fees may vary depending on which asset you use to buy GLP. <br />
                  Enter the amount of GLP you want to purchase in the order form, then check here to compare fees.
                </Trans>
              </div>
            )}
            {!isBuying && (
              <div className="Page-description">
                <Trans>
                  Fees may vary depending on which asset you sell GLP for. <br />
                  Enter the amount of GLP you want to redeem in the order form, then check here to compare fees.
                </Trans>
              </div>
            )}
          </div>
        }
      />
      <div className="GlpSwap-token-list">
        {/* <div className="GlpSwap-token-list-content"> */}
        <table className="token-table">
          <thead>
            <tr>
              <th>
                <Trans>TOKEN</Trans>
              </th>
              <th>
                <Trans>PRICE</Trans>
              </th>
              <th>
                {isBuying ? (
                  <Tooltip
                    handle={t`AVAILABLE`}
                    tooltipIconPosition="right"
                    position="right-bottom text-none"
                    renderContent={() => (
                      <p className="text-white">
                        <Trans>Available amount to deposit into GLP.</Trans>
                      </p>
                    )}
                  />
                ) : (
                  <Tooltip
                    handle={t`AVAILABLE`}
                    tooltipIconPosition="right"
                    position="center-bottom text-none"
                    renderContent={() => {
                      return (
                        <p className="text-white">
                          <Trans>
                            Available amount to withdraw from GLP. Funds not utilized by current open positions.
                          </Trans>
                        </p>
                      );
                    }}
                  />
                )}
              </th>
              <th>
                <Trans>WALLET</Trans>
              </th>
              <th>
                <Tooltip
                  handle={t`FEES`}
                  tooltipIconPosition="right"
                  position="right-bottom text-none"
                  renderContent={() => {
                    return (
                      <div className="text-white">
                        <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                      </div>
                    );
                  }}
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleTokens.map((token) => {
              let tokenFeeBps;
              if (isBuying) {
                const { feeBasisPoints: feeBps } = getBuyGlpFromAmount(
                  glpAmount,
                  token.address,
                  infoTokens,
                  glpPrice,
                  usdgSupply,
                  totalTokenWeights
                );
                tokenFeeBps = feeBps;
              } else {
                const { feeBasisPoints: feeBps } = getSellGlpToAmount(
                  glpAmount,
                  token.address,
                  infoTokens,
                  glpPrice,
                  usdgSupply,
                  totalTokenWeights
                );
                tokenFeeBps = feeBps;
              }
              const tokenInfo = getTokenInfo(infoTokens, token.address);
              let managedUsd;
              if (tokenInfo && tokenInfo.managedUsd) {
                managedUsd = tokenInfo.managedUsd;
              }
              let availableAmountUsd;
              if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
                availableAmountUsd = tokenInfo.availableAmount
                  .mul(tokenInfo.minPrice)
                  .div(expandDecimals(1, token.decimals));
              }
              let balanceUsd;
              if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
                balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals));
              }
              let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdgAmount);

              let amountLeftToDeposit = bigNumberify(0);
              if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                amountLeftToDeposit = tokenInfo.maxUsdgAmount
                  .sub(tokenInfo.usdgAmount)
                  .mul(expandDecimals(1, USD_DECIMALS))
                  .div(expandDecimals(1, USDG_DECIMALS));
              }
              if (amountLeftToDeposit.lt(0)) {
                amountLeftToDeposit = bigNumberify(0);
              }
              function renderFees() {
                const swapUrl = `https://app.1inch.io/#/${chainId}/swap/`;
                switch (true) {
                  case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                    return (
                      <Tooltip
                        handle="NA"
                        position="right-bottom"
                        renderContent={() => (
                          <div className="text-white">
                            <Trans>
                              Max pool capacity reached for {tokenInfo.symbol}
                              <br />
                              <br />
                              Please mint GLP using another token
                            </Trans>
                            <br />
                            <p>
                              <ExternalLink href={swapUrl}>
                                <Trans> Swap {tokenInfo.symbol} on 1inch</Trans>
                              </ExternalLink>
                            </p>
                          </div>
                        )}
                      />
                    );
                  case (isBuying && !isCapReached) || (!isBuying && managedUsd?.gt(0)):
                    return `${formatAmount(tokenFeeBps, 2, 2, true, "-")}${
                      tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0 ? "%" : ""
                    }`;
                  default:
                    return "";
                }
              }

              return (
                <tr key={token.symbol}>
                  <td>
                    <div className="App-card-title-info">
                      <div className="App-card-title-info-icon">
                        <TokenIcon symbol={token.symbol} displaySize={40} importSize={40} />
                      </div>
                      <div className="App-card-title-info-text">
                        <div className="App-card-info-title">{token.name}</div>
                        <div className="App-card-info-subtitle">{token.symbol}</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol={token.symbol} />
                      </div>
                    </div>
                  </td>
                  <td>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</td>
                  <td>
                    {isBuying && (
                      <div>
                        <Tooltip
                          handle={
                            amountLeftToDeposit && amountLeftToDeposit.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`
                          }
                          className="nowrap"
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    )}
                    {!isBuying && (
                      <div>
                        <Tooltip
                          handle={
                            availableAmountUsd && availableAmountUsd.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)}`
                          }
                          className="nowrap"
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                    {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                  </td>
                  <td>{renderFees()}</td>
                  <td>
                    <Button
                      variant="secondary"
                      className={cx("w-full", isBuying ? "buying" : "selling")}
                      onClick={() => selectToken(token)}
                    >
                      {isBuying ? t`Buy with ${token.symbol}` : t`Sell for ${token.symbol}`}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="token-grid">
          {visibleTokens.map((token) => {
            let tokenFeeBps;
            if (isBuying) {
              const { feeBasisPoints: feeBps } = getBuyGlpFromAmount(
                glpAmount,
                token.address,
                infoTokens,
                glpPrice,
                usdgSupply,
                totalTokenWeights
              );
              tokenFeeBps = feeBps;
            } else {
              const { feeBasisPoints: feeBps } = getSellGlpToAmount(
                glpAmount,
                token.address,
                infoTokens,
                glpPrice,
                usdgSupply,
                totalTokenWeights
              );
              tokenFeeBps = feeBps;
            }
            const tokenInfo = getTokenInfo(infoTokens, token.address);
            let managedUsd;
            if (tokenInfo && tokenInfo.managedUsd) {
              managedUsd = tokenInfo.managedUsd;
            }
            let availableAmountUsd;
            if (tokenInfo && tokenInfo.minPrice && tokenInfo.availableAmount) {
              availableAmountUsd = tokenInfo.availableAmount
                .mul(tokenInfo.minPrice)
                .div(expandDecimals(1, token.decimals));
            }
            let balanceUsd;
            if (tokenInfo && tokenInfo.minPrice && tokenInfo.balance) {
              balanceUsd = tokenInfo.balance.mul(tokenInfo.minPrice).div(expandDecimals(1, token.decimals));
            }

            let amountLeftToDeposit = bigNumberify(0);
            if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
              amountLeftToDeposit = tokenInfo.maxUsdgAmount
                .sub(tokenInfo.usdgAmount)
                .mul(expandDecimals(1, USD_DECIMALS))
                .div(expandDecimals(1, USDG_DECIMALS));
            }
            if (amountLeftToDeposit.lt(0)) {
              amountLeftToDeposit = bigNumberify(0);
            }
            let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdgAmount);

            function renderFees() {
              switch (true) {
                case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                  return (
                    <Tooltip
                      handle="NA"
                      position="right-bottom"
                      renderContent={() => (
                        <Trans>
                          Max pool capacity reached for {tokenInfo.symbol}. Please mint GLP using another token
                        </Trans>
                      )}
                    />
                  );
                case (isBuying && !isCapReached) || (!isBuying && managedUsd?.gt(0)):
                  return `${formatAmount(tokenFeeBps, 2, 2, true, "-")}${
                    tokenFeeBps !== undefined && tokenFeeBps.toString().length > 0 ? "%" : ""
                  }`;
                default:
                  return "";
              }
            }

            return (
              <div className="App-card" key={token.symbol}>
                <div className="mobile-token-card">
                  <TokenIcon symbol={token.symbol} displaySize={24} importSize={24} />
                  <div className="token-symbol-text">{token.symbol}</div>
                  <div>
                    <AssetDropdown assetSymbol={token.symbol} />
                  </div>
                </div>
                <div className="App-card-divider" />
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Price</Trans>
                    </div>
                    <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                  </div>
                  {isBuying && (
                    <div className="App-card-row">
                      <Tooltip
                        handle={t`Available`}
                        position="left-bottom"
                        className="label"
                        renderContent={() => (
                          <p className="text-white">
                            <Trans>Available amount to deposit into GLP.</Trans>
                          </p>
                        )}
                      />
                      <div>
                        <Tooltip
                          handle={amountLeftToDeposit && `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    </div>
                  )}
                  {!isBuying && (
                    <div className="App-card-row">
                      <div className="label">
                        <Tooltip
                          handle={t`Available`}
                          position="left-bottom"
                          renderContent={() => {
                            return (
                              <p className="text-white">
                                <Trans>
                                  Available amount to withdraw from GLP. Funds not utilized by current open positions.
                                </Trans>
                              </p>
                            );
                          }}
                        />
                      </div>

                      <div>
                        <Tooltip
                          handle={
                            availableAmountUsd && availableAmountUsd.lt(0)
                              ? "$0.00"
                              : `$${formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)}`
                          }
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => getTooltipContent(managedUsd, tokenInfo, token)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Wallet</Trans>
                    </div>
                    <div>
                      {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                      {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div>
                      {tokenFeeBps ? (
                        t`Fees`
                      ) : (
                        <Tooltip
                          handle={t`Fees`}
                          className="label"
                          renderContent={() => (
                            <p className="text-white">
                              <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                            </p>
                          )}
                        />
                      )}
                    </div>
                    <div>{renderFees()}</div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    {isBuying && (
                      <Button variant="secondary" onClick={() => selectToken(token)}>
                        <Trans>Buy with {token.symbol}</Trans>
                      </Button>
                    )}
                    {!isBuying && (
                      <Button variant="secondary" onClick={() => selectToken(token)}>
                        <Trans>Sell for {token.symbol}</Trans>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
