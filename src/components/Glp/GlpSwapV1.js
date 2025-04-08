import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";
import { Trans, t } from "@lingui/macro";
import useSWR from "swr";
import { ethers } from "ethers";
import Tab from "../Tab/Tab";
import cx from "classnames";
import { getContract } from "config/contracts";
import {
  getBuyGlpToAmount,
  getBuyGlpFromAmount,
  getSellGlpFromAmount,
  getSellGlpToAmount,
  adjustForDecimals,
  GLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  GLP_COOLDOWN_DURATION,
  SECONDS_PER_YEAR,
  USDG_DECIMALS,
  PLACEHOLDER_ACCOUNT,
  importImage,
} from "lib/legacy";

import { useGmxPrice } from "domain/legacy";

import TokenSelector from "../Exchange/TokenSelector";
import BuyInputSection from "../BuyInputSection/BuyInputSection";
import Tooltip from "../Tooltip/Tooltip";

import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import VaultV2 from "abis/VaultV2.json";
import GlpManager from "abis/GlpManager.json";
import RewardTracker from "abis/RewardTracker.json";
import Vester from "abis/Vester.json";
import RewardRouter from "abis/RewardRouter.json";
import Token from "abis/Token.json";

import arrowIcon from "img/ic_convert_down_new.svg";

import "./GlpSwap.css";
import AssetDropdown from "pages/Dashboard/AssetDropdown";
import SwapErrorModal from "./SwapErrorModal";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { ARBITRUM, getChainName, IS_NETWORK_DISABLED } from "config/chains";
import { callContract, dynamicContractFetcher } from "lib/contracts";
import { approveTokens, useInfoTokens } from "domain/tokens";
import { useLocalStorageByChainId } from "lib/localStorage";
import { helperToast } from "lib/helperToast";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, formatKeyAmount, parseValue } from "lib/numbers";
import { getNativeToken, getToken, getTokens, getWhitelistedTokens, getWrappedToken } from "config/tokens";
import { useDynamicChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getIcon } from "config/icons";
import Button from "components/Button/Button";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

const { AddressZero } = ethers.constants;

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
  const {
    savedSlippageAmount,
    setPendingTxns,
    connectWallet,
    setIsBuying,
    savedShouldDisableValidationForTesting,
  } = props;
  const isBuying = false;
  const history = useHistory();
  const swapLabel = isBuying ? "BuyTlp" : "SellTlp";
  const tabLabel = isBuying ? t`Buy TLP` : t`Sell TLP`;
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;
  const account = dynamicContext.account;
  const signer = dynamicContext.signer;
  const { chainId } = useDynamicChainId();
  const tokens = getTokens(chainId);
  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);
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

  const readerAddress = getContract(chainId, "Reader");
  const readerAddressV1 = '0xA527DD86b7b67CE93a8607dcAf94921e882eB746';
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const rewardReaderAddressV1 = '0xA7449D41913442d918226F48E944d913123CCF28';
  const vaultAddress = getContract(chainId, "Vault");
  const vaultAddressV1 = '0x860608Ab3CE0Ef7b668067553E22d8022f22E045';
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const nativeTokenAddressV1 = '0x5300000000000000000000000000000000000011';
  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const stakedGlpTrackerAddressV1 = '0x92f4917f0dc1C064c8883997b1ea55c7D2B9adfd';
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const feeGlpTrackerAddressV1 = '0xD7577D8EAe040a8E8fbc39D810907AD240311521';
  const usdgAddress = getContract(chainId, "USDG");
  const usdgAddressV1 = '0x969C91378e0D2C27FE3cE39d49231F17aB635854';
  const glpManagerAddress = getContract(chainId, "GlpManager");
  const glpManagerAddressV1 = '0x011C7B2Ab03292Fc82D3f90a92E3743f39d06ABc';
  const glpRewardRouterAddress = getContract(chainId, "GlpRewardRouter");

  const tokensForBalanceAndSupplyQuery = [stakedGlpTrackerAddressV1, usdgAddressV1];
  const glpIcon = getIcon(chainId, "glp");

  // const isFeesHigh = feeBasisPoints > FEES_HIGH_BPS;

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(
    [`GlpSwap:getTokenBalances:${active}`, chainId, readerAddressV1, "getTokenBalances", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: dynamicContractFetcher(signer, ReaderV2, [tokenAddresses]),
    }
  );

  const { data: balancesAndSupplies } = useSWR(
    [
      `GlpSwap:getTokenBalancesWithSupplies:${active}`,
      chainId,
      readerAddressV1,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: dynamicContractFetcher(signer, ReaderV2, [tokensForBalanceAndSupplyQuery]),
    }
  );

  const { data: aums } = useSWR([`GlpSwap:getAums:${active}`, chainId, glpManagerAddressV1, "getAums"], {
    fetcher: dynamicContractFetcher(signer, GlpManager),
  });

  const { data: totalTokenWeights } = useSWR(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddressV1, "totalTokenWeights"],
    {
      fetcher: dynamicContractFetcher(signer, VaultV2),
    }
  );

  const tokenAllowanceAddress = swapTokenAddress === AddressZero ? nativeTokenAddressV1 : swapTokenAddress;
  const { data: tokenAllowance } = useSWR(
    [active, chainId, tokenAllowanceAddress, "allowance", account || PLACEHOLDER_ACCOUNT, glpManagerAddressV1],
    {
      fetcher: dynamicContractFetcher(signer, Token),
    }
  );

  const { data: lastPurchaseTime } = useSWR(
    [`GlpSwap:lastPurchaseTime:${active}`, chainId, glpManagerAddressV1, "lastAddedAt", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: dynamicContractFetcher(signer, GlpManager),
    }
  );

  const { data: glpBalance } = useSWR(
    [`GlpSwap:glpBalance:${active}`, chainId, feeGlpTrackerAddressV1, "stakedAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: dynamicContractFetcher(signer, RewardTracker),
    }
  );

  const glpVesterAddress = getContract(chainId, "GlpVester");
  const { data: reservedAmount } = useSWR(
    [`GlpSwap:reservedAmount:${active}`, chainId, glpVesterAddress, "pairAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: dynamicContractFetcher(signer, Vester),
    }
  );

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const rewardTrackersForStakingInfo = [stakedGlpTrackerAddressV1, feeGlpTrackerAddressV1];
  const { data: stakingInfo } = useSWR(
    [`GlpSwap:stakingInfo:${active}`, chainId, rewardReaderAddressV1, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: dynamicContractFetcher(signer, RewardReader, [rewardTrackersForStakingInfo]),
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
    history.push(`${history.location.pathname}#${hash}`);
    props.setIsBuying(hash === "redeem" ? false : true);
  };

  const fillMaxAmount = () => {
    if (isBuying) {
      setAnchorOnSwapAmount(true);
      setSwapValue(formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals));
      return;
    }

    setAnchorOnSwapAmount(false);
    setGlpValue(formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS));
  };

  const getError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      if (isBuying) return [t`GLP buy disabled, pending ${getChainName(chainId)} upgrade`];
      return [t`GLP sell disabled, pending ${getChainName(chainId)} upgrade`];
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
        return [t`Insufficient TLP balance`];
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
      return t`Approving ${swapToken.symbol}...`;
    }
    if (needApproval) {
      return t`Approve ${swapToken.symbol}`;
    }

    if (isSubmitting) {
      return isBuying ? t`Buying...` : t`Selling...`;
    }

    return isBuying ? t`Buy TLP` : t`Sell TLP`;
  };

  const approveFromToken = () => {
    approveTokens({
      setIsApproving,
      library: signer,
      tokenAddress: swapToken.address,
      spender: glpManagerAddressV1, // TODO
      chainId: chainId,
      onApproveSubmitted: () => {
        setIsWaitingForApproval(true);
      },
      infoTokens,
      getTokenInfo,
    });
  };


  const sellGlp = () => {
    setIsSubmitting(true);

    const minOut = swapAmount.mul(BASIS_POINTS_DIVISOR - savedSlippageAmount).div(BASIS_POINTS_DIVISOR);
    const newMin = minOut.div(10);

    const glpRewardRouterAddressV1 = '0x7325eE195B52A7eF5A1F50E14C987d323E9bd4FB';

    const contract = new ethers.Contract(glpRewardRouterAddressV1, RewardRouter.abi, signer);
    const method = swapTokenAddress === AddressZero ? "unstakeAndRedeemGlpETH" : "unstakeAndRedeemGlp";
    const params =
      swapTokenAddress === AddressZero ? [glpAmount, newMin, account] : [swapTokenAddress, glpAmount, newMin, account];

    callContract(chainId, contract, method, params, {
      sentMsg: t`Sell submitted!`,
      failMsg: t`Sell failed.`,
      successMsg: t`${formatAmount(glpAmount, 18, 4, true)} TLP sold for ${formatAmount(
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
      connectWallet();
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

    sellGlp(); // TODO
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
    if (opt === t`Sell TLP`) {
      switchSwapOption("redeem");
    } else {
      switchSwapOption();
    }
  };

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
                <img width="40" src={glpIcon} alt="TLP" />
              </div>
              <div className="App-card-title-mark-info">
                <div className="App-card-title-mark-title">TLP</div>
                <div className="App-card-title-mark-subtitle">TLP</div>
              </div>
              <div>
                <AssetDropdown assetSymbol="TLP" />
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
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} TLP ($
                {formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div className="value">
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} TLP ($
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
                    handle={`${formatAmount(reservedAmount, 18, 4, true)} TLP ($${formatAmount(
                      reserveAmountUsd,
                      USD_DECIMALS,
                      2,
                      true
                    )})`}
                    position="right-bottom"
                    renderContent={() =>
                      t`${formatAmount(reservedAmount, 18, 4, true)} TLP have been reserved for vesting.`
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
                          label={t`Escrowed TMX APR`}
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
                  {formatAmount(glpSupply, GLP_DECIMALS, 4, true)} TLP ($
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
              options={[t`Sell TLP`]}
              option={tabLabel}
              onChange={onSwapOptionChange}
              className="Exchange-swap-option-tabs"
            />
            {isBuying && (
              <BuyInputSection
                topLeftLabel={payLabel}
                topRightLabel={t`Balance:`}
                tokenBalance={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
                inputValue={swapValue}
                onInputValueChange={onSwapValueChange}
                showMaxButton={swapValue !== formatAmountFree(swapTokenBalance, swapToken.decimals, swapToken.decimals)}
                onClickTopRightLabel={fillMaxAmount}
                onClickMax={fillMaxAmount}
                selectedToken={swapToken}
                balance={payBalance}
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
                topRightLabel={t`Available:`}
                tokenBalance={`${formatAmount(maxSellAmount, GLP_DECIMALS, 4, true)}`}
                inputValue={glpValue}
                onInputValueChange={onGlpValueChange}
                showMaxButton={glpValue !== formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS)}
                onClickTopRightLabel={fillMaxAmount}
                onClickMax={fillMaxAmount}
                balance={payBalance}
                defaultTokenName={"GLP"}
              >
                <div className="selected-token">TLP</div>
              </BuyInputSection>
            )}

            <div className="AppOrder-ball-container">
              <div className="AppOrder-ball">
                <img
                  src={arrowIcon}
                  alt="arrowIcon"
                  onClick={() => {
                    setIsBuying(!isBuying);
                    switchSwapOption(isBuying ? "redeem" : "");
                  }}
                />
              </div>
            </div>

            <BuyInputSection
              topLeftLabel={receiveLabel}
              topRightLabel={t`Balance:`}
              tokenBalance={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
              inputValue={swapValue}
              onInputValueChange={onSwapValueChange}
              balance={receiveBalance}
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

            <div>
              <div className="Exchange-info-row">
                <div className="align-right fee-block">
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
                          {/* {isFeesHigh && <Trans>To reduce fees, select a different asset to receive.</Trans>} */}
                          <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                        </div>
                      );
                    }}
                  />
                </div>
                <Tooltip
                  handle={"Bought TLP Recently?"}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div className="text-white" style={{ float: "right" }}>
                        <Trans>Note: There is an 8-hour waiting period to sell recently supplied TLP.</Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="GlpSwap-cta Exchange-swap-button-container">
              <Button type="submit" variant="primary-action" className="w-100" disabled={!isPrimaryEnabled()}>
                {getPrimaryText()}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <div className="Tab-title-section">
        <div className="Page-title">
          <Trans>Save on Fees</Trans>
        </div>
        {isBuying && (
          <div className="Page-description">
            <Trans>
              Fees may vary depending on which asset you use to buy TLP. <br />
              Enter the amount of TLP you want to purchase in the order form, then check here to compare fees.
            </Trans>
          </div>
        )}
        {!isBuying && (
          <div className="Page-description">
            <Trans>
              Fees may vary depending on which asset you sell TLP for. <br />
              Enter the amount of TLP you want to redeem in the order form, then check here to compare fees.
            </Trans>
          </div>
        )}
      </div>
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
                        <Trans>Available amount to deposit into TLP.</Trans>
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
                            Available amount to withdraw from TLP. Funds not utilized by current open positions.
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
              const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_40.svg");
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
                        <img src={tokenImage} alt={token.symbol} width="40" />
                      </div>
                      <div className="App-card-title-info-text">
                        <div className="App-card-info-title">{token.name}</div>
                        <div className="App-card-info-subtitle">{token.symbol}</div>
                      </div>
                      <div>
                        <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
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
                      variant="semi-clear"
                      className={cx("w-100", isBuying ? "buying" : "selling")}
                      onClick={() => selectToken(token)}
                    >
                      {t`Sell for ${token.symbol}`}
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
                          Max pool capacity reached for {tokenInfo.symbol}. Please mint TLP using another token
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
            const tokenImage = importImage("ic_" + token.symbol.toLowerCase() + "_24.svg");
            return (
              <div className="App-card" key={token.symbol}>
                <div className="mobile-token-card">
                  <img src={tokenImage} alt={token.symbol} width="20px" />
                  <div className="token-symbol-text">{token.symbol}</div>
                  <div>
                    <AssetDropdown assetSymbol={token.symbol} assetInfo={token} />
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
                            <Trans>Available amount to deposit into TLP.</Trans>
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
                                  Available amount to withdraw from TLP. Funds not utilized by current open positions.
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
                    <Button variant="semi-clear" onClick={() => selectToken(token)}>
                      <Trans>Sell for {token.symbol}</Trans>
                    </Button>
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
