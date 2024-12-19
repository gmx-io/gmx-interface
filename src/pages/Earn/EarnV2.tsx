import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import GlpManager from "sdk/abis/GlpManager.json";
import ReaderV2 from "sdk/abis/ReaderV2.json";
import RewardReader from "sdk/abis/RewardReader.json";
import Token from "sdk/abis/Token.json";
import Vault from "sdk/abis/Vault.json";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getIsSyntheticsSupported } from "config/features";
import { getIncentivesV2Url } from "config/links";
import { useGmxPrice } from "domain/legacy";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useAnyAirdroppedTokenTitle } from "domain/synthetics/tokens/useAirdroppedTokenTitle";
import useVestingData from "domain/vesting/useVestingData";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import {
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getProcessedData,
  getStakingData,
} from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";

import { GlvList } from "components/Synthetics/GmList/GlvList";
import { GmList } from "components/Synthetics/GmList/GmList";
import UserIncentiveDistributionList from "components/Synthetics/UserIncentiveDistributionList/UserIncentiveDistributionList";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { EscrowedGmxCard } from "./EscrowedGmxCard";
import { GlpCard } from "./GlpCard";
import { GmxAndVotingPowerCard } from "./GmxAndVotingPowerCard";
import { StakeModal } from "./StakeModal";
import { TotalRewardsCard } from "./TotalRewardsCard";
import { UnstakeModal } from "./UnstakeModal";
import { Vesting } from "./Vesting";

import sparkleIcon from "img/sparkle.svg";

import "./EarnV2.css";

export default function EarnV2() {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();
  const incentiveStats = useIncentiveStats(chainId);

  const incentivesMessage = useMemo(() => {
    const avalancheLink = (
      <ExternalLink newTab href={getIncentivesV2Url(AVALANCHE)}>
        {getChainName(AVALANCHE)}
      </ExternalLink>
    );
    if (incentiveStats?.lp?.isActive && incentiveStats?.trading?.isActive) {
      return (
        <div>
          <Trans>Liquidity and trading incentives programs are live on {avalancheLink}.</Trans>
        </div>
      );
    } else if (incentiveStats?.lp?.isActive) {
      return (
        <div>
          <Trans>Liquidity incentives program is live on {avalancheLink}.</Trans>
        </div>
      );
    } else if (incentiveStats?.trading?.isActive) {
      return (
        <div>
          <Trans>Trading incentives program is live on {avalancheLink}.</Trans>
        </div>
      );
    }
  }, [incentiveStats?.lp?.isActive, incentiveStats?.trading?.isActive]);

  const incentivesToken = useAnyAirdroppedTokenTitle();

  const [, setPendingTxns] = usePendingTxns();

  const [isStakeGmxModalVisible, setIsStakeGmxModalVisible] = useState(false);
  const [stakeGmxValue, setStakeGmxValue] = useState("");
  const [isStakeEsGmxModalVisible, setIsStakeEsGmxModalVisible] = useState(false);
  const [stakeEsGmxValue, setStakeEsGmxValue] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState<bigint | undefined>(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const glpAddress = getContract(chainId, "GLP");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const extendedGmxTrackerAddress = getContract(chainId, "ExtendedGmxTracker");

  const glpManagerAddress = getContract(chainId, "GlpManager");

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];
  const depositTokens = [
    gmxAddress,
    esGmxAddress,
    stakedGmxTrackerAddress,
    extendedGmxTrackerAddress,
    bnGmxAddress,
    glpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedGmxTrackerAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress,
    extendedGmxTrackerAddress,
  ];

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const {
    marketsTokensApyData,
    marketsTokensIncentiveAprData,
    glvTokensIncentiveAprData,
    marketsTokensLidoAprData,
    glvApyInfoData,
  } = useGmMarketsApy(chainId);
  const vestingData = useVestingData(account);

  const { data: walletBalances } = useSWR(
    [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, ReaderV2, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [
      `StakeV2:depositBalances:${active}`,
      chainId,
      rewardReaderAddress,
      "getDepositBalances",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedGmxSupply } = useSWR(
    [`StakeV2:stakedGmxSupply:${active}`, chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: contractFetcher(signer, GlpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: contractFetcher(signer, Vault),
    }
  );

  const { data: sbfGmxBalance } = useSWR(
    [`StakeV2:sbfGmxBalance:${active}`, chainId, feeGmxTrackerAddress, "balanceOf", account ?? PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, Token),
    }
  );

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply");
  const { data: gmxSupply } = useSWR([gmxSupplyUrl], {
    fetcher: (args) => fetch(...args).then((res) => res.text()),
  });

  let aum;
  if (aums && aums.length > 0) {
    aum = (aums[0] + aums[1]) / 2n;
  }

  const { balanceData, supplyData } = useMemo(() => getBalanceAndSupplyData(walletBalances), [walletBalances]);
  const depositBalanceData = useMemo(() => getDepositBalanceData(depositBalances), [depositBalances]);
  const stakingData = useMemo(() => getStakingData(stakingInfo), [stakingInfo]);

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  const processedData = getProcessedData(
    balanceData,
    supplyData,
    depositBalanceData,
    stakingData,
    vestingData,
    aum,
    nativeTokenPrice,
    stakedGmxSupply,
    gmxPrice,
    gmxSupply
  );

  const reservedAmount =
    (processedData?.gmxInStakedGmx !== undefined &&
      processedData?.esGmxInStakedGmx !== undefined &&
      sbfGmxBalance !== undefined &&
      processedData?.gmxInStakedGmx + processedData?.esGmxInStakedGmx - sbfGmxBalance) ||
    0n;

  let totalRewardTokens;

  if (processedData && processedData.bonusGmxInFeeGmx !== undefined) {
    totalRewardTokens = processedData.bonusGmxInFeeGmx;
  }

  let totalRewardAndLpTokens = totalRewardTokens ?? 0n;
  if (processedData?.glpBalance !== undefined) {
    totalRewardAndLpTokens = totalRewardAndLpTokens + processedData.glpBalance;
  }
  if ((userTotalGmInfo?.balance ?? 0n) > 0) {
    totalRewardAndLpTokens = totalRewardAndLpTokens + (userTotalGmInfo?.balance ?? 0n);
  }

  const showStakeGmxModal = useCallback(() => {
    setIsStakeGmxModalVisible(true);
    setStakeGmxValue("");
  }, []);

  const showStakeEsGmxModal = useCallback(() => {
    setIsStakeEsGmxModalVisible(true);
    setStakeEsGmxValue("");
  }, []);

  const showUnstakeEsGmxModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle(t`Unstake esGMX`);
    let maxAmount = processedData?.esGmxInStakedGmx;

    if (maxAmount !== undefined) {
      maxAmount = bigMath.min(maxAmount, sbfGmxBalance);
    }

    setUnstakeModalMaxAmount(maxAmount);
    setUnstakeValue("");
    setUnstakingTokenSymbol("esGMX");
    setUnstakeMethodName("unstakeEsGmx");
  };

  let earnMsg;
  if (totalRewardAndLpTokens && totalRewardAndLpTokens > 0) {
    let gmxAmountStr;
    if (processedData?.gmxInStakedGmx && processedData.gmxInStakedGmx > 0) {
      gmxAmountStr = formatAmount(processedData.gmxInStakedGmx, 18, 2, true) + " GMX";
    }
    let esGmxAmountStr;
    if (processedData?.esGmxInStakedGmx && processedData.esGmxInStakedGmx > 0) {
      esGmxAmountStr = formatAmount(processedData.esGmxInStakedGmx, 18, 2, true) + " esGMX";
    }
    let glpStr;
    if (processedData?.glpBalance && processedData.glpBalance > 0) {
      glpStr = formatAmount(processedData.glpBalance, 18, 2, true) + " GLP";
    }
    let gmStr;
    if (userTotalGmInfo?.balance && userTotalGmInfo.balance > 0) {
      gmStr = formatAmount(userTotalGmInfo.balance, 18, 2, true) + " GM";
    }
    const amountStr = [gmxAmountStr, esGmxAmountStr, gmStr, glpStr].filter((s) => s).join(", ");
    earnMsg = (
      <div>
        <Trans>
          You are earning rewards with {formatAmount(totalRewardAndLpTokens, 18, 2, true)} tokens.
          <br />
          Tokens: {amountStr}.
        </Trans>
      </div>
    );
  }

  return (
    <div className="default-container page-layout">
      <StakeModal
        isVisible={isStakeGmxModalVisible}
        setIsVisible={setIsStakeGmxModalVisible}
        chainId={chainId}
        title={t`Stake GMX`}
        maxAmount={processedData?.gmxBalance}
        value={stakeGmxValue}
        setValue={setStakeGmxValue}
        signer={signer}
        stakingTokenSymbol="GMX"
        stakingTokenAddress={gmxAddress}
        farmAddress={stakedGmxTrackerAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName="stakeGmx"
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />

      <StakeModal
        isVisible={isStakeEsGmxModalVisible}
        setIsVisible={setIsStakeEsGmxModalVisible}
        chainId={chainId}
        title={t`Stake esGMX`}
        maxAmount={processedData?.esGmxBalance}
        value={stakeEsGmxValue}
        setValue={setStakeEsGmxValue}
        signer={signer}
        stakingTokenSymbol="esGMX"
        stakingTokenAddress={esGmxAddress}
        farmAddress={zeroAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName="stakeEsGmx"
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />

      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        reservedAmount={reservedAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        signer={signer}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethodName}
        processedData={processedData}
      />

      <PageTitle
        isTop
        title={t`Earn`}
        qa="earn-page"
        subtitle={
          <div>
            <Trans>
              Stake <ExternalLink href="https://docs.gmx.io/docs/tokenomics/gmx-token">GMX</ExternalLink> and buy{" "}
              <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2">GM</ExternalLink> or{" "}
              <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">GLP</ExternalLink> to earn rewards.
            </Trans>
            {earnMsg && <div className="Page-descriptionж">{earnMsg}</div>}
            {incentivesMessage}
          </div>
        }
      />

      <div className="StakeV2-content">
        <div className="StakeV2-cards">
          <GmxAndVotingPowerCard
            processedData={processedData}
            sbfGmxBalance={sbfGmxBalance}
            setIsUnstakeModalVisible={setIsUnstakeModalVisible}
            setUnstakeModalTitle={setUnstakeModalTitle}
            setUnstakeModalMaxAmount={setUnstakeModalMaxAmount}
            setUnstakeValue={setUnstakeValue}
            setUnstakingTokenSymbol={setUnstakingTokenSymbol}
            setUnstakeMethodName={setUnstakeMethodName}
            showStakeGmxModal={showStakeGmxModal}
          />
          <TotalRewardsCard processedData={processedData} showStakeGmxModal={showStakeGmxModal} />
          <GlpCard processedData={processedData} />
          <EscrowedGmxCard
            processedData={processedData}
            showStakeEsGmxModal={showStakeEsGmxModal}
            showUnstakeEsGmxModal={showUnstakeEsGmxModal}
          />
        </div>
      </div>

      {getIsSyntheticsSupported(chainId) && (
        <div className="mt-15">
          <PageTitle
            title={
              <TooltipWithPortal
                disableHandleStyle
                content={
                  <Trans>
                    <p className="mb-6">Zero Cost Mint</p>
                    <p>Get a rebate for all transaction costs incurred when minting GLV</p>
                  </Trans>
                }
              >
                <Trans>Select a GLV Vault</Trans>
                <img src={sparkleIcon} alt="sparkle" className="relative -left-4 -top-8 inline h-24 align-top" />
              </TooltipWithPortal>
            }
            showNetworkIcon={false}
            subtitle={<Trans>Yield-optimized vaults supporting trading across multiple GMX markets</Trans>}
          />
          <GlvList
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            glvTokensIncentiveAprData={glvTokensIncentiveAprData}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            glvTokensApyData={glvApyInfoData}
            shouldScrollToTop
            isDeposit={false}
          />
          <PageTitle
            title={t`Select a GM Pool`}
            showNetworkIcon={false}
            subtitle={
              <Trans>Pools allowing provision of liquidity including single and native asset opportunities</Trans>
            }
          />
          <GmList
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            glvTokensIncentiveAprData={undefined}
            marketsTokensLidoAprData={marketsTokensLidoAprData}
            glvTokensApyData={undefined}
            isDeposit={false}
            shouldScrollToTop
          />
        </div>
      )}

      <Vesting processedData={processedData} />

      <div className="mt-10">
        <PageTitle
          title={t`Incentives & Prizes`}
          subtitle={
            incentiveStats?.lp?.isActive || incentiveStats?.trading?.isActive ? (
              <Trans>Earn {incentivesToken} token incentives by purchasing GM tokens or trading in GMX V2.</Trans>
            ) : (
              <Trans>Earn prizes by participating in GMX Trading Competitions.</Trans>
            )
          }
        />
      </div>
      <UserIncentiveDistributionList />
      <Footer />
    </div>
  );
}
