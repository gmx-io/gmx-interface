/* eslint-disable @typescript-eslint/no-unused-vars */
import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";
import useSWR from "swr";

import { getContract } from "config/contracts";
import { getTotalGmInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, getPageTitle } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import SEO from "components/Common/SEO";
import Footer from "components/Footer/Footer";

import { useProcessedData } from "./useProcessedData";
import { Vesting } from "./Vesting";

import "./Stake.css";

function StakeContent() {
  const { active, account } = useWallet();
  const { chainId } = useChainId();

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      <Vesting processedData={processedData} />

      <Footer />
    </div>
  );
}

export default function Stake() {
  return <StakeContent />;
}
