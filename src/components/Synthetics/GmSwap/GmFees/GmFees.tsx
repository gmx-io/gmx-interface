import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { FeeItem } from "domain/synthetics/fees";
import { formatDeltaUsd } from "lib/numbers";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
};

export function GmFees(p: Props) {
  const shoudlBreakSwapFeeSection = p.swapFee?.deltaUsd.abs().gt(0) && p.swapPriceImpact?.deltaUsd.abs().gt(0);

  return (
    <ExchangeInfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <>
          {(!p.totalFees?.deltaUsd || p.totalFees.deltaUsd.eq(0)) && "-"}
          {p.totalFees?.deltaUsd && (
            <Tooltip
              handle={
                <span className={cx({ positive: p.totalFees.deltaUsd.gt(0) })}>
                  {formatDeltaUsd(p.totalFees.deltaUsd, p.totalFees.bps)}
                </span>
              }
              position="right-top"
              renderContent={() => (
                <div>
                  {p.swapPriceImpact?.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      label={t`Swap price impact`}
                      value={formatDeltaUsd(p.swapPriceImpact.deltaUsd, p.swapPriceImpact.bps)!}
                      showDollar={false}
                    />
                  )}

                  {shoudlBreakSwapFeeSection && <br />}

                  {p.swapFee && (
                    <>
                      <StatsTooltipRow
                        label={t`Swap Fee`}
                        value={formatDeltaUsd(p.swapFee.deltaUsd, p.swapFee.bps)!}
                        showDollar={false}
                      />
                    </>
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
