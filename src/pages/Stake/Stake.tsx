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
import { useAnyAirdroppedTokenTitle } from "domain/synthetics/tokens/useAirdroppedTokenTitle";
import { useLpInterviewNotification } from "domain/synthetics/userFeedback/useLpInterviewNotification";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, getPageTitle } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import { InterviewModal } from "components/InterviewModal/InterviewModal";
import PageTitle from "components/PageTitle/PageTitle";
import { BotanixBanner } from "components/Synthetics/BotanixBanner/BotanixBanner";
import UserIncentiveDistributionList from "components/Synthetics/UserIncentiveDistributionList/UserIncentiveDistributionList";

import { EscrowedGmxCard } from "./EscrowedGmxCard";
import { GlpCard } from "./GlpCard";
import { GmxAndVotingPowerCard } from "./GmxAndVotingPowerCard";
import { StakeModal } from "./StakeModal";
import { TotalRewardsCard } from "./TotalRewardsCard";
import { UnstakeModal } from "./UnstakeModal";
import { useProcessedData } from "./useProcessedData";
import { Vesting } from "./Vesting";

import "./Stake.css";

function StakeContent() {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();
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
  const incentivesToken = useAnyAirdroppedTokenTitle();

  const { setPendingTxns } = usePendingTxns();

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

  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const { data: sbfGmxBalance } = useSWR(
    [`StakeV2:sbfGmxBalance:${active}`, chainId, feeGmxTrackerAddress, "balanceOf", account ?? PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, "Token"),
    }
  );

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  const processedData = useProcessedData();

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
      <SEO title={getPageTitle(t`Stake`)} />

      <PageTitle
        isTop
        title={t`Stake`}
        qa="earn-page"
        subtitle={
          <div>
            <Trans>
              Deposit <ExternalLink href="https://docs.gmx.io/docs/tokenomics/gmx-token">GMX</ExternalLink> and{" "}
              <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/gmx-token">esGMX</ExternalLink> tokens to
              earn rewards.
            </Trans>
            {earnMsg && <div className="Page-description">{earnMsg}</div>}
            {incentivesMessage}
          </div>
        }
      />

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

      <InterviewModal type="lp" isVisible={isLpInterviewModalVisible} setIsVisible={setIsLpInterviewModalVisible} />
      <Footer />
    </div>
  );
}

export default function Stake() {
  const { chainId } = useChainId();
  const isBotanix = chainId === BOTANIX;

  return isBotanix ? (
    <div className="default-container page-layout">
      <SEO title={getPageTitle(t`Stake`)} />

      <PageTitle isTop title={t`Stake`} qa="earn-page" />

      <BotanixBanner />
      <Footer />
    </div>
  ) : (
    <StakeContent />
  );
}
