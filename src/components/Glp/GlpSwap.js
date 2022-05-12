import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";

import Tab from "../Tab/Tab";
import cx from "classnames";

import { getToken, getTokens, getWhitelistedTokens, getWrappedToken, getNativeToken } from "../../data/Tokens";
import { getContract } from "../../Addresses";
import {
  helperToast,
  useLocalStorageByChainId,
  getTokenInfo,
  // getChainName,
  useChainId,
  expandDecimals,
  fetcher,
  bigNumberify,
  formatAmount,
  formatAmountFree,
  formatKeyAmount,
  // formatDateTime,
  getBuyGlpToAmount,
  getBuyGlpFromAmount,
  getSellGlpFromAmount,
  getSellGlpToAmount,
  parseValue,
  approveTokens,
  getUsd,
  adjustForDecimals,
  GLP_DECIMALS,
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  GLP_COOLDOWN_DURATION,
  SECONDS_PER_YEAR,
  USDG_DECIMALS,
  ARBITRUM,
  PLACEHOLDER_ACCOUNT,
} from "../../Helpers";

import { callContract, useGmxPrice, useInfoTokens } from "../../Api";

import TokenSelector from "../Exchange/TokenSelector";
import BuyInputSection from "../BuyInputSection/BuyInputSection";
import Tooltip from "../Tooltip/Tooltip";

import ReaderV2 from "../../abis/ReaderV2.json";
import RewardReader from "../../abis/RewardReader.json";
import VaultV2 from "../../abis/VaultV2.json";
import GlpManager from "../../abis/GlpManager.json";
import RewardTracker from "../../abis/RewardTracker.json";
import Vester from "../../abis/Vester.json";
import RewardRouter from "../../abis/RewardRouter.json";
import Token from "../../abis/Token.json";

import glp24Icon from "../../img/ic_glp_24.svg";
import glp40Icon from "../../img/ic_glp_40.svg";
import arrowIcon from "../../img/ic_convert_down.svg";

import avalanche16Icon from "../../img/ic_avalanche_16.svg";
import arbitrum16Icon from "../../img/ic_arbitrum_16.svg";

import "./GlpSwap.css";
import AssetDropdown from "../../views/Dashboard/AssetDropdown";

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

export default function GlpSwap(props) {
  const { savedSlippageAmount, isBuying, setPendingTxns, connectWallet, setIsBuying } = props;
  const history = useHistory();
  const swapLabel = isBuying ? "BuyGlp" : "SellGlp";
  const tabLabel = isBuying ? "Buy GLP" : "Sell GLP";
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();
  // const chainName = getChainName(chainId)
  const tokens = getTokens(chainId);
  const whitelistedTokens = getWhitelistedTokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
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

  const readerAddress = getContract(chainId, "Reader");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const usdgAddress = getContract(chainId, "USDG");
  const glpManagerAddress = getContract(chainId, "GlpManager");
  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const tokensForBalanceAndSupplyQuery = [stakedGlpTrackerAddress, usdgAddress];

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(
    [`GlpSwap:getTokenBalances:${active}`, chainId, readerAddress, "getTokenBalances", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, ReaderV2, [tokenAddresses]),
    }
  );

  const { data: balancesAndSupplies } = useSWR(
    [
      `GlpSwap:getTokenBalancesWithSupplies:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: fetcher(library, ReaderV2, [tokensForBalanceAndSupplyQuery]),
    }
  );

  const { data: aums } = useSWR([`GlpSwap:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: fetcher(library, GlpManager),
  });

  const { data: totalTokenWeights } = useSWR(
    [`GlpSwap:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: fetcher(library, VaultV2),
    }
  );

  const tokenAllowanceAddress = swapTokenAddress === AddressZero ? nativeTokenAddress : swapTokenAddress;
  const { data: tokenAllowance } = useSWR(
    [active, chainId, tokenAllowanceAddress, "allowance", account || PLACEHOLDER_ACCOUNT, glpManagerAddress],
    {
      fetcher: fetcher(library, Token),
    }
  );

  const { data: lastPurchaseTime } = useSWR(
    [`GlpSwap:lastPurchaseTime:${active}`, chainId, glpManagerAddress, "lastAddedAt", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, GlpManager),
    }
  );

  const { data: glpBalance } = useSWR(
    [`GlpSwap:glpBalance:${active}`, chainId, feeGlpTrackerAddress, "stakedAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const glpVesterAddress = getContract(chainId, "GlpVester");
  const { data: reservedAmount } = useSWR(
    [`GlpSwap:reservedAmount:${active}`, chainId, glpVesterAddress, "pairAmounts", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? library : undefined }, active);

  const rewardTrackersForStakingInfo = [stakedGlpTrackerAddress, feeGlpTrackerAddress];
  const { data: stakingInfo } = useSWR(
    [`GlpSwap:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: fetcher(library, RewardReader, [rewardTrackersForStakingInfo]),
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

  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, undefined);
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    if (!isBuying && inCooldownWindow) {
      return [`Redemption time not yet reached`];
    }

    if (!swapAmount || swapAmount.eq(0)) {
      return ["Enter an amount"];
    }
    if (!glpAmount || glpAmount.eq(0)) {
      return ["Enter an amount"];
    }

    if (isBuying) {
      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (swapTokenInfo && swapTokenInfo.balance && swapAmount && swapAmount.gt(swapTokenInfo.balance)) {
        return [`Insufficient ${swapTokenInfo.symbol} balance`];
      }

      if (swapTokenInfo.maxUsdgAmount && swapTokenInfo.usdgAmount && swapUsdMin) {
        const usdgFromAmount = adjustForDecimals(swapUsdMin, USD_DECIMALS, USDG_DECIMALS);
        const nextUsdgAmount = swapTokenInfo.usdgAmount.add(usdgFromAmount);
        if (swapTokenInfo.maxUsdgAmount.gt(0) && nextUsdgAmount.gt(swapTokenInfo.maxUsdgAmount)) {
          return [`${swapTokenInfo.symbol} pool exceeded, try different token`, true];
        }
      }
    }

    if (!isBuying) {
      if (maxSellAmount && glpAmount && glpAmount.gt(maxSellAmount)) {
        return [`Insufficient GLP balance`];
      }

      const swapTokenInfo = getTokenInfo(infoTokens, swapTokenAddress);
      if (
        swapTokenInfo &&
        swapTokenInfo.availableAmount &&
        swapAmount &&
        swapAmount.gt(swapTokenInfo.availableAmount)
      ) {
        return [`Insufficient liquidity`];
      }
    }

    return [false];
  };

  const isPrimaryEnabled = () => {
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
    if (isSwapTokenCapReached) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    if (!active) {
      return "Connect Wallet";
    }
    const [error, modal] = getError();
    if (error && !modal) {
      return error;
    }
    if (isBuying && isSwapTokenCapReached) {
      return `Max Capacity for ${swapToken.symbol} Reached`;
    }

    if (needApproval && isWaitingForApproval) {
      return "Waiting for Approval";
    }
    if (isApproving) {
      return `Approving ${swapToken.symbol}...`;
    }
    if (needApproval) {
      return `Approve ${swapToken.symbol}`;
    }

    if (isSubmitting) {
      return isBuying ? `Buying...` : `Selling...`;
    }

    return isBuying ? "Buy GLP" : "Sell GLP";
  };

  const approveFromToken = () => {
    approveTokens({
      setIsApproving,
      library,
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

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    const method = swapTokenAddress === AddressZero ? "mintAndStakeGlpETH" : "mintAndStakeGlp";
    const params = swapTokenAddress === AddressZero ? [0, minGlp] : [swapTokenAddress, swapAmount, 0, minGlp];
    const value = swapTokenAddress === AddressZero ? swapAmount : 0;

    callContract(chainId, contract, method, params, {
      value,
      sentMsg: "Buy submitted.",
      failMsg: "Buy failed.",
      successMsg: `${formatAmount(glpAmount, 18, 4, true)} GLP bought with ${formatAmount(
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

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());
    const method = swapTokenAddress === AddressZero ? "unstakeAndRedeemGlpETH" : "unstakeAndRedeemGlp";
    const params =
      swapTokenAddress === AddressZero ? [glpAmount, minOut, account] : [swapTokenAddress, glpAmount, minOut, account];

    callContract(chainId, contract, method, params, {
      sentMsg: "Sell submitted!",
      failMsg: "Sell failed.",
      successMsg: `${formatAmount(glpAmount, 18, 4, true)} GLP sold for ${formatAmount(
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
      return;
    }

    if (isBuying) {
      buyGlp();
    } else {
      sellGlp();
    }
  };

  let payLabel = "Pay";
  let receiveLabel = "Receive";
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
    helperToast.success(`${token.symbol} selected in order form`);
  };

  let feePercentageText = formatAmount(feeBasisPoints, 2, 2, true, "-");
  if (feeBasisPoints !== undefined && feeBasisPoints.toString().length > 0) {
    feePercentageText += "%";
  }

  let maxSellAmount = glpBalance;
  if (glpBalance && reservedAmount) {
    maxSellAmount = glpBalance.sub(reservedAmount);
  }

  const wrappedTokenSymbol = getWrappedToken(chainId).symbol;
  const nativeTokenSymbol = getNativeToken(chainId).symbol;

  const onSwapOptionChange = (opt) => {
    if (opt === "Sell GLP") {
      switchSwapOption("redeem");
    } else {
      switchSwapOption();
    }
  };

  return (
    <div className="GlpSwap">
      {/* <div className="Page-title-section">
        <div className="Page-title">{isBuying ? "Buy GLP" : "Sell GLP"}</div>
        {isBuying && <div className="Page-description">
          Purchase <a href="https://gmxio.gitbook.io/gmx/glp" target="_blank" rel="noopener noreferrer">GLP tokens</a> to earn {nativeTokenSymbol} fees from swaps and leverage trading.<br/>
          Note that there is a minimum holding time of 15 minutes after a purchase.<br/>
          <div>View <Link to="/earn">staking</Link> page.</div>
        </div>}
        {!isBuying && <div className="Page-description">
          Redeem your GLP tokens for any supported asset.
          {inCooldownWindow && <div>
            GLP tokens can only be redeemed 15 minutes after your most recent purchase.<br/>
            Your last purchase was at {formatDateTime(lastPurchaseTime)}, you can redeem GLP tokens after {formatDateTime(redemptionTime)}.<br/>
          </div>}
          <div>View <Link to="/earn">staking</Link> page.</div>
        </div>}
      </div> */}
      <div className="GlpSwap-content">
        <div className="App-card GlpSwap-stats-card">
          <div className="App-card-title">
            <div className="App-card-title-mark">
              <div className="App-card-title-mark-icon">
                <img src={glp40Icon} alt="glp40Icon" />
                {chainId === ARBITRUM ? (
                  <img src={arbitrum16Icon} alt="arbitrum16Icon" className="selected-network-symbol" />
                ) : (
                  <img src={avalanche16Icon} alt="avalanche16Icon" className="selected-network-symbol" />
                )}
              </div>
              <div className="App-card-title-mark-info">
                <div className="App-card-title-mark-title">GLP</div>
                <div className="App-card-title-mark-subtitle">GLP</div>
              </div>
            </div>
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            <div className="App-card-row">
              <div className="label">Price</div>
              <div className="value">${formatAmount(glpPrice, USD_DECIMALS, 3, true)}</div>
            </div>
            <div className="App-card-row">
              <div className="label">Wallet</div>
              <div className="value">
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} GLP ($
                {formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">Staked</div>
              <div className="value">
                {formatAmount(glpBalance, GLP_DECIMALS, 4, true)} GLP ($
                {formatAmount(glpBalanceUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
          <div className="App-card-divider"></div>
          <div className="App-card-content">
            {!isBuying && (
              <div className="App-card-row">
                <div className="label">Reserved</div>
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
                      `${formatAmount(reservedAmount, 18, 4, true)} GLP have been reserved for vesting.`
                    }
                  />
                </div>
              </div>
            )}
            <div className="App-card-row">
              <div className="label">APR</div>
              <div className="value">
                <Tooltip
                  handle={`${formatAmount(totalApr, 2, 2, true)}%`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <>
                        <div className="Tooltip-row">
                          <span className="label">
                            {nativeTokenSymbol} ({wrappedTokenSymbol}) APR
                          </span>
                          <span>{formatAmount(feeGlpTrackerApr, 2, 2, false)}%</span>
                        </div>
                        <div className="Tooltip-row">
                          <span className="label">Escrowed GMX APR</span>
                          <span>{formatAmount(stakedGlpTrackerApr, 2, 2, false)}%</span>
                        </div>
                      </>
                    );
                  }}
                />
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">Total Supply</div>
              <div className="value">
                {formatAmount(glpSupply, GLP_DECIMALS, 4, true)} GLP ($
                {formatAmount(glpSupplyUsd, USD_DECIMALS, 2, true)})
              </div>
            </div>
          </div>
        </div>
        <div className="GlpSwap-box App-box">
          <Tab
            options={["Buy GLP", "Sell GLP"]}
            option={tabLabel}
            onChange={onSwapOptionChange}
            className="Exchange-swap-option-tabs"
          />
          {isBuying && (
            <BuyInputSection
              topLeftLabel={payLabel}
              topRightLabel={`Balance: `}
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
                label="Pay"
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
              topRightLabel={`Available: `}
              tokenBalance={`${formatAmount(maxSellAmount, GLP_DECIMALS, 4, true)}`}
              inputValue={glpValue}
              onInputValueChange={onGlpValueChange}
              showMaxButton={glpValue !== formatAmountFree(maxSellAmount, GLP_DECIMALS, GLP_DECIMALS)}
              onClickTopRightLabel={fillMaxAmount}
              onClickMax={fillMaxAmount}
              balance={payBalance}
              defaultTokenName={"GLP"}
            >
              <div className="selected-token">
                GLP <img src={glp24Icon} alt="glp24Icon" />
              </div>
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

          {isBuying && (
            <BuyInputSection
              topLeftLabel={receiveLabel}
              topRightLabel={`Balance: `}
              tokenBalance={`${formatAmount(glpBalance, GLP_DECIMALS, 4, true)}`}
              inputValue={glpValue}
              onInputValueChange={onGlpValueChange}
              balance={receiveBalance}
              defaultTokenName={"GLP"}
            >
              <div className="selected-token">
                GLP <img src={glp24Icon} alt="glp24Icon" />
              </div>
            </BuyInputSection>
          )}

          {!isBuying && (
            <BuyInputSection
              topLeftLabel={receiveLabel}
              topRightLabel={`Balance: `}
              tokenBalance={`${formatAmount(swapTokenBalance, swapToken.decimals, 4, true)}`}
              inputValue={swapValue}
              onInputValueChange={onSwapValueChange}
              balance={receiveBalance}
              selectedToken={swapToken}
            >
              <TokenSelector
                label="Receive"
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
              <div className="Exchange-info-label">{feeBasisPoints > 50 ? "WARNING: High Fees" : "Fees"}</div>
              <div className="align-right fee-block">
                {isBuying && (
                  <Tooltip
                    handle={isBuying && isSwapTokenCapReached ? "NA" : feePercentageText}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          {feeBasisPoints > 50 && <div>To reduce fees, select a different asset to pay with.</div>}
                          Check the "Save on Fees" section below to get the lowest fee percentages.
                        </>
                      );
                    }}
                  />
                )}
                {!isBuying && (
                  <Tooltip
                    handle={feePercentageText}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          {feeBasisPoints > 50 && <div>To reduce fees, select a different asset to receive.</div>}
                          Check the "Save on Fees" section below to get the lowest fee percentages.
                        </>
                      );
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="GlpSwap-cta Exchange-swap-button-container">
            <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <div className="Tab-title-section">
        <div className="Page-title">Save on Fees</div>
        {isBuying && (
          <div className="Page-description">
            Fees may vary depending on which asset you use to buy GLP.
            <br /> Enter the amount of GLP you want to purchase in the order form, then check here to compare fees.
          </div>
        )}
        {!isBuying && (
          <div className="Page-description">
            Fees may vary depending on which asset you sell GLP for.
            <br /> Enter the amount of GLP you want to redeem in the order form, then check here to compare fees.
          </div>
        )}
      </div>
      <div className="GlpSwap-token-list">
        {/* <div className="GlpSwap-token-list-content"> */}
        <table className="token-table">
          <thead>
            <tr>
              <th>TOKEN</th>
              <th>PRICE</th>
              <th>
                {isBuying ? (
                  <Tooltip
                    handle={"AVAILABLE"}
                    tooltipIconPosition="right"
                    position="right-bottom text-none"
                    renderContent={() => "Available amount to deposit into GLP."}
                  />
                ) : (
                  <Tooltip
                    handle={"AVAILABLE"}
                    tooltipIconPosition="right"
                    position="right-bottom text-none"
                    renderContent={() => {
                      return (
                        <>
                          <div>Available amount to withdraw from GLP.</div>
                          <div>Funds not utilized by current open positions.</div>
                        </>
                      );
                    }}
                  />
                )}
              </th>
              <th>WALLET</th>
              <th>
                <Tooltip
                  handle={"FEES"}
                  tooltipIconPosition="right"
                  position="right-bottom text-none"
                  renderContent={() => {
                    return (
                      <>
                        <div>Fees will be shown once you have entered an amount in the order form.</div>
                      </>
                    );
                  }}
                />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tokenList.map((token) => {
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

              var tokenImage = null;

              try {
                tokenImage = require("../../img/ic_" + token.symbol.toLowerCase() + "_40.svg");
              } catch (error) {
                console.error(error);
              }
              let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdgAmount);

              let amountLeftToDeposit;
              if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
                amountLeftToDeposit = adjustForDecimals(tokenInfo.maxUsdgAmount, USDG_DECIMALS, USD_DECIMALS).sub(
                  tokenInfo.managedUsd
                );
              }
              function renderFees() {
                const swapUrl =
                  chainId === ARBITRUM
                    ? `https://app.uniswap.org/#/swap?inputCurrency=${token.address}`
                    : `https://traderjoexyz.com/trade?inputCurrency=${token.address}`;
                switch (true) {
                  case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                    return (
                      <Tooltip
                        handle="NA"
                        position="right-bottom"
                        renderContent={() => (
                          <div>
                            Max pool capacity reached for {tokenInfo.symbol}
                            <br />
                            <br />
                            Please mint GLP using another token
                            <br />
                            <p>
                              <a href={swapUrl} target="_blank" rel="noreferrer">
                                Swap on {chainId === ARBITRUM ? "Uniswap" : "Trader Joe"}
                              </a>
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
                        <img src={tokenImage && tokenImage.default} alt={token.symbol} width="40px" />
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
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => {
                            return (
                              <>
                                Current Pool Amount: ${formatAmount(managedUsd, USD_DECIMALS, 2, true)} (
                                {formatKeyAmount(tokenInfo, "poolAmount", token.decimals, 2, true)} {token.symbol})
                                <br />
                                <br />
                                Max Pool Capacity: ${formatAmount(tokenInfo.maxUsdgAmount, 18, 0, true)}
                              </>
                            );
                          }}
                        />
                      </div>
                    )}
                    {!isBuying && (
                      <div>
                        {formatKeyAmount(tokenInfo, "availableAmount", token.decimals, 2, true)} {token.symbol} ($
                        {formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)})
                      </div>
                    )}
                  </td>
                  <td>
                    {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                    {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                  </td>
                  <td>{renderFees()}</td>
                  <td>
                    <button
                      className={cx("App-button-option action-btn", isBuying ? "buying" : "selling")}
                      onClick={() => selectToken(token)}
                    >
                      {isBuying ? "Buy with " + token.symbol : "Sell for " + token.symbol}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="token-grid">
          {tokenList.map((token) => {
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

            let amountLeftToDeposit;
            if (tokenInfo.maxUsdgAmount && tokenInfo.maxUsdgAmount.gt(0)) {
              amountLeftToDeposit = adjustForDecimals(tokenInfo.maxUsdgAmount, USDG_DECIMALS, USD_DECIMALS).sub(
                tokenInfo.managedUsd
              );
            }
            let isCapReached = tokenInfo.managedAmount?.gt(tokenInfo.maxUsdgAmount);

            function renderFees() {
              switch (true) {
                case (isBuying && isCapReached) || (!isBuying && managedUsd?.lt(1)):
                  return (
                    <Tooltip
                      handle="NA"
                      position="right-bottom"
                      renderContent={() =>
                        `Max pool capacity reached for ${tokenInfo.symbol}. Please mint GLP using another token`
                      }
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
                <div className="App-card-title">{token.name}</div>
                <div className="App-card-divider"></div>
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">Price</div>
                    <div>${formatKeyAmount(tokenInfo, "minPrice", USD_DECIMALS, 2, true)}</div>
                  </div>
                  {isBuying && (
                    <div className="App-card-row">
                      <Tooltip
                        className="label"
                        handle="Available"
                        position="left-bottom"
                        renderContent={() => "Available amount to deposit into GLP."}
                      />
                      <div>
                        <Tooltip
                          handle={amountLeftToDeposit && `$${formatAmount(amountLeftToDeposit, USD_DECIMALS, 2, true)}`}
                          position="right-bottom"
                          tooltipIconPosition="right"
                          renderContent={() => {
                            return (
                              <>
                                Current Pool Amount: ${formatAmount(managedUsd, USD_DECIMALS, 2, true)} (
                                {formatKeyAmount(tokenInfo, "poolAmount", token.decimals, 2, true)} {token.symbol})
                                <br />
                                <br />
                                Max Pool Capacity: ${formatAmount(tokenInfo.maxUsdgAmount, 18, 0, true)}
                              </>
                            );
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {!isBuying && (
                    <div className="App-card-row">
                      <Tooltip
                        handle="Available"
                        position="left-bottom"
                        renderContent={() => {
                          return (
                            <>
                              <div>Available amount to withdraw from GLP.</div>
                              <div>Funds not utilized by current open positions.</div>
                            </>
                          );
                        }}
                      />
                      <div>
                        {formatKeyAmount(tokenInfo, "availableAmount", token.decimals, 2, true)} {token.symbol} ($
                        {formatAmount(availableAmountUsd, USD_DECIMALS, 2, true)})
                      </div>
                    </div>
                  )}

                  <div className="App-card-row">
                    <div className="label">Wallet</div>
                    <div>
                      {formatKeyAmount(tokenInfo, "balance", tokenInfo.decimals, 2, true)} {tokenInfo.symbol} ($
                      {formatAmount(balanceUsd, USD_DECIMALS, 2, true)})
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      {tokenFeeBps ? (
                        "Fees"
                      ) : (
                        <Tooltip
                          handle={`Fees`}
                          renderContent={() => `Please enter an amount to see fee percentages`}
                        />
                      )}
                    </div>
                    <div>{renderFees()}</div>
                  </div>
                  <div className="App-card-divider"></div>
                  <div className="App-card-options">
                    {isBuying && (
                      <button className="App-button-option App-card-option" onClick={() => selectToken(token)}>
                        Buy with {token.symbol}
                      </button>
                    )}
                    {!isBuying && (
                      <button className="App-button-option App-card-option" onClick={() => selectToken(token)}>
                        Sell for {token.symbol}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* </div> */}
      </div>
    </div>
  );
}
