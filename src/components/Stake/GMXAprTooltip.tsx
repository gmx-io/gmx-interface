import { t, Trans } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
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
  const maxGmxAprPercentageDifference = processedData.maxGmxAprForNativeToken.sub(processedData.gmxAprForNativeToken);

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
        {aprUpdateMsg}
        <br />
      </>
    );
  }

  return (
    <>
      {(!processedData.gmxBoostAprForNativeToken || processedData.gmxBoostAprForNativeToken.eq(0)) && (
        <StatsTooltipRow
          label={t`${nativeTokenSymbol} APR`}
          showDollar={false}
          value={`${gmxAprPercentage}% - ${maxGmxAprPercentage}%`}
        />
      )}
      {processedData?.gmxBoostAprForNativeToken?.gt(0) ? (
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
          <Trans>
            The Boosted APR is from your staked Multiplier Points. Earn an extra{" "}
            {formatAmount(maxGmxAprPercentageDifference, 2, 2, true)}% APR by increasing your MPs.
          </Trans>
        </div>
      ) : (
        escrowedGMXApr
      )}
      <div>
        <br />
        {aprUpdateMsg}
      </div>
    </>
  );
}
