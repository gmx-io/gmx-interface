import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo } from "react";
import Skeleton from "react-loading-skeleton";

import { Operation } from "domain/synthetics/markets/types";
import { formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { bigMath } from "sdk/utils/bigmath";
import { FeeItem } from "sdk/utils/fees/types";

import { DeltaUsdValue } from "components/NumericValue/DeltaUsdValue";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipRow, TooltipRows } from "components/Tooltip/TooltipBlocks";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  collateralSwapFee?: FeeItem;
  transitFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
  shiftFee?: FeeItem;
  operation: Operation;
  isLoading?: boolean;
};

export function GmFees(p: Props) {
  const totalFeesUsd = p.totalFees?.deltaUsd;

  let value: ReactNode = useMemo(() => {
    const operationTexts = {
      [Operation.Deposit]: t`buy`,
      [Operation.Withdrawal]: t`sell`,
      [Operation.Shift]: t`shift`,
    };

    const operationText = operationTexts[p.operation];

    if (p.isLoading) {
      return (
        <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={120} className="leading-base" inline={true} />
      );
    }

    if (p.totalFees?.deltaUsd === undefined) {
      return t`0.000% / 0.000%`;
    } else if (
      bigMath.abs(p.swapPriceImpact?.deltaUsd ?? 0n) > 0 ||
      p.swapFee ||
      bigMath.abs(p.collateralSwapFee?.deltaUsd ?? 0n) > 0 ||
      bigMath.abs(p.transitFee?.deltaUsd ?? 0n) > 0 ||
      bigMath.abs(p.uiFee?.deltaUsd ?? 0n) > 0
    ) {
      return (
        <StandardTooltip
          handle={
            <span>
              <span
                className={cx("numbers", {
                  "text-green-300": p.swapPriceImpact?.deltaUsd !== undefined && p.swapPriceImpact.deltaUsd > 0,
                })}
              >
                {p.swapPriceImpact?.deltaUsd !== undefined && p.swapPriceImpact.deltaUsd > 0 ? "+" : "-"}
                {formatPercentage(p.swapPriceImpact?.precisePercentage, {
                  bps: false,
                  displayDecimals: 3,
                })}
              </span>
              {" / "}
              <span
                className={cx("numbers", {
                  "text-green-300": p.totalFees?.deltaUsd !== undefined && p.totalFees.deltaUsd > 0,
                })}
              >
                {p.totalFees?.deltaUsd !== undefined && p.totalFees.deltaUsd > 0 ? "+" : "-"}
                {formatPercentage(p.totalFees?.precisePercentage, {
                  bps: false,
                  displayDecimals: 3,
                })}
              </span>
            </span>
          }
          position="bottom-end"
          renderContent={() => (
            <TooltipRows>
              {bigMath.abs(p.swapPriceImpact?.deltaUsd ?? 0n) > 0 && (
                <TooltipRow
                  label={
                    <div>
                      <div>{t`Price impact`}</div>
                      <div>
                        <Trans>
                          (
                          <span className="numbers">
                            {formatPercentage(p.swapPriceImpact?.precisePercentage, {
                              bps: false,
                              displayDecimals: 3,
                            })}
                          </span>{" "}
                          of {operationText} amount)
                        </Trans>
                      </div>
                    </div>
                  }
                  value={<DeltaUsdValue deltaUsd={p.swapPriceImpact?.deltaUsd} />}
                  valueClassName={getPositiveOrNegativeClass(
                    p.swapPriceImpact === undefined ? undefined : p.swapPriceImpact.deltaUsd
                  )}
                />
              )}

              {p.swapFee && (
                <>
                  <TooltipRow
                    label={
                      <div>
                        <div>{p.operation === Operation.Deposit ? t`Buy fee` : t`Sell fee`}</div>
                        <div>
                          <Trans>
                            (
                            <span className="numbers">
                              {formatPercentage(p.swapFee.precisePercentage, {
                                bps: false,
                                displayDecimals: 3,
                              })}
                            </span>{" "}
                            of {operationText} amount)
                          </Trans>
                        </div>
                      </div>
                    }
                    value={<DeltaUsdValue deltaUsd={p.swapFee.deltaUsd} />}
                    valueClassName={getPositiveOrNegativeClass(p.swapFee.deltaUsd)}
                  />
                </>
              )}

              {bigMath.abs(p.collateralSwapFee?.deltaUsd ?? 0n) > 0 && (
                <TooltipRow
                  label={
                    <div>
                      <div>{t`Swap fee`}</div>
                      <div>
                        <Trans>
                          (
                          <span className="numbers">
                            {formatPercentage(p.collateralSwapFee?.precisePercentage, {
                              bps: false,
                              displayDecimals: 3,
                            })}
                          </span>{" "}
                          of {operationText} amount)
                        </Trans>
                      </div>
                    </div>
                  }
                  value={<DeltaUsdValue deltaUsd={p.collateralSwapFee?.deltaUsd} />}
                  valueClassName={getPositiveOrNegativeClass(p.collateralSwapFee?.deltaUsd)}
                />
              )}

              {bigMath.abs(p.transitFee?.deltaUsd ?? 0n) > 0 && (
                <TooltipRow
                  label={
                    <div>
                      <div>{t`Conversion fee`}</div>
                      <div>
                        <Trans>
                          (
                          <span className="numbers">
                            {formatPercentage(p.transitFee?.precisePercentage, {
                              bps: false,
                              displayDecimals: 3,
                            })}
                          </span>{" "}
                          of {operationText} amount)
                        </Trans>
                      </div>
                    </div>
                  }
                  value={<DeltaUsdValue deltaUsd={p.transitFee?.deltaUsd} />}
                  valueClassName={getPositiveOrNegativeClass(p.transitFee?.deltaUsd)}
                />
              )}

              {bigMath.abs(p.uiFee?.deltaUsd ?? 0n) > 0 && (
                <TooltipRow
                  label={
                    <div>
                      <div>{t`UI fee`}</div>
                      <div>
                        <Trans>
                          (
                          <span className="numbers">
                            {formatPercentage(p.uiFee?.precisePercentage, {
                              bps: false,
                              displayDecimals: 3,
                            })}
                          </span>{" "}
                          of {operationText} amount)
                        </Trans>
                      </div>
                    </div>
                  }
                  value={<DeltaUsdValue deltaUsd={p.uiFee?.deltaUsd} />}
                  valueClassName="text-red-500"
                />
              )}

              {p.shiftFee !== undefined && (
                <TooltipRow
                  label={
                    <div>
                      <div>{t`Shift fee`}</div>
                      <div>
                        <Trans>
                          (
                          <span className="numbers">
                            {formatPercentage(p.shiftFee.precisePercentage, {
                              bps: false,
                              displayDecimals: 3,
                            })}
                          </span>{" "}
                          of {operationText} amount)
                        </Trans>
                      </div>
                    </div>
                  }
                  value={<DeltaUsdValue deltaUsd={p.shiftFee.deltaUsd} />}
                />
              )}
            </TooltipRows>
          )}
        />
      );
    }
    return (
      <span className={cx("numbers", { positive: totalFeesUsd !== undefined && totalFeesUsd > 0 })}>
        {formatPercentage(p.swapPriceImpact?.precisePercentage, {
          bps: false,
          displayDecimals: 3,
        })}
        {" / "}
        {formatPercentage(p.totalFees?.precisePercentage, {
          bps: false,
          displayDecimals: 3,
        })}
      </span>
    );
  }, [
    p.operation,
    p.isLoading,
    p.shiftFee,
    p.swapFee,
    p.swapPriceImpact,
    p.totalFees?.deltaUsd,
    p.totalFees?.precisePercentage,
    p.uiFee?.precisePercentage,
    p.uiFee?.deltaUsd,
    p.collateralSwapFee?.precisePercentage,
    p.collateralSwapFee?.deltaUsd,
    p.transitFee?.precisePercentage,
    p.transitFee?.deltaUsd,
    totalFeesUsd,
  ]);

  return <SyntheticsInfoRow label={<Trans>Price impact / fees</Trans>} value={value} />;
}
