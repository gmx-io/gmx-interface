import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo } from "react";

import { FeeItem } from "domain/synthetics/fees";
import { formatDeltaUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import "./GmFees.scss";
import { bigMath } from "lib/bigmath";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
  isDeposit: boolean;
};

export function GmFees(p: Props) {
  const totalFeesUsd = p.totalFees?.deltaUsd;

  let value: ReactNode = useMemo(() => {
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
                  label={t`Price Impact`}
                  value={formatDeltaUsd(p.swapPriceImpact?.deltaUsd, p.swapPriceImpact?.bps)!}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(
                    p.swapPriceImpact === undefined ? undefined : p.swapPriceImpact.deltaUsd
                  )}
                />
              )}

              {p.swapFee && (
                <>
                  <StatsTooltipRow
                    label={p.isDeposit ? t`Buy Fee` : t`Sell Fee`}
                    value={formatDeltaUsd(p.swapFee.deltaUsd, p.swapFee.bps)!}
                    showDollar={false}
                    textClassName={getPositiveOrNegativeClass(p.swapFee.deltaUsd)}
                  />
                </>
              )}

              {bigMath.abs(p.uiFee?.deltaUsd ?? 0n) > 0 && (
                <StatsTooltipRow
                  label={
                    <>
                      <Trans>UI Fee</Trans>:
                    </>
                  }
                  value={formatDeltaUsd(p.uiFee?.deltaUsd, p.uiFee?.bps)!}
                  showDollar={false}
                  textClassName="text-red-500"
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
  }, [p.isDeposit, p.swapFee, p.swapPriceImpact, p.totalFees?.deltaUsd, p.uiFee?.bps, p.uiFee?.deltaUsd, totalFeesUsd]);

  return <ExchangeInfoRow label={<Trans>Fees and Price Impact</Trans>} value={value} />;
}
