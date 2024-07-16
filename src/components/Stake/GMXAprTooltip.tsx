import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { DOCS_LINKS } from "config/links";
import { useAccumulatedBnGMXAmount } from "domain/rewards/useAccumulatedBnGMXAmount";
import { ProcessedData } from "lib/legacy";
import { formatKeyAmount, formatAmount } from "lib/numbers";

type Props = {
  processedData?: ProcessedData;
  nativeTokenSymbol: string;
  isUserConnected?: boolean;
  recommendStakeGmx?: bigint;
};

function renderEscrowedGMXApr(processedData) {
  if (!processedData?.gmxAprForEsGmx || processedData.gmxAprForEsGmx <= 0) return;
  return (
    <StatsTooltipRow
      label={t`Escrowed GMX APR`}
      showDollar={false}
      value={`${formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%`}
    />
  );
}

export default function GMXAprTooltip({
  processedData,
  nativeTokenSymbol,
  recommendStakeGmx,
  isUserConnected = false,
}: Props) {
  const accumulatedBnGMXAmount = useAccumulatedBnGMXAmount();
  const escrowedGMXApr = renderEscrowedGMXApr(processedData);
  const gmxAprPercentage = formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true);
  const maxGmxAprPercentage = formatKeyAmount(processedData, "maxGmxAprForNativeToken", 2, 2, true);
  const maxGmxAprPercentageDifference =
    processedData?.maxGmxAprForNativeToken === undefined
      ? undefined
      : processedData?.maxGmxAprForNativeToken - (processedData?.gmxAprForNativeTokenWithBoost ?? 0n);

  const aprUpdateMsg = t`APRs are updated weekly on Wednesday and will depend on the fees collected for the week.`;

  if (!isUserConnected) {
    return (
      <>
        <StatsTooltipRow label={t`Base ${nativeTokenSymbol} APR`} showDollar={false} value={`${gmxAprPercentage}%`} />
        <StatsTooltipRow
          label={t`Max. ${nativeTokenSymbol} APR`}
          showDollar={false}
          value={`${maxGmxAprPercentage}%`}
        />
        <br />
        {processedData?.avgBoostMultiplier && (
          <Trans>
            The average {nativeTokenSymbol} APR is calculated with the average account boost percentage (
            {formatAmount(processedData?.avgBoostMultiplier, 2, 2, true)}%), while the maximum {nativeTokenSymbol} APR
            is calculated with the maximum boost (200%) by staking{" "}
            <ExternalLink href={DOCS_LINKS.multiplierPoints}>Multiplier Points</ExternalLink>.
          </Trans>
        )}

        <br />
        <br />
        {aprUpdateMsg}
      </>
    );
  }

  return (
    <>
      <div>
        <StatsTooltipRow label={t`${nativeTokenSymbol} Base APR`} showDollar={false} value={`${gmxAprPercentage}%`} />
        <StatsTooltipRow
          label={t`${nativeTokenSymbol} Boosted APR`}
          showDollar={false}
          value={`${formatKeyAmount(processedData, "gmxBoostAprForNativeToken", 2, 2, true)}%`}
        />
        <div className="Tooltip-divider" />
        <StatsTooltipRow
          label={t`${nativeTokenSymbol} Total APR`}
          showDollar={false}
          value={`${formatKeyAmount(processedData, "gmxAprForNativeTokenWithBoost", 2, 2, true)}%`}
        />
        {escrowedGMXApr && (
          <>
            <br /> {escrowedGMXApr}
          </>
        )}
        <br />
        {(recommendStakeGmx ?? 0) > 0 ? (
          <Trans>
            You have reached the maximum Boost Percentage. Stake an additional{" "}
            {formatAmount(recommendStakeGmx, 18, 2, true)} GMX or esGMX to be able to stake your unstaked{" "}
            {formatAmount(accumulatedBnGMXAmount, 18, 4, true)} Multiplier Points using the "Compound" button.
          </Trans>
        ) : (
          <Trans>
            Earn an extra {formatAmount(maxGmxAprPercentageDifference, 2, 2, true)}% {nativeTokenSymbol} Boosted APR by
            increasing your staked <ExternalLink href={DOCS_LINKS.multiplierPoints}>Multiplier Points</ExternalLink>.
          </Trans>
        )}
      </div>
      <div>
        <br />
        {aprUpdateMsg}
      </div>
    </>
  );
}
