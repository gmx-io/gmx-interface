import { t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { ProcessedData } from "lib/legacy";
import { formatKeyAmount } from "lib/numbers";

type Props = {
  processedData?: ProcessedData;
  nativeTokenSymbol: string;
  isUserConnected?: boolean;
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

  const aprUpdateMsg = t`APRs are updated weekly on Wednesday and will depend on the fees collected for the week.`;

  if (!isUserConnected) {
    return (
      <>
        <StatsTooltipRow label={t`${nativeTokenSymbol} APR`} showDollar={false} value={`${gmxAprPercentage}%`} />
        <br />
        {aprUpdateMsg}
      </>
    );
  }

  return (
    <>
      <div>
        <StatsTooltipRow label={t`${nativeTokenSymbol} APR`} showDollar={false} value={`${gmxAprPercentage}%`} />
        {escrowedGMXApr && (
          <>
            <br /> {escrowedGMXApr}
          </>
        )}
      </div>
      <div>
        <br />
        {aprUpdateMsg}
      </div>
    </>
  );
}
