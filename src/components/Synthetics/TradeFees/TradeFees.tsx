import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { InfoRow } from "components/InfoRow/InfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getToken } from "config/tokens";
import { FeeItem, TotalSwapFees } from "domain/synthetics/fees";
import { useChainId } from "lib/chains";
import { formatDeltaUsd } from "lib/numbers";

type Props = {
  totalFee?: FeeItem;
  swapFees?: TotalSwapFees;
  positionFee?: FeeItem;
  positionPriceImpact?: FeeItem;
};

export function TradeFees(p: Props) {
  const { chainId } = useChainId();

  return (
    <InfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <>
          {!p.totalFee?.deltaUsd && "-"}
          {p.totalFee?.deltaUsd && (
            <Tooltip
              handle={
                <span className={cx({ positive: p.totalFee.deltaUsd.gt(0) })}>
                  {formatDeltaUsd(p.totalFee.deltaUsd, p.totalFee.bps)}
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

                  {p.swapFees && (
                    <StatsTooltipRow
                      label={t`Swap price impact`}
                      value={formatDeltaUsd(p.swapFees.totalPriceImpact.deltaUsd, p.swapFees.totalPriceImpact.bps)!}
                      showDollar={false}
                    />
                  )}

                  {p.swapFees?.swapFees.map((swap) => (
                    <StatsTooltipRow
                      key={`${swap.tokenInAddress}-${swap.tokenOutAddress}`}
                      label={t`Swap ${getToken(chainId, swap.tokenInAddress).symbol} to ${
                        getToken(chainId, swap.tokenOutAddress).symbol
                      }`}
                      value={formatDeltaUsd(swap.deltaUsd, swap.bps)!}
                      showDollar={false}
                    />
                  ))}

                  {p.positionFee && (
                    <StatsTooltipRow
                      label={t`Position fee`}
                      value={formatDeltaUsd(p.positionFee.deltaUsd, p.positionFee.bps)!}
                      showDollar={false}
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
