import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { BN_ZERO } from '@/config/constants';
import { HIGH_COLLATERAL_IMPACT_BPS } from '@/config/factors';
import { TradeFees } from '@/selectors/fee/types';
import { OrderType } from '@/selectors/order/types';
import { TradeFlags } from '@/selectors/trade/types';
import { getPositiveOrNegativeClass } from '@/utils/legacy/common';
import { formatUsd } from '@/utils/legacy/format';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import { memo, useMemo } from 'react';

interface Props {
  tradeFlags: TradeFlags;
  displayDecimals?: number;
  fees?: TradeFees;
  executionPrice?: BN;
  acceptablePrice?: BN;
  orderType?: OrderType;
  triggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
}

export const ExecutionPriceRow = memo(function ExecutionPriceRow({
  fees,
  executionPrice,
  tradeFlags,
  acceptablePrice,
  orderType,
  triggerOrderType,
  displayDecimals,
}: Props) {
  const { isLimit, isIncrease, isLong } = tradeFlags;

  const resolvedOrderType = useMemo(() => {
    if (orderType) {
      return orderType;
    }

    if (triggerOrderType) {
      return triggerOrderType;
    }

    if (isIncrease) {
      return isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease;
    }

    return OrderType.MarketDecrease;
  }, [orderType, triggerOrderType, isIncrease, isLimit]);

  const acceptablePriceDisplay = useMemo(() => {
    if (acceptablePrice === undefined) {
      return undefined;
    }

    return formatAcceptablePriceDisplay({
      orderType: resolvedOrderType,
      isLong,
      isIncrease,
      acceptablePrice,
      displayDecimals,
    });
  }, [
    acceptablePrice,
    resolvedOrderType,
    isLong,
    isIncrease,
    displayDecimals,
  ]);

  const fullPositionPriceImpactBps =
    fees?.positionPriceImpact?.bps !== undefined &&
    fees?.priceImpactDiff?.bps !== undefined
      ? Math.abs(fees.positionPriceImpact.bps) -
        Math.abs(fees.priceImpactDiff.bps)
      : undefined;

  const fullCollateralPriceImpactBps =
    fees?.positionCollateralPriceImpact?.bps !== undefined &&
    fees?.collateralPriceImpactDiff?.bps !== undefined
      ? Math.abs(fees.positionCollateralPriceImpact.bps) -
        Math.abs(fees.collateralPriceImpactDiff.bps)
      : undefined;

  const positionPriceImpactDeltaUsd =
    fees?.positionPriceImpact?.deltaUsd !== undefined &&
    fees?.priceImpactDiff?.deltaUsd !== undefined
      ? fees.positionPriceImpact.deltaUsd.sub(fees.priceImpactDiff.deltaUsd)
      : undefined;

  const handleClassName = useMemo(() => {
    if (
      positionPriceImpactDeltaUsd !== undefined &&
      positionPriceImpactDeltaUsd.gt(BN_ZERO)
    ) {
      return 'text-green-500 !decoration-green-500/50';
    }

    if (
      fullCollateralPriceImpactBps !== undefined &&
      fullCollateralPriceImpactBps < 0 &&
      Math.abs(fullCollateralPriceImpactBps) >= HIGH_COLLATERAL_IMPACT_BPS
    ) {
      return 'text-yellow-500 !decoration-yellow-500/50';
    }

    return '';
  }, [positionPriceImpactDeltaUsd, fullCollateralPriceImpactBps]);

  return (
    <ExchangeInfoRow label={t`Execution Price`}>
      {executionPrice !== undefined ? (
        <TooltipWithPortal
          maxAllowedWidth={350}
          position="bottom-end"
          handleClassName={handleClassName}
          handle={formatUsd(executionPrice, {
            displayDecimals,
          })}
          content={
            <>
              {isLimit
                ? t`Expected execution price for the order, including the current price impact, once the limit order executes.`
                : t`Expected execution price for the order, including the current price impact.`}
              <br />
              {fullPositionPriceImpactBps !== undefined &&
                positionPriceImpactDeltaUsd !== undefined &&
                fullCollateralPriceImpactBps !== undefined && (
                  <>
                    <br />
                    <StatsTooltipRow
                      textClassName={getPositiveOrNegativeClass(
                        positionPriceImpactDeltaUsd
                      )}
                      label={
                        <>
                          <div className="text-white">{t`Price Impact`}:</div>
                        </>
                      }
                      value={formatUsd(positionPriceImpactDeltaUsd)}
                      showDollar={false}
                    />
                  </>
                )}

              {fees?.priceImpactDiff !== undefined &&
                fees.priceImpactDiff.deltaUsd.abs().gt(BN_ZERO) && (
                  <>
                    <StatsTooltipRow
                      textClassName={getPositiveOrNegativeClass(
                        fees.priceImpactDiff.deltaUsd
                      )}
                      label={
                        <>
                          <div className="text-white">
                            {t`Price Impact Rebates`}:
                          </div>
                        </>
                      }
                      value={formatUsd(fees.priceImpactDiff.deltaUsd)}
                      showDollar={false}
                    />
                  </>
                )}

              {acceptablePriceDisplay !== undefined &&
                acceptablePriceDisplay !== '-' && (
                  <>
                    <StatsTooltipRow
                      labelClassName="text-white"
                      label={t`Order Acceptable Price`}
                      value={acceptablePriceDisplay}
                      showDollar={false}
                    />
                  </>
                )}

              {fees?.priceImpactDiff !== undefined &&
                fees.priceImpactDiff.deltaUsd.abs().gt(BN_ZERO) &&
                !isIncrease && (
                  <>
                    <br />
                    <Trans>
                      Price impact rebates for closing trades are claimable
                      under the claims tab.
                    </Trans>
                  </>
                )}
            </>
          }
        />
      ) : (
        '-'
      )}
    </ExchangeInfoRow>
  );
});
