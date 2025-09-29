import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { getConstant } from "config/chains";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { getTotalGlvInfo, getTotalGmInfo } from "domain/synthetics/markets/utils";
import { useChainId } from "lib/chains";
import { ProcessedData } from "lib/legacy";
import { formatUsd } from "lib/numbers";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import { ClaimRewardsButton } from "./ClaimRewardsButton";

export function RewardsBar({
  processedData,
  mutateProcessedData,
}: {
  processedData: ProcessedData | undefined;
  mutateProcessedData: () => void;
}) {
  const { chainId, srcChainId } = useChainId();
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });

  const totalGmInfo = useMemo(() => getTotalGmInfo(marketTokensData), [marketTokensData]);
  const totalGlvInfo = useMemo(() => getTotalGlvInfo(marketTokensData), [marketTokensData]);

  const stakedGmxUsd = (processedData?.gmxInStakedGmxUsd ?? 0n) + (processedData?.esGmxInStakedGmxUsd ?? 0n);
  const totalInvestmentUsd = stakedGmxUsd + totalGmInfo.balanceUsd + totalGlvInfo.balanceUsd;

  const totalPendingRewardsUsd = processedData?.totalRewardsUsd ?? 0n;

  return (
    <div className="rounded-8 bg-slate-900 p-20 text-typography-primary">
      <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-28 max-lg:flex-col max-lg:gap-16">
          <div className="flex gap-28 max-lg:grid max-lg:grid-cols-2 max-lg:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Investment Value</Trans>
              </span>
              <span className="text-body-large font-medium numbers">{formatUsd(totalInvestmentUsd)}</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Earned</Trans>
              </span>
              <TotalEarned processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
            </div>
          </div>

          <div className="border-r-1/2 border-slate-600 max-lg:border-b-1/2 max-lg:border-r-0" />

          <div className="flex gap-28 max-lg:flex-col max-lg:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Pending Rewards</Trans>
              </span>
              <PendingRewards processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Pending Rewards</Trans>
              </span>
              <span className="text-body-large font-medium numbers">{formatUsd(totalPendingRewardsUsd)}</span>
            </div>
          </div>
        </div>

        <ClaimRewardsButton
          className="lg:self-center"
          processedData={processedData}
          mutateProcessedData={mutateProcessedData}
        />
      </div>
    </div>
  );
}

function TotalEarned({
  processedData,
  nativeTokenSymbol,
}: {
  processedData: ProcessedData | undefined;
  nativeTokenSymbol: string;
}) {
  const earnedTooltipContent = useMemo(() => {
    if (!processedData) {
      return null;
    }

    const rows = [
      <StatsTooltipRow
        key="gmx"
        label={<Trans>GMX rewards</Trans>}
        showDollar={false}
        value={
          <AmountWithUsdBalance
            amount={processedData.cumulativeGmxRewards}
            decimals={18}
            usd={processedData.cumulativeGmxRewardsUsd}
            symbol="GMX"
          />
        }
      />,
    ];

    if ((processedData.cumulativeEsGmxRewards ?? 0n) > 0n) {
      rows.push(
        <StatsTooltipRow
          key="esgmx"
          label={<Trans>esGMX rewards</Trans>}
          showDollar={false}
          value={
            <AmountWithUsdBalance
              amount={processedData.cumulativeEsGmxRewards}
              decimals={18}
              usd={processedData.cumulativeEsGmxRewardsUsd}
              symbol="esGMX"
            />
          }
        />
      );
    }

    if ((processedData.cumulativeNativeTokenRewards ?? 0n) > 0n) {
      rows.push(
        <StatsTooltipRow
          key="native"
          label={<Trans>{nativeTokenSymbol} rewards</Trans>}
          showDollar={false}
          value={
            <AmountWithUsdBalance
              amount={processedData.cumulativeNativeTokenRewards}
              decimals={18}
              usd={processedData.cumulativeNativeTokenRewardsUsd}
              symbol={nativeTokenSymbol}
            />
          }
        />
      );
    }

    return <div className="flex flex-col gap-4">{rows}</div>;
  }, [nativeTokenSymbol, processedData]);

  const totalEarnedUsd = processedData?.cumulativeTotalRewardsUsd ?? 0n;

  return (
    <Tooltip
      disabled={!earnedTooltipContent}
      content={earnedTooltipContent}
      handle={<span className="text-body-large font-medium numbers">{formatUsd(totalEarnedUsd)}</span>}
    />
  );
}

function PendingRewards({
  processedData,
  nativeTokenSymbol,
}: {
  processedData: ProcessedData | undefined;
  nativeTokenSymbol: string;
}) {
  const hasNativeRewards = (processedData?.totalNativeTokenRewards ?? 0n) > 0n;

  return (
    <div className="flex flex-wrap gap-6">
      <div className="flex items-center gap-4">
        <AmountWithUsdBalance
          amount={processedData?.totalGmxRewards ?? 0n}
          decimals={18}
          usd={processedData?.totalGmxRewardsUsd ?? 0n}
          symbol="GMX"
          className="text-body-large font-medium"
          secondaryValueClassName="!text-body-large font-medium"
        />
        <span className="mb-2 text-16 text-typography-inactive">/</span>
      </div>
      <div className="flex items-center gap-4">
        <AmountWithUsdBalance
          amount={processedData?.totalEsGmxRewards ?? 0n}
          decimals={18}
          usd={processedData?.totalEsGmxRewardsUsd ?? 0n}
          symbol="esGMX"
          className="text-body-large font-medium"
          secondaryValueClassName="!text-body-large font-medium"
        />
        {hasNativeRewards && <span className="mb-2 text-16 text-typography-inactive">/</span>}
      </div>
      {hasNativeRewards && (
        <div className="flex items-center gap-4">
          <AmountWithUsdBalance
            amount={processedData?.totalNativeTokenRewards ?? 0n}
            decimals={18}
            usd={processedData?.totalNativeTokenRewardsUsd ?? 0n}
            symbol={nativeTokenSymbol}
            className="text-body-large font-medium"
            secondaryValueClassName="!text-body-large font-medium"
          />
        </div>
      )}
    </div>
  );
}

export default RewardsBar;
