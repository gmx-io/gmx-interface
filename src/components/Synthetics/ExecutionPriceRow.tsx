import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { HIGH_COLLATERAL_IMPACT_BPS } from "config/factors";
import { OrderType } from "domain/synthetics/orders/types";
import { formatAcceptablePrice } from "domain/synthetics/positions";
import { TradeFees, TradeFlags, TriggerThresholdType } from "domain/synthetics/trade";
import { bigMath } from "lib/bigmath";
import { formatDeltaUsd, formatPercentage, formatUsdPrice } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { memo, useMemo } from "react";
import { SyntheticsInfoRow } from "./SyntheticsInfoRow";

interface Props {
  tradeFlags: TradeFlags;
  fees?: TradeFees;
  executionPrice?: bigint;
  acceptablePrice?: bigint;
  visualMultiplier?: number;
  triggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
}

export const ExecutionPriceRow = memo(function ExecutionPriceRow({
  fees,
  executionPrice,
  tradeFlags,
  acceptablePrice,
  triggerOrderType,
  visualMultiplier,
}: Props) {
  const { isLimit, isMarket, isIncrease, isLong, isTrigger } = tradeFlags;

  const triggerThresholdType = useMemo(() => {
    if (isIncrease) {
      return isLong ? TriggerThresholdType.Below : TriggerThresholdType.Above;
    } else {
      if (triggerOrderType === OrderType.LimitDecrease) {
        return isLong ? TriggerThresholdType.Above : TriggerThresholdType.Below;
      }
      if (triggerOrderType === OrderType.StopLossDecrease) {
        return isLong ? TriggerThresholdType.Below : TriggerThresholdType.Above;
      }
    }
  }, [isIncrease, isLong, triggerOrderType]);

  const fullPositionPriceImpactPercentage =
    fees?.positionPriceImpact?.precisePercentage !== undefined && fees?.priceImpactDiff?.precisePercentage !== undefined
      ? fees.positionPriceImpact.precisePercentage - fees.priceImpactDiff.precisePercentage
      : undefined;

  const fullCollateralPriceImpactBps =
    fees?.positionCollateralPriceImpact?.bps !== undefined && fees?.collateralPriceImpactDiff?.bps !== undefined
      ? fees.positionCollateralPriceImpact.bps - fees.collateralPriceImpactDiff.bps
      : undefined;

  const fullCollateralPriceImpactPercentage =
    fees?.positionCollateralPriceImpact?.precisePercentage !== undefined &&
    fees?.collateralPriceImpactDiff?.precisePercentage !== undefined
      ? fees.positionCollateralPriceImpact.precisePercentage - fees.collateralPriceImpactDiff.precisePercentage
      : undefined;

  const positionPriceImpactDeltaUsd =
    fees?.positionPriceImpact?.deltaUsd !== undefined && fees?.priceImpactDiff?.deltaUsd !== undefined
      ? fees.positionPriceImpact.deltaUsd - fees.priceImpactDiff.deltaUsd
      : undefined;

  const acceptablePriceClarification = useMemo(() => {
    if (isMarket) {
      return t`The order's acceptable price includes the current price impact and set allowed slippage. The execution price must meet this condition for the order to be executed.`;
    }

    if (isLimit) {
      return (
        <>
          {isLong ? (
            <Trans>
              Once the mark price hits the limit price, the order will attempt to execute, guaranteeing the acceptable
              price, which includes the set acceptable price impact. Note that if there is a negative price impact, the
              mark price may need to be lower than the limit price.
            </Trans>
          ) : (
            <Trans>
              Once the mark price hits the limit price, the order will attempt to execute, guaranteeing the acceptable
              price, which includes the set acceptable price impact. Note that if there is a negative price impact, the
              mark price may need to be higher than the limit price.
            </Trans>
          )}
        </>
      );
    }

    if (isTrigger) {
      if (triggerOrderType === OrderType.LimitDecrease) {
        return t`The order's acceptable price includes the set acceptable price impact. The execution price must meet this condition for the order to be executed.`;
      }

      if (triggerOrderType === OrderType.StopLossDecrease) {
        return t`Acceptable price does not apply to stop-loss orders, as they will be executed regardless of any price impact.`;
      }
    }

    return null;
  }, [isMarket, isLimit, isTrigger, triggerOrderType, isLong]);

  const acceptablePriceFormatted = formatAcceptablePrice(acceptablePrice, {
    visualMultiplier,
  });

  const handleClassName = useMemo(() => {
    if (positionPriceImpactDeltaUsd !== undefined && positionPriceImpactDeltaUsd >= 0n) {
      return "text-green-500 !decoration-green-500/50";
    }

    if (
      fullCollateralPriceImpactBps !== undefined &&
      fullCollateralPriceImpactBps < 0n &&
      bigMath.abs(fullCollateralPriceImpactBps) >= HIGH_COLLATERAL_IMPACT_BPS
    ) {
      return "text-yellow-500 !decoration-yellow-500/50";
    }

    return "";
  }, [positionPriceImpactDeltaUsd, fullCollateralPriceImpactBps]);

  return (
    <SyntheticsInfoRow label={t`Execution Price`}>
      {executionPrice !== undefined ? (
        <TooltipWithPortal
          maxAllowedWidth={350}
          position="bottom-end"
          handleClassName={handleClassName}
          handle={formatUsdPrice(executionPrice, {
            visualMultiplier,
          })}
          content={
            <>
              {isLimit
                ? t`Expected execution price for the order, including the current price impact, once the limit order executes.`
                : t`Expected execution price for the order, including the current price impact.`}
              <br />
              <br />
              {fullPositionPriceImpactPercentage !== undefined &&
                positionPriceImpactDeltaUsd !== undefined &&
                fullCollateralPriceImpactPercentage !== undefined && (
                  <StatsTooltipRow
                    textClassName={getPositiveOrNegativeClass(positionPriceImpactDeltaUsd, "text-green-500")}
                    label={
                      <>
                        <div className="text-white">{t`Price Impact`}:</div>
                        <div>
                          (
                          {formatPercentage(bigMath.abs(fullPositionPriceImpactPercentage), {
                            displayDecimals: 3,
                            bps: false,
                          })}{" "}
                          of position size)
                        </div>
                      </>
                    }
                    value={formatDeltaUsd(positionPriceImpactDeltaUsd)}
                    showDollar={false}
                  />
                )}
              {fees?.priceImpactDiff !== undefined && bigMath.abs(fees.priceImpactDiff.deltaUsd) > 0 && (
                <StatsTooltipRow
                  textClassName={getPositiveOrNegativeClass(fees.priceImpactDiff!.deltaUsd)}
                  label={
                    <>
                      <div className="text-white">{t`Price Impact Rebates`}:</div>
                      <div>
                        (
                        {formatPercentage(bigMath.abs(fees.priceImpactDiff.precisePercentage), {
                          displayDecimals: 3,
                          bps: false,
                        })}{" "}
                        of position size)
                      </div>
                    </>
                  }
                  value={formatDeltaUsd(fees.priceImpactDiff.deltaUsd)}
                  showDollar={false}
                />
              )}
              {acceptablePriceFormatted !== undefined && (
                <StatsTooltipRow
                  labelClassName="text-white"
                  label={t`Order Acceptable Price`}
                  value={
                    <>
                      {acceptablePriceFormatted !== "NA" && <>{triggerThresholdType} </>}
                      {acceptablePriceFormatted}
                    </>
                  }
                  showDollar={false}
                />
              )}
              {fees?.priceImpactDiff !== undefined && bigMath.abs(fees.priceImpactDiff.deltaUsd) > 0 && !isIncrease && (
                <>
                  <br />
                  <Trans>
                    Price impact rebates for closing trades are claimable under the claims tab.{" "}
                    <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
                      Read more
                    </ExternalLink>
                    .
                  </Trans>
                  <br />
                </>
              )}
              {acceptablePriceClarification && (
                <>
                  <br />
                  {acceptablePriceClarification}
                  <br />
                </>
              )}
              <br />
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2#order-execution">{t`Read more`}</ExternalLink>.
            </>
          }
        />
      ) : (
        "-"
      )}
    </SyntheticsInfoRow>
  );
});
