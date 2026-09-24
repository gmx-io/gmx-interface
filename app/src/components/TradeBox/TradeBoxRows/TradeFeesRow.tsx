import './TradeFeesRow.scss';

import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { BN_ONE, BN_ZERO } from '@/config/constants';
import { FeeItem, SwapFeeItem, TradeFeesType } from '@/selectors/fee/types';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { getPositiveOrNegativeClass } from '@/utils/legacy/common';
import { formatUsd } from '@/utils/legacy/format';
import { getTokenData } from '@/utils/token/getTokenData';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import cx from 'classnames';
import { ReactNode, useMemo } from 'react';

type Props = {
  totalFees?: FeeItem;
  shouldShowRebate?: boolean;
  swapFees?: SwapFeeItem[];
  swapProfitFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionFee?: FeeItem;
  gtRewards?: FeeItem;
  positionPriceImpact?: FeeItem;
  priceImpactDiff?: FeeItem;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  borrowFeeRateStr?: string;
  fundingFeeRateStr?: string;
  feeDiscount?: FeeItem;
  isTop?: boolean;
  feesType: TradeFeesType | null;
};

type FeeRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  className?: string;
};

export function TradeFeesRow(p: Props) {
  const TokensData = useAppStore(selectTokensData);

  const gtRewardsUsd = p.gtRewards?.deltaUsd;

  const feeRows: FeeRow[] = useMemo(() => {
    // TODO: check if price impact bps is undefined or zero
    const swapPriceImpactRow =
      p.swapPriceImpact?.deltaUsd === undefined ||
      p.swapPriceImpact.deltaUsd.isZero() ||
      p.swapPriceImpact.bps === 0
        ? undefined
        : {
            id: 'swapPriceImpact',
            label: (
              <>
                <div className="text-white">{t`Swap Price Impact`}:</div>
                {/* <div>
                  (
                  {formatPercentage(Math.abs(p.swapPriceImpact.bps), 2, {
                    fallbackToZero: true,
                  })}
                  of swap amount)
                </div> */}
              </>
            ),
            value: formatUsd(p.swapPriceImpact.deltaUsd),
            className: getPositiveOrNegativeClass(
              p.swapPriceImpact.deltaUsd,
              'text-green-500'
            ),
          };

    const swapFeeRows: FeeRow[] =
      p.swapFees?.map((swap) => ({
        id: `swap-${swap.tokenInAddress}-${swap.tokenOutAddress}`,
        label: (
          <>
            <div className="text-white">
              {t`Swap ${getTokenData(TokensData, swap.tokenInAddress)?.symbol} to ${
                getTokenData(TokensData, swap.tokenOutAddress)?.symbol
              }`}
              :
            </div>
            {/* <div>
              (
              {formatPercentage(Math.abs(swap.bps), 2, {
                fallbackToZero: true,
              })}
              of swap amount)
            </div> */}
          </>
        ),
        value: formatUsd(swap.deltaUsd),
        className: getPositiveOrNegativeClass(swap.deltaUsd, 'text-green-500'),
      })) || [];

    const swapProfitFeeRow = (
      p.swapProfitFee?.deltaUsd === undefined
        ? undefined
        : !p.swapProfitFee.deltaUsd.isZero()
    )
      ? {
          id: 'swapProfitFee',
          label: (
            <>
              <div className="text-white">{t`Swap Profit Fee`}:</div>
              {/* <div>
                (
                {formatPercentage(
                  p.swapProfitFee?.bps === undefined
                    ? undefined
                    : Math.abs(p.swapProfitFee.bps),
                  2,
                  { fallbackToZero: true }
                )}{' '}
                of collateral)
              </div> */}
            </>
          ),
          value: formatUsd(p.swapProfitFee?.deltaUsd),
          className: getPositiveOrNegativeClass(
            p.swapProfitFee?.deltaUsd,
            'text-green-500'
          ),
        }
      : undefined;

    const feesTypeName = p.feesType === 'increase' ? t`Open Fee` : t`Close Fee`;
    const positionFeeRow = (
      p.positionFee?.deltaUsd === undefined
        ? undefined
        : !p.positionFee.deltaUsd.isZero()
    )
      ? {
          id: 'positionFee',
          label: (
            <>
              <div className="text-white">{feesTypeName}:</div>
              {/* <div>
                ({formatPercentage(Math.abs(p.positionFee!.bps))} of position
                size)
              </div> */}
            </>
          ),
          value: formatUsd(p.positionFee?.deltaUsd),
          className: getPositiveOrNegativeClass(
            p.positionFee?.deltaUsd,
            'text-green-500'
          ),
        }
      : undefined;

    const gtRewardsRow = (
      p.gtRewards === undefined ? undefined : !p.gtRewards.deltaUsd.isZero()
    )
      ? {
          id: 'gtRewards',
          label: (
            <>
              <div className="text-white">{t`GT Rewards`}:</div>
            </>
          ),
          value: formatUsd(gtRewardsUsd, {
            signed: true,
          }),
          className: 'text-green-500',
        }
      : undefined;
    const feeDiscountRow = (
      p.feeDiscount === undefined ? undefined : !p.feeDiscount.deltaUsd.isZero()
    )
      ? {
          id: 'feeDiscount',
          label: (
            <div className="text-white">
              <Trans>Fee Discount</Trans>:
            </div>
          ),
          value: formatUsd(p.feeDiscount?.deltaUsd, {
            signed: true,
          }),
          className: 'text-green-500',
        }
      : undefined;

    const borrowFeeRow =
      p.borrowFee &&
      (p.borrowFee?.deltaUsd === undefined
        ? undefined
        : !p.borrowFee.deltaUsd.isZero())
        ? {
            id: 'borrowFee',
            label: (
              <>
                <div className="text-white">{t`Borrowing Fee`}:</div>
                {/* <div>
                  (
                  {formatPercentage(Math.abs(p.borrowFee.bps), 2, {
                    fallbackToZero: true,
                  })}
                  of collateral)
                </div> */}
              </>
            ),
            value: formatUsd(p.borrowFee.deltaUsd),
            className: getPositiveOrNegativeClass(
              p.borrowFee.deltaUsd,
              'text-green-500'
            ),
          }
        : undefined;

    const fundingFeeRow =
      p.fundingFee &&
      (p.fundingFee?.deltaUsd === undefined
        ? undefined
        : !p.fundingFee.deltaUsd.isZero())
        ? {
            id: 'fundingFee',
            label: (
              <>
                <div className="text-white">{t`Funding Fee`}:</div>
                {/* <div>
                  (
                  {formatPercentage(Math.abs(p.fundingFee.bps), 2, {
                    fallbackToZero: true,
                  })}
                  of collateral)
                </div> */}
              </>
            ),
            value: formatUsd(p.fundingFee.deltaUsd),
            className: getPositiveOrNegativeClass(
              p.fundingFee.deltaUsd,
              'text-green-500'
            ),
          }
        : undefined;

    const borrowFeeRateRow = p.borrowFeeRateStr
      ? {
          id: 'borrowFeeRate',
          label: <div className="text-white">{t`Borrowing Fee Rate`}:</div>,
          value: p.borrowFeeRateStr,
          className: p.borrowFeeRateStr?.startsWith('-')
            ? 'text-red-500'
            : 'text-green-500',
        }
      : undefined;

    const fundingFeeRateRow = p.fundingFeeRateStr
      ? {
          id: 'fundingFeeRate',
          label: <div className="text-white">{t`Funding Fee Rate`}:</div>,
          value: p.fundingFeeRateStr,
          className: p.fundingFeeRateStr?.startsWith('-')
            ? 'text-red-500'
            : 'text-green-500',
        }
      : undefined;

    if (p.feesType === 'swap') {
      return [swapPriceImpactRow, ...swapFeeRows].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === 'increase') {
      return [
        swapPriceImpactRow,
        ...swapFeeRows,

        borrowFeeRow,
        fundingFeeRow,
        borrowFeeRateRow,
        fundingFeeRateRow,
        positionFeeRow,
        feeDiscountRow,
        gtRewardsRow,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === 'decrease') {
      return [
        swapPriceImpactRow,
        borrowFeeRow,
        fundingFeeRow,

        swapProfitFeeRow,
        ...swapFeeRows,
        positionFeeRow,
        feeDiscountRow,
        gtRewardsRow,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === 'edit') {
      return [borrowFeeRow, fundingFeeRow].filter(Boolean) as FeeRow[];
    }
    return [];
  }, [
    p.swapPriceImpact,
    p.swapFees,
    p.swapProfitFee?.deltaUsd,
    p.feesType,
    p.positionFee,
    p.feeDiscount,
    p.borrowFee,
    p.fundingFee,
    p.borrowFeeRateStr,
    p.fundingFeeRateStr,
    TokensData,
    gtRewardsUsd,
    p.gtRewards,
  ]);

  const positiveRemainder = gtRewardsUsd?.isZero() ? BN_ZERO : BN_ONE;

  const totalFeeUsd = useMemo(() => {
    return p.totalFees?.deltaUsd
      .add(p.feeDiscount?.deltaUsd ?? BN_ZERO)
      .add(p.gtRewards?.deltaUsd ?? BN_ZERO)
      .add(positiveRemainder);
  }, [
    p.totalFees?.deltaUsd,
    p.feeDiscount?.deltaUsd,
    p.gtRewards?.deltaUsd,
    positiveRemainder,
  ]);

  const title = t`Fees`;

  const swapRouteMsg = useMemo(() => {
    if (p.swapFees && p.swapFees.length <= 2) return;
    return (
      <>
        <br />
        <Trans>
          This swap is routed through several GM pools for the lowest possible
          fees and price impact.
        </Trans>
      </>
    );
  }, [p.swapFees]);

  const value: ReactNode = useMemo(() => {
    if (totalFeeUsd === undefined) {
      return '-';
    } else if (!feeRows.length) {
      return (
        <span className={cx({ positive: totalFeeUsd.gt(BN_ZERO) })}>
          {formatUsd(totalFeeUsd, {
            fallbackToZero: true,
          })}
        </span>
      );
    } else {
      return (
        <TooltipWithPortal
          className="TradeFeesRow-tooltip"
          handle={
            <span className={cx({ positive: totalFeeUsd.gt(BN_ZERO) })}>
              {formatUsd(totalFeeUsd, {
                fallbackToZero: true,
              })}
            </span>
          }
          position="top-end"
          renderContent={() => (
            <div>
              {feeRows.map((feeRow) => (
                <StatsTooltipRow
                  key={feeRow.id}
                  textClassName={feeRow.className}
                  label={feeRow.label}
                  value={feeRow.value}
                  showDollar={false}
                />
              ))}
              {swapRouteMsg}
            </div>
          )}
        />
      );
    }
  }, [feeRows, totalFeeUsd, swapRouteMsg]);

  return (
    <ExchangeInfoRow
      className="TradeFeesRow"
      isTop={p.isTop}
      label={title}
      value={value}
    />
  );
}
