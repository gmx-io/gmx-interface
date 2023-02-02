import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { InfoRow } from "components/InfoRow/InfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getToken } from "config/tokens";
import { FeeItem, TotalSwapFees } from "domain/synthetics/fees";
import { useChainId } from "lib/chains";
import { formatDeltaUsd } from "lib/numbers";
import "./TradeFeesRow.scss";

type Props = {
  totalFees?: FeeItem;
  swapFees?: TotalSwapFees;
  positionFee?: FeeItem;
  positionPriceImpact?: FeeItem;
};

export function TradeFeesRow(p: Props) {
  const { chainId } = useChainId();

  return (
    <InfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <>
          {(!p.totalFees?.deltaUsd || p.totalFees.deltaUsd.eq(0)) && "-"}
          {p.totalFees?.deltaUsd && (
            <Tooltip
              className="TradeFeesRow-tooltip"
              handle={
                <span className={cx({ positive: p.totalFees.deltaUsd.gt(0) })}>
                  {formatDeltaUsd(p.totalFees.deltaUsd, p.totalFees.bps)}
                </span>
              }
              position="right-top"
              renderContent={() => (
                <div>
                  {p.positionPriceImpact && (
                    <StatsTooltipRow
                      label={t`Price impact`}
                      value={formatDeltaUsd(p.positionPriceImpact.deltaUsd, p.positionPriceImpact.bps)!}
                      showDollar={false}
                    />
                  )}

                  {p.swapFees?.totalPriceImpact.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      label={t`Swap price impact`}
                      value={formatDeltaUsd(p.swapFees.totalPriceImpact.deltaUsd, p.swapFees.totalPriceImpact.bps)!}
                      showDollar={false}
                    />
                  )}

                  {p.swapFees?.swapFees.map((swap) => (
                    <>
                      <br />
                      <StatsTooltipRow
                        key={`${swap.tokenInAddress}-${swap.tokenOutAddress}`}
                        label={t`Swap ${getToken(chainId, swap.tokenInAddress).symbol} to ${
                          getToken(chainId, swap.tokenOutAddress).symbol
                        }`}
                        value={formatDeltaUsd(swap.deltaUsd, swap.bps)!}
                        showDollar={false}
                      />
                    </>
                  ))}

                  {p.positionFee && (
                    <>
                      <br />
                      <StatsTooltipRow
                        label={t`Position fee`}
                        value={formatDeltaUsd(p.positionFee.deltaUsd, p.positionFee.bps)!}
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
