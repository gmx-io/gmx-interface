import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo } from "react";

import { formatDeltaUsd, formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { FeeItem } from "sdk/types/fees";
import { bigMath } from "sdk/utils/bigmath";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import { Operation } from "../GmSwapBox/types";

import "./GmFees.scss";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
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
      return t`Loading...`;
    }

    if (p.totalFees?.deltaUsd === undefined) {
      return "0.000% / 0.000%";
    } else if (
      bigMath.abs(p.swapPriceImpact?.deltaUsd ?? 0n) > 0 ||
      p.swapFee ||
      bigMath.abs(p.uiFee?.deltaUsd ?? 0n) > 0
    ) {
      return (
        <Tooltip
          className="GmFees-tooltip"
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
          position="top-end"
          renderContent={() => (
            <div>
              {bigMath.abs(p.swapPriceImpact?.deltaUsd ?? 0n) > 0 && (
                <StatsTooltipRow
                  label={
                    <div>
                      <div>{t`Price Impact`}:</div>
                      <div>
                        (
                        <span className="numbers">
                          {formatPercentage(p.swapPriceImpact?.precisePercentage, {
                            bps: false,
                            displayDecimals: 3,
                          })}
                        </span>{" "}
                        of {operationText} amount)
                      </div>
                    </div>
                  }
                  value={formatDeltaUsd(p.swapPriceImpact?.deltaUsd)!}
                  valueClassName="numbers"
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(
                    p.swapPriceImpact === undefined ? undefined : p.swapPriceImpact.deltaUsd
                  )}
                />
              )}

              {p.swapFee && (
                <>
                  <StatsTooltipRow
                    label={
                      <div>
                        <div>{p.operation === Operation.Deposit ? t`Buy Fee` : t`Sell Fee`}:</div>
                        <div>
                          (
                          <span className="numbers">
                            {formatPercentage(p.swapFee.precisePercentage, {
                              bps: false,
                              displayDecimals: 3,
                            })}
                          </span>{" "}
                          of {operationText} amount)
                        </div>
                      </div>
                    }
                    value={formatDeltaUsd(p.swapFee.deltaUsd)!}
                    valueClassName="numbers"
                    showDollar={false}
                    textClassName={getPositiveOrNegativeClass(p.swapFee.deltaUsd)}
                  />
                </>
              )}

              {bigMath.abs(p.uiFee?.deltaUsd ?? 0n) > 0 && (
                <StatsTooltipRow
                  label={
                    <div>
                      <div>{t`UI Fee`}:</div>
                      <div>
                        (
                        <span className="numbers">
                          {formatPercentage(p.uiFee?.precisePercentage, {
                            bps: false,
                            displayDecimals: 3,
                          })}
                        </span>{" "}
                        of {operationText} amount)
                      </div>
                    </div>
                  }
                  value={formatDeltaUsd(p.uiFee?.deltaUsd)!}
                  valueClassName="numbers"
                  showDollar={false}
                  textClassName="text-red-500"
                />
              )}

              {p.shiftFee !== undefined && (
                <StatsTooltipRow
                  label={
                    <div>
                      <div>{t`Shift Fee`}:</div>
                      <div>
                        (
                        <span className="numbers">
                          {formatPercentage(p.shiftFee.precisePercentage, {
                            bps: false,
                            displayDecimals: 3,
                          })}
                        </span>{" "}
                        of {operationText} amount)
                      </div>
                    </div>
                  }
                  value={formatDeltaUsd(p.shiftFee.deltaUsd)!}
                  valueClassName="numbers"
                  showDollar={false}
                />
              )}
            </div>
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
    totalFeesUsd,
  ]);

  return <SyntheticsInfoRow label={<Trans>Price Impact / Fees</Trans>} value={value} />;
}
