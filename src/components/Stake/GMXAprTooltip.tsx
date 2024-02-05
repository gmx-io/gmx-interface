import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { DOCS_LINKS } from "config/links";
import { BigNumber } from "ethers";
import { formatKeyAmount, formatAmount } from "lib/numbers";

type Props = {
  processedData: {
    gmxAprForEsGmx: BigNumber;
    gmxAprForNativeToken: BigNumber;
    maxGmxAprForNativeToken: BigNumber;
    gmxAprForNativeTokenWithBoost: BigNumber;
    gmxBoostAprForNativeToken?: BigNumber;
  };
  nativeTokenSymbol: string;
  isUserConnected: boolean;
};

function renderEscrowedGMXApr(processedData) {
  if (!processedData?.gmxAprForEsGmx?.gt(0)) return;
  return (
    <StatsTooltipRow
      label={t`Escrowed GMX APR`}
      showDollar={false}
      value={`${formatKeyAmount(processedData, "gmxAprForEsGmx", 2, 2, true)}%`}
    />
  );
}

export default function GMXAprTooltip({ processedData, nativeTokenSymbol, isUserConnected = false }: Props) {
  const escrowedGMXApr = renderEscrowedGMXApr(processedData);
  const gmxAprPercentage = formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true);
  const maxGmxAprPercentage = formatKeyAmount(processedData, "maxGmxAprForNativeToken", 2, 2, true);
  const maxGmxAprPercentageDifference = processedData.maxGmxAprForNativeToken.sub(
    processedData.gmxAprForNativeTokenWithBoost
  );

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
        <Trans>
          Max. {nativeTokenSymbol} APR is calculated with the max. 200% Boost Percentage by staking{" "}
          <ExternalLink href={DOCS_LINKS.multiplierPoints}>Multiplier Points</ExternalLink>.
        </Trans>
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

        {processedData.gmxBoostAprForNativeToken?.gt(0) ? (
          <Trans>
            The Boosted APR is from your staked Multiplier Points. Earn an extra{" "}
            {formatAmount(maxGmxAprPercentageDifference, 2, 2, true)}% APR by increasing your MPs.
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
