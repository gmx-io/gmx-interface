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
    if (!p.totalFees?.deltaUsd) {
      return "-";
    } else if (p.swapPriceImpact?.deltaUsd.abs().gt(0) || p.swapFee || p.uiFee?.deltaUsd.abs()?.gt(0)) {
      return (
        <Tooltip
          className="GmFees-tooltip"
          handle={<span className={cx({ positive: totalFeesUsd?.gt(0) })}>{formatDeltaUsd(totalFeesUsd)}</span>}
          position="top-end"
          renderContent={() => (
            <div>
              {p.swapPriceImpact?.deltaUsd.abs().gt(0) && (
                <StatsTooltipRow
                  label={t`Price Impact`}
                  value={formatDeltaUsd(p.swapPriceImpact.deltaUsd, p.swapPriceImpact.bps)!}
                  showDollar={false}
                  textClassName={getPositiveOrNegativeClass(p.swapPriceImpact.deltaUsd)}
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

              {p.uiFee?.deltaUsd.abs()?.gt(0) && (
                <StatsTooltipRow
                  label={
                    <>
                      <Trans>UI Fee</Trans>:
                    </>
                  }
                  value={formatDeltaUsd(p.uiFee.deltaUsd, p.uiFee.bps)!}
                  showDollar={false}
                  textClassName="text-red-500"
                />
              )}
            </div>
          )}
        />
      );
    }
    return <span className={cx({ positive: totalFeesUsd?.gt(0) })}>{formatDeltaUsd(totalFeesUsd)}</span>;
  }, [
    p.isDeposit,
    p.swapFee,
    p.swapPriceImpact?.bps,
    p.swapPriceImpact?.deltaUsd,
    p.totalFees?.deltaUsd,
    p.uiFee?.bps,
    p.uiFee?.deltaUsd,
    totalFeesUsd,
  ]);

  return <ExchangeInfoRow label={<Trans>Fees and Price Impact</Trans>} value={value} />;
}
