import { t, Trans } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BigNumber } from "ethers";
import { formatKeyAmount } from "lib/numbers";

type Props = {
  processedData: {
    gmxAprForEsGmx: BigNumber;
    gmxAprForNativeToken: BigNumber;
    gmxAprForNativeTokenWithBoost: BigNumber;
    gmxBoostAprForNativeToken?: BigNumber;
  };
  nativeTokenSymbol: string;
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

export default function GMXAprTooltip({ processedData, nativeTokenSymbol }: Props) {
  const escrowedGMXApr = renderEscrowedGMXApr(processedData);
  return (
    <>
      {(!processedData.gmxBoostAprForNativeToken || processedData.gmxBoostAprForNativeToken.eq(0)) && (
        <StatsTooltipRow
          label={t`${nativeTokenSymbol} APR`}
          showDollar={false}
          value={`${formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%`}
        />
      )}
      {processedData?.gmxBoostAprForNativeToken?.gt(0) ? (
        <div>
          <StatsTooltipRow
            label={t`${nativeTokenSymbol} Base APR`}
            showDollar={false}
            value={`${formatKeyAmount(processedData, "gmxAprForNativeToken", 2, 2, true)}%`}
          />
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
          <Trans>The Boosted APR is from your staked Multiplier Points.</Trans>
        </div>
      ) : (
        escrowedGMXApr
      )}
      <div>
        <br />
        <Trans>APRs are updated weekly on Wednesday and will depend on the fees collected for the week.</Trans>
        <br />
        <br />

        <Trans>
          Max. {nativeTokenSymbol} APR with 200% Boost for this week:{" "}
          {formatKeyAmount(processedData, "maxGmxAprForNativeToken", 2, 2, true)}%.
        </Trans>
      </div>
    </>
  );
}
