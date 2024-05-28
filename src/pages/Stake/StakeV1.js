import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ethers } from "ethers";

import { USD_DECIMALS, PRECISION } from "lib/legacy";

import { getContract, XGMT_EXCLUDED_ACCOUNTS } from "config/contracts";

import Reader from "abis/Reader.json";
import Token from "abis/Token.json";
import YieldToken from "abis/YieldToken.json";
import YieldFarm from "abis/YieldFarm.json";

import Modal from "components/Modal/Modal";
import Footer from "components/Footer/Footer";

import "./Stake.scss";
import { t, Trans } from "@lingui/macro";
import { CHAIN_ID, getExplorerUrl } from "config/chains";
import { contractFetcher } from "lib/contracts";
import { approveTokens } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { expandDecimals, formatAmount, formatAmountFree, formatKeyAmount, parseValue } from "lib/numbers";
import { getTokenBySymbol } from "config/tokens";
import { useChainId } from "lib/chains";
import ExternalLink from "components/ExternalLink/ExternalLink";
import useWallet from "lib/wallets/useWallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { bigMath } from "lib/bigmath";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";

const BASIS_POINTS_DIVISOR = 10000n;
const HOURS_PER_YEAR = 8760n;

const { ZeroAddress } = ethers;

function getBalanceAndSupplyData(balances) {
  if (!balances || balances.length === 0) {
    return {};
  }

  const keys = [
    "usdg",
    "gmt",
    "xgmt",
    "gmtUsdg",
    "xgmtUsdg",
    "gmtUsdgFarm",
    "xgmtUsdgFarm",
    "autoUsdg",
    "autoUsdgFarm",
  ];
  const balanceData = {};
  const supplyData = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    balanceData[key] = balances[i * propsLength];
    supplyData[key] = balances[i * propsLength + 1];
  }

  return { balanceData, supplyData };
}

function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = [
    "usdg",
    "xgmt",
    "gmtUsdgFarmXgmt",
    "gmtUsdgFarmNative",
    "xgmtUsdgFarmXgmt",
    "xgmtUsdgFarmNative",
    "autoUsdgFarmXgmt",
    "autoUsdgFarmNative",
  ];
  const data = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
    };
  }

  return data;
}

function getTotalStakedData(totalStakedInfo) {
  if (!totalStakedInfo || totalStakedInfo.length === 0) {
    return;
  }

  const keys = ["usdg", "xgmt"];
  const data = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = totalStakedInfo[i];
  }

  return data;
}

function getPairData(pairInfo) {
  const keys = ["gmtUsdg", "xgmtUsdg", "bnbBusd", "autoUsdg"];
  if (!pairInfo || pairInfo.length === 0 || pairInfo.length !== keys.length * 2) {
    return;
  }

  const data = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      balance0: pairInfo[i * propsLength],
      balance1: pairInfo[i * propsLength + 1],
    };
  }

  return data;
}

function getProcessedData(balanceData, supplyData, stakingData, totalStakedData, pairData, xgmtSupply) {
  if (!balanceData || !supplyData || !stakingData || !totalStakedData || !pairData || !xgmtSupply) {
    return {};
  }

  if (!supplyData.gmtUsdg || !supplyData.xgmtUsdg || !supplyData.autoUsdg) {
    return {};
  }

  const xgmtPrice =
    pairData.xgmtUsdg.balance0 == 0n
      ? 0n
      : bigMath.mulDiv(pairData.xgmtUsdg.balance1, PRECISION, pairData.xgmtUsdg.balance0);
  const gmtUsdgPrice =
    supplyData.gmtUsdg == 0n ? 0n : bigMath.mulDiv(pairData.gmtUsdg.balance1 * PRECISION, 2n, supplyData.gmtUsdg);
  const xgmtUsdgPrice =
    supplyData.xgmtUsdg == 0n ? 0n : bigMath.mulDiv(pairData.xgmtUsdg.balance1 * PRECISION, 2n, supplyData.xgmtUsdg);
  const bnbPrice = bigMath.mulDiv(pairData.bnbBusd.balance1, PRECISION, pairData.bnbBusd.balance0);
  const autoUsdgPrice =
    supplyData.autoUsdg == 0n ? 0n : bigMath.mulDiv(pairData.autoUsdg.balance1 * PRECISION, 2n, supplyData.autoUsdg);

  const usdgAnnualRewardsUsd = bigMath.mulDiv(
    stakingData.usdg.tokensPerInterval * bnbPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const xgmtAnnualRewardsUsd = bigMath.mulDiv(
    stakingData.xgmt.tokensPerInterval * bnbPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );

  const gmtUsdgAnnualRewardsXmgtUsd = bigMath.mulDiv(
    stakingData.gmtUsdgFarmXgmt.tokensPerInterval * xgmtPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const gmtUsdgAnnualRewardsNativeUsd = bigMath.mulDiv(
    stakingData.gmtUsdgFarmNative.tokensPerInterval * bnbPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const gmtUsdgTotalAnnualRewardsUsd = gmtUsdgAnnualRewardsXmgtUsd + gmtUsdgAnnualRewardsNativeUsd;

  const xgmtUsdgAnnualRewardsXmgtUsd = bigMath.mulDiv(
    stakingData.xgmtUsdgFarmXgmt.tokensPerInterval * xgmtPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const xgmtUsdgAnnualRewardsNativeUsd = bigMath.mulDiv(
    stakingData.xgmtUsdgFarmNative.tokensPerInterval * bnbPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const xgmtUsdgTotalAnnualRewardsUsd = xgmtUsdgAnnualRewardsXmgtUsd + xgmtUsdgAnnualRewardsNativeUsd;

  const autoUsdgAnnualRewardsXgmtUsd = bigMath.mulDiv(
    stakingData.autoUsdgFarmXgmt.tokensPerInterval * xgmtPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const autoUsdgAnnualRewardsNativeUsd = bigMath.mulDiv(
    stakingData.autoUsdgFarmNative.tokensPerInterval * bnbPrice,
    HOURS_PER_YEAR,
    expandDecimals(1, 18)
  );
  const autoUsdgTotalAnnualRewardsUsd = autoUsdgAnnualRewardsXgmtUsd + autoUsdgAnnualRewardsNativeUsd;

  const data = {};
  data.usdgBalance = balanceData.usdg;
  data.usdgSupply = supplyData.usdg;
  data.usdgTotalStaked = totalStakedData.usdg;
  data.usdgTotalStakedUsd = bigMath.mulDiv(totalStakedData.usdg, PRECISION, expandDecimals(1, 18));
  data.usdgSupplyUsd = bigMath.mulDiv(supplyData.usdg, PRECISION, expandDecimals(1, 18));
  data.usdgApr =
    data.usdgTotalStaked == 0n
      ? undefined
      : bigMath.mulDiv(
          bigMath.mulDiv(usdgAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, totalStakedData.usdg),
          expandDecimals(1, 18),
          PRECISION
        );
  data.usdgRewards = stakingData.usdg.claimable;

  data.xgmtBalance = balanceData.xgmt;
  data.xgmtBalanceUsd = bigMath.mulDiv(balanceData.xgmt, xgmtPrice, expandDecimals(1, 18));
  data.xgmtSupply = xgmtSupply;
  data.xgmtTotalStaked = totalStakedData.xgmt;
  data.xgmtTotalStakedUsd = bigMath.mulDiv(totalStakedData.xgmt, xgmtPrice, expandDecimals(1, 18));
  data.xgmtSupplyUsd = bigMath.mulDiv(xgmtSupply, xgmtPrice, expandDecimals(1, 18));
  data.xgmtApr =
    data.xgmtSupplyUsd == 0n ? 0n : bigMath.mulDiv(xgmtAnnualRewardsUsd, BASIS_POINTS_DIVISOR, data.xgmtTotalStakedUsd);
  data.xgmtRewards = stakingData.xgmt.claimable;

  data.gmtUsdgFarmBalance = balanceData.gmtUsdgFarm;

  data.gmtUsdgBalance = balanceData.gmtUsdg;
  data.gmtUsdgBalanceUsd = bigMath.mulDiv(balanceData.gmtUsdg, gmtUsdgPrice, expandDecimals(1, 18));
  data.gmtUsdgSupply = supplyData.gmtUsdg;
  data.gmtUsdgSupplyUsd = bigMath.mulDiv(supplyData.gmtUsdg, gmtUsdgPrice, expandDecimals(1, 18));
  data.gmtUsdgStaked = balanceData.gmtUsdgFarm;
  data.gmtUsdgStakedUsd = bigMath.mulDiv(balanceData.gmtUsdgFarm, gmtUsdgPrice, expandDecimals(1, 18));
  data.gmtUsdgFarmSupplyUsd = bigMath.mulDiv(supplyData.gmtUsdgFarm, gmtUsdgPrice, expandDecimals(1, 18));
  data.gmtUsdgApr =
    data.gmtUsdgSupplyUsd == 0n
      ? 0n
      : data.gmtUsdgFarmSupplyUsd == 0n
        ? undefined
        : bigMath.mulDiv(gmtUsdgTotalAnnualRewardsUsd, BASIS_POINTS_DIVISOR, data.gmtUsdgSupplyUsd);
  data.gmtUsdgXgmtRewards = stakingData.gmtUsdgFarmXgmt.claimable;
  data.gmtUsdgNativeRewards = stakingData.gmtUsdgFarmNative.claimable;
  data.gmtUsdgTotalRewards = data.gmtUsdgXgmtRewards + data.gmtUsdgNativeRewards;
  data.gmtUsdgTotalStaked = supplyData.gmtUsdgFarm;
  data.gmtUsdgTotalStakedUsd = bigMath.mulDiv(supplyData.gmtUsdgFarm, gmtUsdgPrice, expandDecimals(1, 18));

  data.xgmtUsdgBalance = balanceData.xgmtUsdg;
  data.xgmtUsdgFarmBalance = balanceData.xgmtUsdgFarm;
  data.xgmtUsdgBalanceUsd = bigMath.mulDiv(balanceData.xgmtUsdg, xgmtUsdgPrice, expandDecimals(1, 18));
  data.xgmtUsdgSupply = supplyData.xgmtUsdg;
  data.xgmtUsdgSupplyUsd = bigMath.mulDiv(supplyData.xgmtUsdg, xgmtUsdgPrice, expandDecimals(1, 18));
  data.xgmtUsdgStaked = balanceData.xgmtUsdgFarm;
  data.xgmtUsdgStakedUsd = bigMath.mulDiv(balanceData.xgmtUsdgFarm, xgmtUsdgPrice, expandDecimals(1, 18));
  data.xgmtUsdgFarmSupplyUsd = bigMath.mulDiv(supplyData.xgmtUsdgFarm, xgmtUsdgPrice, expandDecimals(1, 18));
  data.xgmtUsdgApr =
    data.xgmtUsdgFarmSupplyUsd == 0n
      ? undefined
      : bigMath.mulDiv(xgmtUsdgTotalAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.xgmtUsdgFarmSupplyUsd);
  data.xgmtUsdgXgmtRewards = stakingData.xgmtUsdgFarmXgmt.claimable;
  data.xgmtUsdgNativeRewards = stakingData.xgmtUsdgFarmNative.claimable;
  data.xgmtUsdgTotalRewards = data.xgmtUsdgXgmtRewards + data.xgmtUsdgNativeRewards;
  data.xgmtUsdgTotalStaked = supplyData.xgmtUsdgFarm;
  data.xgmtUsdgTotalStakedUsd = bigMath.mulDiv(supplyData.xgmtUsdgFarm, xgmtUsdgPrice, expandDecimals(1, 18));

  data.autoUsdgBalance = balanceData.autoUsdg;
  data.autoUsdgFarmBalance = balanceData.autoUsdgFarm;
  data.autoUsdgBalanceUsd = bigMath.mulDiv(balanceData.autoUsdg, autoUsdgPrice, expandDecimals(1, 18));
  data.autoUsdgStaked = balanceData.autoUsdgFarm;
  data.autoUsdgStakedUsd = bigMath.mulDiv(balanceData.autoUsdgFarm, autoUsdgPrice, expandDecimals(1, 18));
  data.autoUsdgFarmSupplyUsd = bigMath.mulDiv(supplyData.autoUsdgFarm, autoUsdgPrice, expandDecimals(1, 18));
  data.autoUsdgApr =
    data.autoUsdgFarmSupplyUsd == 0n
      ? 0n
      : bigMath.mulDiv(autoUsdgTotalAnnualRewardsUsd, BASIS_POINTS_DIVISOR_BIGINT, data.autoUsdgFarmSupplyUsd);
  data.autoUsdgXgmtRewards = stakingData.autoUsdgFarmXgmt.claimable;
  data.autoUsdgNativeRewards = stakingData.autoUsdgFarmNative.claimable;
  data.autoUsdgTotalRewards = data.autoUsdgXgmtRewards + data.autoUsdgNativeRewards;
  data.autoUsdgTotalStaked = supplyData.autoUsdgFarm;
  data.autoUsdgTotalStakedUsd = bigMath.mulDiv(supplyData.autoUsdgFarm, autoUsdgPrice, expandDecimals(1, 18));

  data.totalStakedUsd =
    data.usdgTotalStakedUsd +
    data.xgmtTotalStakedUsd +
    data.gmtUsdgTotalStakedUsd +
    data.xgmtUsdgTotalStakedUsd +
    data.autoUsdgTotalStakedUsd;

  return data;
}

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    title,
    maxAmount,
    value,
    setValue,
    active,
    account,
    signer,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    chainId,
  } = props;
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance, mutate: updateTokenAllowance } = useSWR(
    [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  useEffect(() => {
    if (active) {
      signer.on("block", () => {
        updateTokenAllowance(undefined, true);
      });
      return () => {
        signer.removeAllListeners("block");
      };
    }
  }, [active, signer, updateTokenAllowance]);

  let amount = parseValue(value, 18);
  const needApproval = tokenAllowance !== undefined && amount !== undefined && amount > tokenAllowance;

  const getError = () => {
    if (amount == undefined) {
      return t`Enter an amount`;
    }
    if (maxAmount && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId: CHAIN_ID,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(farmAddress, YieldFarm.abi, signer);
    contract
      .stake(amount)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            <Trans>
              Stake submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
            </Trans>
            <br />
          </div>
        );
        setIsVisible(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        helperToast.error(t`Stake failed`);
      })
      .finally(() => {
        setIsStaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return t`Approving ${stakingTokenSymbol}...`;
    }
    if (needApproval) {
      return t`Approve ${stakingTokenSymbol}`;
    }
    if (isStaking) {
      return t`Staking...`;
    }
    return t`Stake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">
                <Trans>Stake</Trans>
              </div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              <Trans>Max: {formatAmount(maxAmount, 18, 4, true)}</Trans>
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
  const { isVisible, setIsVisible, title, maxAmount, value, setValue, signer, stakingTokenSymbol, farmAddress } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);

  let amount = parseValue(value, 18);

  const getError = () => {
    if (amount === undefined) {
      return t`Enter an amount`;
    }
    if (amount > maxAmount) {
      return t`Max amount exceeded`;
    }
  };

  const onClickPrimary = () => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(farmAddress, YieldFarm.abi, signer);
    contract
      .unstake(amount)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            <Trans>
              Unstake submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
            </Trans>
            <br />
          </div>
        );
        setIsVisible(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        helperToast.error(t`Unstake failed`);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isUnstaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return t`Unstaking...`;
    }
    return t`Unstake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <div className="Exchange-swap-section">
          <div className="Exchange-swap-section-top">
            <div className="muted">
              <div className="Exchange-swap-usd">
                <Trans>Unstake</Trans>
              </div>
            </div>
            <div className="muted align-right clickable" onClick={() => setValue(formatAmountFree(maxAmount, 18, 18))}>
              <Trans>Max: {formatAmount(maxAmount, 18, 4, true)}</Trans>
            </div>
          </div>
          <div className="Exchange-swap-section-bottom">
            <div>
              <input
                type="number"
                placeholder="0.0"
                className="Exchange-swap-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="PositionEditor-token-symbol">{stakingTokenSymbol}</div>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <button className="App-cta Exchange-swap-button" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default function StakeV1() {
  const { chainId } = useChainId();
  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingFarmAddress, setUnstakingFarmAddress] = useState("");

  const { active, account, signer } = useWallet();
  const { openConnectModal } = useConnectModal();

  const readerAddress = getContract(CHAIN_ID, "Reader");
  const ammFactoryAddressV2 = getContract(CHAIN_ID, "AmmFactoryV2");
  const usdgAddress = getContract(CHAIN_ID, "USDG");
  const gmtAddress = getContract(CHAIN_ID, "GMT");
  const xgmtAddress = getContract(CHAIN_ID, "XGMT");
  const autoAddress = getContract(CHAIN_ID, "AUTO");
  const nativeTokenAddress = getContract(CHAIN_ID, "NATIVE_TOKEN");
  const busdAddress = getTokenBySymbol(CHAIN_ID, "BUSD").address;

  const gmtUsdgPairAddress = getContract(CHAIN_ID, "GMT_USDG_PAIR");
  const xgmtUsdgPairAddress = getContract(CHAIN_ID, "XGMT_USDG_PAIR");
  const autoUsdgPairAddress = getContract(CHAIN_ID, "AUTO_USDG_PAIR");
  const gmtUsdgFarmAddress = getContract(CHAIN_ID, "GMT_USDG_FARM");
  const xgmtUsdgFarmAddress = getContract(CHAIN_ID, "XGMT_USDG_FARM");
  const autoUsdgFarmAddress = getContract(CHAIN_ID, "AUTO_USDG_FARM");

  const usdgYieldTracker = getContract(CHAIN_ID, "USDG_YIELD_TRACKER");
  const xgmtYieldTracker = getContract(CHAIN_ID, "XGMT_YIELD_TRACKER");
  const gmtUsdgFarmTrackerXgmt = getContract(CHAIN_ID, "GMT_USDG_FARM_TRACKER_XGMT");
  const gmtUsdgFarmTrackerNative = getContract(CHAIN_ID, "GMT_USDG_FARM_TRACKER_NATIVE");
  const xgmtUsdgFarmTrackerXgmt = getContract(CHAIN_ID, "XGMT_USDG_FARM_TRACKER_XGMT");
  const xgmtUsdgFarmTrackerNative = getContract(CHAIN_ID, "XGMT_USDG_FARM_TRACKER_NATIVE");
  const autoUsdgFarmTrackerXgmt = getContract(CHAIN_ID, "AUTO_USDG_FARM_TRACKER_XGMT");
  const autoUsdgFarmTrackerNative = getContract(CHAIN_ID, "AUTO_USDG_FARM_TRACKER_NATIVE");

  const tokens = [
    usdgAddress,
    gmtAddress,
    xgmtAddress,
    gmtUsdgPairAddress,
    xgmtUsdgPairAddress,
    gmtUsdgFarmAddress,
    xgmtUsdgFarmAddress,
    autoUsdgPairAddress,
    autoUsdgFarmAddress,
  ];

  const yieldTrackers = [
    usdgYieldTracker,
    xgmtYieldTracker,
    gmtUsdgFarmTrackerXgmt,
    gmtUsdgFarmTrackerNative,
    xgmtUsdgFarmTrackerXgmt,
    xgmtUsdgFarmTrackerNative,
    autoUsdgFarmTrackerXgmt,
    autoUsdgFarmTrackerNative,
  ];

  const pairTokens = [
    gmtAddress,
    usdgAddress,
    xgmtAddress,
    usdgAddress,
    nativeTokenAddress,
    busdAddress,
    autoAddress,
    usdgAddress,
  ];

  const yieldTokens = [usdgAddress, xgmtAddress];

  const { data: xgmtSupply, mutate: updateXgmtSupply } = useSWR(
    [active, chainId, readerAddress, "getTokenSupply", xgmtAddress],
    {
      fetcher: contractFetcher(signer, Reader, [XGMT_EXCLUDED_ACCOUNTS]),
    }
  );

  const { data: balances, mutate: updateBalances } = useSWR(
    ["Stake:balances", chainId, readerAddress, "getTokenBalancesWithSupplies", account || ZeroAddress],
    {
      fetcher: contractFetcher(signer, Reader, [tokens]),
    }
  );

  const { data: stakingInfo, mutate: updateStakingInfo } = useSWR(
    [active, chainId, readerAddress, "getStakingInfo", account || ZeroAddress],
    {
      fetcher: contractFetcher(signer, Reader, [yieldTrackers]),
    }
  );

  const { data: totalStakedInfo, mutate: updateTotalStakedInfo } = useSWR(
    [active, chainId, readerAddress, "getTotalStaked"],
    {
      fetcher: contractFetcher(signer, Reader, [yieldTokens]),
    }
  );

  const { data: pairInfo, mutate: updatePairInfo } = useSWR(
    [active, chainId, readerAddress, "getPairInfo", ammFactoryAddressV2],
    {
      fetcher: contractFetcher(signer, Reader, [pairTokens]),
    }
  );

  const { balanceData, supplyData } = getBalanceAndSupplyData(balances);
  const stakingData = getStakingData(stakingInfo);
  const pairData = getPairData(pairInfo);
  const totalStakedData = getTotalStakedData(totalStakedInfo);

  const processedData = getProcessedData(balanceData, supplyData, stakingData, totalStakedData, pairData, xgmtSupply);

  const buyXgmtUrl = `https://exchange.pancakeswap.finance/#/swap?outputCurrency=${xgmtAddress}&inputCurrency=${usdgAddress}`;
  const buyGmtUrl = `https://exchange.pancakeswap.finance/#/swap?outputCurrency=${gmtAddress}&inputCurrency=${usdgAddress}`;

  const addGmtUsdgLpUrl = `https://exchange.pancakeswap.finance/#/add/${gmtAddress}/${usdgAddress}`;
  const addXgmtUsdgLpUrl = `https://exchange.pancakeswap.finance/#/add/${xgmtAddress}/${usdgAddress}`;

  const buyAutoUrl = `https://exchange.pancakeswap.finance/#/swap?outputCurrency=${autoAddress}&inputCurrency=${nativeTokenAddress}`;
  const addAutoUsdgLpUrl = `https://exchange.pancakeswap.finance/#/add/${autoAddress}/${usdgAddress}`;

  useEffect(() => {
    if (active) {
      signer.on("block", () => {
        updateXgmtSupply(undefined, true);
        updateBalances(undefined, true);
        updateStakingInfo(undefined, true);
        updateTotalStakedInfo(undefined, true);
        updatePairInfo(undefined, true);
      });
      return () => {
        signer.removeAllListeners("block");
      };
    }
  }, [active, signer, updateXgmtSupply, updateBalances, updateStakingInfo, updateTotalStakedInfo, updatePairInfo]);

  const claim = (farmAddress, rewards) => {
    if (!active || !account) {
      helperToast.error(t`Wallet not yet connected`);
      return;
    }
    if (chainId !== CHAIN_ID) {
      helperToast.error(t`Incorrect Network`);
      return;
    }
    if (!rewards || rewards == 0n) {
      helperToast.error(t`No rewards to claim yet`);
      return;
    }

    const contract = new ethers.Contract(farmAddress, YieldToken.abi, signer);
    contract
      .claim(account)
      .then(async (res) => {
        const txUrl = getExplorerUrl(CHAIN_ID) + "tx/" + res.hash;
        helperToast.success(
          <div>
            <Trans>
              Claim submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
            </Trans>
            <br />
          </div>
        );
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        helperToast.error(t`Claim failed`);
      });
  };

  const showUnstakeGmtUsdgModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake GMT-USDG");
    setUnstakeModalMaxAmount(processedData.gmtUsdgFarmBalance);
    setUnstakeValue("");
    setUnstakingFarmAddress(gmtUsdgFarmAddress);
  };

  const showUnstakeXgmtUsdgModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake xGMT-USDG");
    setUnstakeModalMaxAmount(processedData.xgmtUsdgFarmBalance);
    setUnstakeValue("");
    setUnstakingFarmAddress(xgmtUsdgFarmAddress);
  };

  const showStakeAutoUsdgModal = () => {
    setIsStakeModalVisible(true);
    setStakeModalTitle("Stake AUTO-USDG");
    setStakeModalMaxAmount(processedData.autoUsdgBalance);
    setStakeValue("");
    setStakingTokenAddress(autoUsdgPairAddress);
    setStakingFarmAddress(autoUsdgFarmAddress);
  };

  const showUnstakeAutoUsdgModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle("Unstake AUTO-USDG");
    setUnstakeModalMaxAmount(processedData.autoUsdgFarmBalance);
    setUnstakeValue("");
    setUnstakingFarmAddress(autoUsdgFarmAddress);
  };

  const hasFeeDistribution = true;

  return (
    <div className="Stake Page page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        active={active}
        account={account}
        signer={signer}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
      />
      <UnstakeModal
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        active={active}
        account={account}
        signer={signer}
        farmAddress={unstakingFarmAddress}
      />
      <div className="Stake-title App-hero">
        <div className="Stake-title-primary App-hero-primary">
          ${formatKeyAmount(processedData, "totalStakedUsd", 30, 0, true)}
        </div>
        <div className="Stake-title-secondary">
          <Trans>Total Assets Staked</Trans>
        </div>
      </div>
      <div className="Stake-note">
        <Trans>
          The Gambit protocol is in beta, please read the&nbsp;
          <ExternalLink href="https://gambit.gitbook.io/gambit/staking">staking details</ExternalLink>
          &nbsp; before participating.
        </Trans>
      </div>
      <div className="App-warning Stake-warning">
        <Trans>
          The <Link to="/migrate">GMX migration</Link> is in progress, please migrate your GMT, xGMT, GMT-USDG and
          xGMT-USDG tokens.
          <br />
          USDG tokens will continue to function as before and do not need to be migrated.
        </Trans>
      </div>
      <div className="Stake-cards">
        <div className="App-card primary">
          <div className="Stake-card-title App-card-title">USDG</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>
                {!hasFeeDistribution && "TBC"}
                {hasFeeDistribution && `${formatKeyAmount(processedData, "usdgApr", 2, 2, true)}%`}
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgBalance", 18, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {!hasFeeDistribution && "TBC"}
                {hasFeeDistribution && `${formatKeyAmount(processedData, "usdgRewards", 18, 8, true)} WBNB`}
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgTotalStaked", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Supply</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "usdgSupply", 18, 2, true)} ($
                {formatKeyAmount(processedData, "usdgSupplyUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <Link className="App-button-option App-card-option" to="/trade">
                Get USDG
              </Link>
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(usdgAddress, processedData.usdgRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">xGMT</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">APR</div>
              <div>
                0.00% (
                <Link to="/migrate">
                  <Trans>Migrate</Trans>
                </Link>
                )
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xgmtBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xgmtBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {!hasFeeDistribution && "TBC"}
                {hasFeeDistribution && `${formatKeyAmount(processedData, "xgmtRewards", 18, 8, true)} WBNB`}
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtTotalStaked", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xgmtTotalStakedUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Supply</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtSupply", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xgmtSupplyUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyXgmtUrl}>
                Get xGMT
              </ExternalLink>
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(xgmtAddress, processedData.xgmtRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">GMT-USDG LP</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>
                0.00% (
                <Link to="/migrate">
                  <Trans>Migrate</Trans>
                </Link>
                )
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "gmtUsdgStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "gmtUsdgStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "gmtUsdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "gmtUsdgBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {hasFeeDistribution &&
                  processedData.gmtUsdgNativeRewards &&
                  processedData.gmtUsdgNativeRewards > 0 &&
                  `${formatKeyAmount(processedData, "gmtUsdgNativeRewards", 18, 8, true)} WBNB, `}
                {formatKeyAmount(processedData, "gmtUsdgXgmtRewards", 18, 4, true)} xGMT
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "gmtUsdgTotalStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "gmtUsdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyGmtUrl}>
                Get GMT
              </ExternalLink>
              <ExternalLink className="App-button-option App-card-option" href={addGmtUsdgLpUrl}>
                <Trans>Create</Trans>
              </ExternalLink>
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showUnstakeGmtUsdgModal()}>
                  <Trans>Unstake</Trans>
                </button>
              )}
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(gmtUsdgFarmAddress, processedData.gmtUsdgTotalRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">xGMT-USDG LP</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>
                0.00% (
                <Link to="/migrate">
                  <Trans>Migrate</Trans>
                </Link>
                )
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtUsdgStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "xgmtUsdgStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtUsdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "xgmtUsdgBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>
                {hasFeeDistribution &&
                  processedData.xgmtUsdgNativeRewards &&
                  processedData.xgmtUsdgNativeRewards > 0 &&
                  `${formatKeyAmount(processedData, "xgmtUsdgNativeRewards", 18, 8, true)} WBNB, `}
                {formatKeyAmount(processedData, "xgmtUsdgXgmtRewards", 18, 4, true)} xGMT
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "xgmtUsdgTotalStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "xgmtUsdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyXgmtUrl}>
                Get xGMT
              </ExternalLink>
              <ExternalLink className="App-button-option App-card-option" href={addXgmtUsdgLpUrl}>
                <Trans>Create</Trans>
              </ExternalLink>
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showUnstakeXgmtUsdgModal()}>
                  <Trans>Unstake</Trans>
                </button>
              )}
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(xgmtUsdgFarmAddress, processedData.xgmtUsdgTotalRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="App-card">
          <div className="Stake-card-title App-card-title">AUTO-USDG LP</div>
          <div className="Stake-card-bottom App-card-content">
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>APR</Trans>
              </div>
              <div>{formatKeyAmount(processedData, "autoUsdgApr", 2, 2, true)}%</div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "autoUsdgStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "autoUsdgStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Wallet</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "autoUsdgBalance", 18, 2, true)} ($
                {formatKeyAmount(processedData, "autoUsdgBalanceUsd", USD_DECIMALS, 2, true)})
              </div>
            </div>
            <div className="App-card-row">
              <div className="label">
                <Trans>Rewards</Trans>
              </div>
              <div>{formatKeyAmount(processedData, "autoUsdgXgmtRewards", 18, 4, true)} xGMT</div>
            </div>
            <div className="Stake-info App-card-row">
              <div className="label">
                <Trans>Total Staked</Trans>
              </div>
              <div>
                {formatKeyAmount(processedData, "autoUsdgTotalStaked", 18, 4, true)} ($
                {formatKeyAmount(processedData, "autoUsdgTotalStakedUsd", 30, 2, true)})
              </div>
            </div>
            <div className="App-card-options">
              <ExternalLink className="App-button-option App-card-option" href={buyAutoUrl}>
                Get AUTO
              </ExternalLink>
              <ExternalLink className="App-button-option App-card-option" href={addAutoUsdgLpUrl}>
                <Trans>Create</Trans>
              </ExternalLink>
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showStakeAutoUsdgModal()}>
                  <Trans>Stake</Trans>
                </button>
              )}
              {active && (
                <button className="App-button-option App-card-option" onClick={() => showUnstakeAutoUsdgModal()}>
                  <Trans>Unstake</Trans>
                </button>
              )}
              {active && (
                <button
                  className="App-button-option App-card-option"
                  onClick={() => claim(autoUsdgFarmAddress, processedData.autoUsdgTotalRewards)}
                >
                  <Trans>Claim</Trans>
                </button>
              )}
              {!active && (
                <button className="App-button-option App-card-option" onClick={openConnectModal}>
                  <Trans>Connect Wallet</Trans>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
