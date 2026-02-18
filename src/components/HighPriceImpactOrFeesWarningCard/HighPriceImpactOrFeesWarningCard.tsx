import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { DOCS_LINKS } from "config/links";
import { FeeItem } from "domain/synthetics/fees";
import { WarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { formatPercentage, formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export type Props = {
  priceImpactWarningState: WarningState;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  externalSwapFeeItem?: FeeItem;
  executionFeeUsd?: bigint;
  maxNegativeImpactBps?: bigint;
};

export function HighPriceImpactOrFeesWarningCard({
  priceImpactWarningState,
  swapPriceImpact,
  swapProfitFee,
  externalSwapFeeItem,
  executionFeeUsd,
  maxNegativeImpactBps,
}: Props) {
  const warnings = useMemo(() => {
    const warnings: { id: string; key: React.ReactNode; value?: React.ReactNode; tooltipContent?: React.ReactNode }[] =
      [];

    const formattedCap = formatPercentage(maxNegativeImpactBps, { displayDecimals: 1 });

    if (priceImpactWarningState.shouldShowWarningForCollateral) {
      warnings.push({
        id: "high-impact-on-collateral",
        key: t`High net price impact`,
        value: undefined,
        tooltipContent: formattedCap ? (
          <Trans>
            High potential net price impact (capped at {formattedCap} for this market) may significantly affect your
            collateral. Consider reducing leverage.{" "}
            <ExternalLink href={DOCS_LINKS.priceImpact}>Read more</ExternalLink>.
          </Trans>
        ) : undefined,
      });
    }

    if (priceImpactWarningState.shouldShowWarningForExecutionFee) {
      warnings.push({
        id: "high-network-fees",
        key: t`High network fees`,
        value: formatUsd(executionFeeUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForTwapNetworkFee) {
      warnings.push({
        id: "high-twap-network-fee",
        key: t`High TWAP network fee`,
        value: formatUsd(executionFeeUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForSwap) {
      warnings.push({
        id: "high-swap-price-impact",
        key: t`High swap price impact`,
        value: formatUsd(swapPriceImpact?.deltaUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForSwapProfitFee) {
      warnings.push({
        id: "high-swap-profit-fee",
        key: t`High swap profit fee`,
        value: formatUsd(swapProfitFee?.deltaUsd),
      });
    }

    if (priceImpactWarningState.shouldShowWarningForTriggerOrders) {
      warnings.push({
        id: "high-trigger-orders",
        key: t`Existing executable trigger orders`,
      });
    }

    if (priceImpactWarningState.shouldShowWarningForExternalSwap && externalSwapFeeItem) {
      warnings.push({
        id: "high-external-swap-fee",
        key: t`High external swap impact`,
        value: formatUsd(externalSwapFeeItem.deltaUsd),
      });
    }
    return warnings;
  }, [
    priceImpactWarningState,
    externalSwapFeeItem,
    executionFeeUsd,
    swapPriceImpact?.deltaUsd,
    swapProfitFee?.deltaUsd,
    maxNegativeImpactBps,
  ]);

  if (!priceImpactWarningState.shouldShowWarning || warnings.length === 0) {
    return null;
  }

  return (
    <AlertInfoCard className="h-fit" type="warning" hideClose>
      <div className="flex flex-col gap-4">
        {warnings.map((warning) => {
          const warningContent = (
            <div key={warning.id} className="flex justify-between gap-4">
              <div>{warning.key}</div>
              <div className="font-medium text-yellow-300">{warning.value}</div>
            </div>
          );

          return warning.tooltipContent ? (
            <TooltipWithPortal handle={warningContent} content={warning.tooltipContent} position="bottom" />
          ) : (
            warningContent
          );
        })}
      </div>
    </AlertInfoCard>
  );
}
