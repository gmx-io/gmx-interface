import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import { DOCS_LINKS } from "config/links";
import { FeeItem } from "domain/synthetics/fees";
import { WarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { formatPercentage, formatUsd } from "lib/numbers";
import { getIsElevatedImpactCap } from "sdk/utils/fees/priceImpact";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export type Props = {
  priceImpactWarningState: WarningState;
  swapPriceImpact?: FeeItem;
  swapProfitFee?: FeeItem;
  externalSwapFeeItem?: FeeItem;
  executionFeeUsd?: bigint;
  isIncrease?: boolean;
  maxImpactCapBps?: bigint;
};

export function HighPriceImpactOrFeesWarningCard({
  priceImpactWarningState,
  swapPriceImpact,
  swapProfitFee,
  externalSwapFeeItem,
  executionFeeUsd,
  isIncrease,
  maxImpactCapBps,
}: Props) {
  const hasElevatedCap = getIsElevatedImpactCap(maxImpactCapBps);

  const formattedCap = maxImpactCapBps !== undefined ? formatPercentage(maxImpactCapBps, { bps: true }) : "";

  const warnings = useMemo(() => {
    const warnings: { id: string; key: React.ReactNode; value?: React.ReactNode; tooltipContent?: React.ReactNode }[] =
      [];

    if (priceImpactWarningState.shouldShowWarningForCollateral) {
      if (isIncrease) {
        warnings.push({
          id: "high-impact-on-collateral",
          key: t`High Net Price Impact`,
          value: undefined,
          tooltipContent: hasElevatedCap ? (
            <Trans>
              The potential net price impact that will apply when closing this position may be high compared to the
              amount of collateral you're using. This market has a maximum price impact cap of {formattedCap}. Consider
              reducing leverage or choosing a different market.{" "}
              <ExternalLink href={DOCS_LINKS.priceImpact}>Read more</ExternalLink>.
            </Trans>
          ) : (
            <Trans>
              The potential net price impact that will apply when closing this position may be high compared to the
              amount of collateral you're using. Consider reducing leverage.{" "}
              <ExternalLink href={DOCS_LINKS.priceImpact}>Read more</ExternalLink>.
            </Trans>
          ),
        });
      } else {
        warnings.push({
          id: "high-impact-on-close",
          key: t`High Price Impact on Close`,
          value: undefined,
          tooltipContent: hasElevatedCap ? (
            <Trans>
              The current price impact for closing this position is high. This market has a maximum cap of{" "}
              {formattedCap}. Consider waiting for better market conditions or reducing your close size.{" "}
              <ExternalLink href={DOCS_LINKS.priceImpact}>Read more</ExternalLink>.
            </Trans>
          ) : (
            <Trans>
              The current price impact for closing this position is high. Consider waiting for better market conditions
              or reducing your close size. <ExternalLink href={DOCS_LINKS.priceImpact}>Read more</ExternalLink>.
            </Trans>
          ),
        });
      }
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

    if (externalSwapFeeItem) {
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
    isIncrease,
    hasElevatedCap,
    formattedCap,
  ]);

  if (!priceImpactWarningState.shouldShowWarning) {
    return null;
  }

  return (
    <AlertInfoCard className="h-fit" type="warning" onClose={() => priceImpactWarningState.setIsDismissed(true)}>
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
