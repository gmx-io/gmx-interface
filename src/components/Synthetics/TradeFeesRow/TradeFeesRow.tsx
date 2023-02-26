import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getToken } from "config/tokens";
import { FeeItem, SwapFeeItem } from "domain/synthetics/fees";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatPercentage } from "lib/numbers";
import "./TradeFeesRow.scss";

type Props = {
  totalFees?: FeeItem;
  swapFees?: SwapFeeItem[];
  swapPriceImpact?: FeeItem;
  positionFee?: FeeItem;
  positionPriceImpact?: FeeItem;
  positionFeeFactor?: BigNumber;
};

export function TradeFeesRow(p: Props) {
  const { chainId } = useChainId();

  return (
    <ExchangeInfoRow
      label={<Trans>Fees and price impact</Trans>}
      value={
        <>
          {(!p.totalFees?.deltaUsd || p.totalFees.deltaUsd.eq(0)) && "-"}
          {p.totalFees?.deltaUsd && (
            <Tooltip
              className="TradeFeesRow-tooltip"
              handle={
                <span className={cx({ positive: p.totalFees.deltaUsd.gt(0) })}>
                  {formatDeltaUsd(p.totalFees.deltaUsd)}
                </span>
              }
              position="right-top"
              renderContent={() => (
                <div>
                  {p.positionPriceImpact?.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      className="TradeFeesRow-fee-row"
                      label={
                        <>
                          <div>{t`Price impact`}:</div>
                          <div>({formatPercentage(p.positionPriceImpact.bps.abs())} of position size)</div>
                        </>
                      }
                      value={formatDeltaUsd(p.positionPriceImpact.deltaUsd)!}
                      showDollar={false}
                    />
                  )}

                  {p.swapPriceImpact?.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      className="TradeFeesRow-fee-row"
                      label={
                        <>
                          <div>{t`Swap price impact`}:</div>
                          <div>({formatPercentage(p.swapPriceImpact.bps.abs())} of swap amount)</div>
                        </>
                      }
                      value={formatDeltaUsd(p.swapPriceImpact.deltaUsd)!}
                      showDollar={false}
                    />
                  )}

                  {p.swapFees?.map((swap, i) => (
                    <>
                      <StatsTooltipRow
                        className="TradeFeesRow-fee-row"
                        key={`${swap.tokenInAddress}-${swap.tokenOutAddress}`}
                        label={
                          <>
                            <div>
                              {t`Swap ${getToken(chainId, swap.tokenInAddress).symbol} to ${
                                getToken(chainId, swap.tokenOutAddress).symbol
                              }`}
                              :
                            </div>
                            <div>({formatPercentage(swap.bps.abs())} of swap amount)</div>
                          </>
                        }
                        value={formatDeltaUsd(swap.deltaUsd)!}
                        showDollar={false}
                      />
                    </>
                  ))}

                  {p.positionFee && (
                    <>
                      <StatsTooltipRow
                        className="TradeFeesRow-fee-row"
                        label={
                          <>
                            <div>{t`Position Fee`}:</div>
                            <div>({formatPercentage(p.positionFee.bps.abs())} of position size)</div>
                          </>
                        }
                        value={formatDeltaUsd(p.positionFee.deltaUsd)!}
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
