import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { AVALANCHE, BOTANIX, getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { getIncentivesV2Url } from "config/links";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useLpInterviewNotification } from "domain/synthetics/userFeedback/useLpInterviewNotification";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, getPageTitle } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { BotanixBanner } from "components/BotanixBanner/BotanixBanner";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { InterviewModal } from "components/InterviewModal/InterviewModal";
import PageTitle from "components/PageTitle/PageTitle";
import SEO from "components/Seo/SEO";
import UserIncentiveDistribution from "components/UserIncentiveDistribution/UserIncentiveDistribution";

import { EscrowedGmxCard } from "./EscrowedGmxCard";
import { GmxAndVotingPowerCard } from "./GmxAndVotingPowerCard";
import { StakeModal, StakeModalTabConfig } from "./StakeModal";
import { TotalRewardsCard } from "./TotalRewardsCard";
import { useProcessedData } from "./useProcessedData";
import { Vesting } from "./Vesting";

import "./Stake.css";

function StakeContent() {
  const { active, signer, account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const incentiveStats = useIncentiveStats(chainId);
  const { isLpInterviewModalVisible, setIsLpInterviewModalVisible } = useLpInterviewNotification();

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

  const { setPendingTxns } = usePendingTxns();

  const [isGmxModalVisible, setIsGmxModalVisible] = useState(false);
  const [stakeGmxValue, setStakeGmxValue] = useState("");
  const [unstakeGmxValue, setUnstakeGmxValue] = useState("");

  const [isEsGmxModalVisible, setIsEsGmxModalVisible] = useState(false);
  const [stakeEsGmxValue, setStakeEsGmxValue] = useState("");
  const [unstakeEsGmxValue, setUnstakeEsGmxValue] = useState("");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false });

  const { data: sbfGmxBalance } = useSWR(
    feeGmxTrackerAddress !== zeroAddress && [
      `StakeV2:sbfGmxBalance:${active}`,
      chainId,
      feeGmxTrackerAddress,
      "balanceOf",
      account ?? PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, "Token"),
    }
  );

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  const { data: processedData } = useProcessedData();

  const reservedAmount =
    (processedData?.gmxInStakedGmx !== undefined &&
      processedData?.esGmxInStakedGmx !== undefined &&
      sbfGmxBalance !== undefined &&
      processedData?.gmxInStakedGmx + processedData?.esGmxInStakedGmx - sbfGmxBalance) ||
    0n;

  const gmxUnstakeMaxAmount = useMemo(() => {
    const stakedGmx = processedData?.gmxInStakedGmx;
    if (stakedGmx === undefined) {
      return undefined;
    }

    if (sbfGmxBalance === undefined) {
      return stakedGmx;
    }

    return bigMath.min(stakedGmx, sbfGmxBalance);
  }, [processedData?.gmxInStakedGmx, sbfGmxBalance]);

  const esGmxUnstakeMaxAmount = useMemo(() => {
    const stakedEsGmx = processedData?.esGmxInStakedGmx;
    if (stakedEsGmx === undefined) {
      return undefined;
    }

    if (sbfGmxBalance === undefined) {
      return stakedEsGmx;
    }

    return bigMath.min(stakedEsGmx, sbfGmxBalance);
  }, [processedData?.esGmxInStakedGmx, sbfGmxBalance]);

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
    setIsGmxModalVisible(true);
    setStakeGmxValue("");
  }, []);

  const showStakeEsGmxModal = useCallback(() => {
    setIsEsGmxModalVisible(true);
    setStakeEsGmxValue("");
  }, []);

  const showUnstakeGmxModal = useCallback(() => {
    setIsGmxModalVisible(true);
    setUnstakeGmxValue("");
  }, []);

  const showUnstakeEsGmxModal = useCallback(() => {
    setIsEsGmxModalVisible(true);
    setUnstakeEsGmxValue("");
  }, []);

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

  const stakeGmxConfig: StakeModalTabConfig = useMemo(
    () => ({
      maxAmount: processedData?.gmxBalance,
      value: stakeGmxValue,
      setValue: setStakeGmxValue,
    }),
    [processedData?.gmxBalance, stakeGmxValue, setStakeGmxValue]
  );

  const unstakeGmxConfig: StakeModalTabConfig = useMemo(
    () => ({
      maxAmount: gmxUnstakeMaxAmount,
      value: unstakeGmxValue,
      setValue: setUnstakeGmxValue,
    }),
    [gmxUnstakeMaxAmount, unstakeGmxValue, setUnstakeGmxValue]
  );

  const stakeEsGmxConfig: StakeModalTabConfig = useMemo(
    () => ({
      maxAmount: processedData?.esGmxBalance,
      value: stakeEsGmxValue,
      setValue: setStakeEsGmxValue,
    }),
    [processedData?.esGmxBalance, stakeEsGmxValue, setStakeEsGmxValue]
  );

  const unstakeEsGmxConfig: StakeModalTabConfig = useMemo(
    () => ({
      maxAmount: esGmxUnstakeMaxAmount,
      value: unstakeEsGmxValue,
      setValue: setUnstakeEsGmxValue,
    }),
    [esGmxUnstakeMaxAmount, unstakeEsGmxValue, setUnstakeEsGmxValue]
  );

  return (
    <div className="default-container page-layout">
      <SEO title={getPageTitle(t`Stake`)} />

      <StakeModal
        isVisible={isGmxModalVisible}
        setIsVisible={setIsGmxModalVisible}
        chainId={chainId}
        signer={signer}
        tokenSymbol="GMX"
        rewardRouterAddress={rewardRouterAddress}
        stakeTokenAddress={gmxAddress}
        stakeFarmAddress={stakedGmxTrackerAddress}
        reservedAmount={reservedAmount}
        stake={stakeGmxConfig}
        unstake={unstakeGmxConfig}
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />

      <StakeModal
        isVisible={isEsGmxModalVisible}
        setIsVisible={setIsEsGmxModalVisible}
        chainId={chainId}
        signer={signer}
        tokenSymbol="esGMX"
        rewardRouterAddress={rewardRouterAddress}
        stakeTokenAddress={esGmxAddress}
        stakeFarmAddress={zeroAddress}
        reservedAmount={reservedAmount}
        stake={stakeEsGmxConfig}
        unstake={unstakeEsGmxConfig}
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />

      <div className="flex flex-col gap-16">
        <PageTitle
          isTop
          title={t`Stake`}
          qa="earn-page"
          subtitle={
            <div>
              <Trans>
                Deposit <ExternalLink href="https://docs.gmx.io/docs/tokenomics/gmx-token">GMX</ExternalLink> and{" "}
                <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/gmx-token">esGMX</ExternalLink> tokens
                to earn rewards.
              </Trans>
              {earnMsg && <div className="Page-description">{earnMsg}</div>}
              {incentivesMessage}
            </div>
          }
        />
        <div className="StakeV2-cards">
          <GmxAndVotingPowerCard
            processedData={processedData}
            sbfGmxBalance={sbfGmxBalance}
            showStakeGmxModal={showStakeGmxModal}
            showUnstakeGmxModal={showUnstakeGmxModal}
          />
          <TotalRewardsCard processedData={processedData} showStakeGmxModal={showStakeGmxModal} />
          <EscrowedGmxCard
            processedData={processedData}
            showStakeEsGmxModal={showStakeEsGmxModal}
            showUnstakeEsGmxModal={showUnstakeEsGmxModal}
          />
        </div>
        <div>
          <Vesting processedData={processedData} />
        </div>
        <div>
          <PageTitle
            title={t`Distributions`}
            subtitle={<Trans>Claim and view your incentives, airdrops, and prizes.</Trans>}
          />
        </div>
        <UserIncentiveDistribution />
      </div>

      <InterviewModal type="lp" isVisible={isLpInterviewModalVisible} setIsVisible={setIsLpInterviewModalVisible} />
    </div>
  );
}

export default function Stake() {
  const { chainId } = useChainId();
  const isBotanix = chainId === BOTANIX;

  return (
    <AppPageLayout header={<ChainContentHeader />}>
      {isBotanix ? (
        <div className="default-container page-layout">
          <SEO title={getPageTitle(t`Stake`)} />

          <PageTitle isTop title={t`Stake`} qa="earn-page" />

          <BotanixBanner />
        </div>
      ) : (
        <StakeContent />
      )}
    </AppPageLayout>
  );
}
