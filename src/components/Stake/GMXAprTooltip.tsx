import { t } from "@lingui/macro";

import { ProcessedData } from "lib/legacy";
import { formatKeyAmount } from "lib/numbers";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";

type Props = {
  processedData?: ProcessedData;
  nativeTokenSymbol: string;
  isUserConnected?: boolean;
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

export default function GMXAprTooltip({ processedData, nativeTokenSymbol, isUserConnected = false }: Props) {
  const escrowedGMXApr = renderEscrowedGMXApr(processedData);
  const gmxAprForNativeTokenPercentage = formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true);
  const gmxAprForGmxPercentage = formatKeyAmount(processedData, "gmxAprForGmx", 2, 2, true);

  const shouldShowNativeTokenApr = processedData?.gmxAprForNativeToken && processedData.gmxAprForNativeToken > 0;

  const aprUpdateMsg = t`APRs are updated weekly on Wednesday and will depend on the fees collected for the week.`;

  return (
    <>
      <div>
        <StatsTooltipRow label={t`GMX APR`} showDollar={false} value={`${gmxAprForGmxPercentage}%`} />
        {isUserConnected && escrowedGMXApr && (
          <>
            <br /> {escrowedGMXApr}
          </>
        )}
        {shouldShowNativeTokenApr ? (
          <StatsTooltipRow
            label={t`${nativeTokenSymbol} APR`}
            showDollar={false}
            value={`${gmxAprForNativeTokenPercentage}%`}
          />
        ) : null}
      </div>
      <div>
        <br />
        {aprUpdateMsg}
      </div>
    </>
  );
}
