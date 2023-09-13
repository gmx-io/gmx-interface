import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ExecutionFee, FeeItem } from "domain/synthetics/fees";
import { formatDeltaUsd, formatTokenAmountWithUsd } from "lib/numbers";
import "./GmFees.scss";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  executionFee?: ExecutionFee;
  isDeposit: boolean;
};

export function GmFees(p: Props) {
  const totalFeesUsd = p.totalFees?.deltaUsd.sub(p.executionFee?.feeUsd || 0);

  return (
    <ExchangeInfoRow
      label={<Trans>Fees and Price Impact</Trans>}
      value={
        <>
          {!p.totalFees?.deltaUsd && "-"}
          {p.totalFees?.deltaUsd && (
            <Tooltip
              className="GmFees-tooltip"
              handle={<span className={cx({ positive: totalFeesUsd?.gt(0) })}>{formatDeltaUsd(totalFeesUsd)}</span>}
              position="right-top"
              renderContent={() => (
                <div>
                  {p.swapPriceImpact?.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      label={t`Price Impact`}
                      value={formatDeltaUsd(p.swapPriceImpact.deltaUsd, p.swapPriceImpact.bps)!}
                      showDollar={false}
                      className={p.swapPriceImpact.deltaUsd.gte(0) ? "text-green" : "text-red"}
                    />
                  )}

                  {p.swapFee && (
                    <>
                      <StatsTooltipRow
                        label={p.isDeposit ? t`Buy Fee` : t`Sell Fee`}
                        value={formatDeltaUsd(p.swapFee.deltaUsd, p.swapFee.bps)!}
                        showDollar={false}
                        className={p.swapFee.deltaUsd.gte(0) ? "text-green" : "text-red"}
                      />
                    </>
                  )}

                  {p.executionFee && (
                    <StatsTooltipRow
                      label={t`Max Execution Fee`}
                      value={formatTokenAmountWithUsd(
                        p.executionFee.feeTokenAmount.mul(-1),
                        p.executionFee.feeUsd.mul(-1),
                        p.executionFee.feeToken.symbol,
                        p.executionFee.feeToken.decimals
                      )}
                      showDollar={false}
                      className="text-red"
                    />
                  )}
                </div>
              )}
            />
          )}
        </>
      }
    />
  );
}
