import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo } from "react";

import { FeeItem } from "domain/synthetics/fees";
import { formatDeltaUsd, formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import "./GmFees.scss";
import { bigMath } from "lib/bigmath";
import { Operation } from "../GmSwapBox/types";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
  shiftFee?: FeeItem;
  operation: Operation;
};

const operationTexts = {
  [Operation.Deposit]: t`buy`,
  [Operation.Withdrawal]: t`sell`,
  [Operation.Shift]: t`shift`,
};

export function GmFees(p: Props) {
  const totalFeesUsd = p.totalFees?.deltaUsd;

  let value: ReactNode = useMemo(() => {
    const operationText = operationTexts[p.operation];

    if (p.totalFees?.deltaUsd === undefined) {
      return "-";
    } else if (
      bigMath.abs(p.swapPriceImpact?.deltaUsd ?? 0n) > 0 ||
      p.swapFee ||
      bigMath.abs(p.uiFee?.deltaUsd ?? 0n) > 0
    ) {
      return (
        <Tooltip
          className="GmFees-tooltip"
          handle={
            <span className={cx({ positive: totalFeesUsd !== undefined && totalFeesUsd > 0 })}>
              {formatDeltaUsd(totalFeesUsd)}
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
                        {formatPercentage(p.swapPriceImpact?.precisePercentage, {
                          bps: false,
                          displayDecimals: 3,
                        })}{" "}
                        of {operationText} amount)
                      </div>
                    </div>
                  }
                  value={formatDeltaUsd(p.swapPriceImpact?.deltaUsd)!}
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
                          {formatPercentage(p.swapFee.precisePercentage, {
                            bps: false,
                            displayDecimals: 3,
                          })}{" "}
                          of {operationText} amount)
                        </div>
                      </div>
                    }
                    value={formatDeltaUsd(p.swapFee.deltaUsd)!}
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
                        {formatPercentage(p.uiFee?.precisePercentage, {
                          bps: false,
                          displayDecimals: 3,
                        })}{" "}
                        of {operationText} amount)
                      </div>
                    </div>
                  }
                  value={formatDeltaUsd(p.uiFee?.deltaUsd)!}
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
                        {formatPercentage(p.shiftFee.precisePercentage, {
                          bps: false,
                          displayDecimals: 3,
                        })}{" "}
                        of {operationText} amount)
                      </div>
                    </div>
                  }
                  value={formatDeltaUsd(p.shiftFee.deltaUsd)!}
                  showDollar={false}
                />
              )}
            </div>
          )}
        />
      );
    }
    return (
      <span className={cx({ positive: totalFeesUsd !== undefined && totalFeesUsd > 0 })}>
        {formatDeltaUsd(totalFeesUsd)}
      </span>
    );
  }, [
    p.operation,
    p.shiftFee,
    p.swapFee,
    p.swapPriceImpact,
    p.totalFees?.deltaUsd,
    p.uiFee?.precisePercentage,
    p.uiFee?.deltaUsd,
    totalFeesUsd,
  ]);

  return <ExchangeInfoRow label={<Trans>Fees and Price Impact</Trans>} value={value} />;
}
