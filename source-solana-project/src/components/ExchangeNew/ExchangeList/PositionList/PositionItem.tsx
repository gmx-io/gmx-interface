/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import './PositionItem.scss';
import {
  getGmw235Enabled,
  getGmw330Enabled,
  getGmw385Enabled,
  getGmw421Enabled,
} from '@/config/featureFlagEnable';
import './PositionCard.scss';
import triggerClose from '@/img/ic_triggerclose_16.svg';
import Button from '@/components/Common/Button/Button';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import PositionDropdown from '@/components/Exchange/ExchangeList/PositionList/PositionDropdown';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';
import { TableTd, TableTr } from '@/components/Common/Table/Table';
import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { BN_ZERO, ONE_USD } from '@/config/constants';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import TpDecrease from './components/TpDecrease';
import SlDecrease from './components/SlDecrease';
import LongOrShortLimit from '@/components/ExchangeNew/ExchangeList/OrderList/components/LongOrShortLimit';
import TPSLDialog from './components/TPSLDialog';
import { useTriggerCancelOrder } from '@/hooks/triggerHooks/useTriggerCancelOrder';
import newLinkIcon from '@/img/ic_new_link_20.svg';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import { OrderType, PositionOrderInfo } from '@/selectors/order/types';
import { PositionInfo } from '@/selectors/position/types';
import {
  selectIsPnlInLeverage,
  selectShowPnlAfterFees,
} from '@/selectors/setting/baseSelectors';
import { TradeMode } from '@/selectors/trade/types';
import {
  getPositiveOrNegativeClass,
} from '@/utils/legacy/common';
import {
  formatBalanceAmount,
  formatDeltaUsd,
  formatLeverage,
  formatLiquidationPrice,
  formatPositionEstimatedLiquidationTime,
  formatPriceUsd,
  formatTokenAmount,
  formatUsd,
  formatParseUsdToBN,
} from '@/utils/legacy/format';
import { getAddressUrl } from '@/utils/lib/explorer';
import IconTpClose from '@/img/tp-close.svg?react';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
} from '@/utils/order/isOrderType';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t, Trans } from '@lingui/macro';
import cx from 'classnames';
import { useCallback, useRef, useState } from 'react';
import { FaAngleRight } from 'react-icons/fa';
import { ImSpinner2 } from 'react-icons/im';
import { useMedia } from 'react-use';
import Skeleton from 'react-loading-skeleton';
import { getPositionPendingFeesUsd } from '@/utils/position/getPositionPendingFeesUsd';
import { getBasisPoints } from '@/utils/legacy/common';
import IconTpIncrease from '@/img/tp-increase.svg?react';
import IconTpEdit from '@/img/tp-edit.svg?react';
import { helperNotice, removeNotice } from '@/utils/lib/helperNotice';
import { useShallow } from 'zustand/react/shallow';
import { isMarketOrderShowType } from '@/utils/order/isOrderType';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
export type Props = {
  position: PositionInfo;
  hideActions?: boolean;
  showPnlAfterFees: boolean;
  onClosePositionClick?: (position?: PositionInfo, type?: string) => void;
  onEditCollateralClick?: () => void;
  onShareClick: () => void;
  onSelectPositionClick?: (
    tradeMode?: TradeMode,
    position?: PositionInfo
  ) => void;
  isLarge: boolean;
  openSettings: () => void;
  onOrdersClick?: (key?: string) => void;
  onCancelOrder?: (orderKey: string) => void;
  onEditTPSLOrder?: (position?: PositionInfo, type?: string) => void;
};

type TickerPrice = {
  price: string | number;
  unitPrice: string | number;
  minUnitPrice: string | number;
  maxUnitPrice: string | number;
};

function RenderTpl({
  position,
  onEditTPSLOrder,
}: {
  position: PositionInfo;
  onEditTPSLOrder?: (position?: PositionInfo, type?: string) => void;
}) {
  const tpToken =
    position?.tpToken?.filter((order) => {
      return isMarketOrderShowType(order?.orderType);
    }) || [];
  const slToken =
    position?.slToken?.filter((order) => {
      return isMarketOrderShowType(order?.orderType);
    }) || [];

  const decimals =
    GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.indexToken]?.decimals;

  const tpTokentMaxPrice =
    tpToken.length > 0 &&
    formatPriceUsd(
      formatParseUsdToBN('1', decimals).mul(tpToken[0]?.triggerPrice),
      {
        fallbackToZero: true,
        showDollarSign: false,
        isDisplayDecimals:
          GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
            position?.marketInfo?.indexToken
          ),
      }
    );
  const slTokenMaxPrice =
    slToken.length > 0 &&
    formatPriceUsd(
      formatParseUsdToBN('1', decimals).mul(slToken[0]?.triggerPrice),
      {
        fallbackToZero: true,
        showDollarSign: false,
        isDisplayDecimals:
          GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
            position?.marketInfo?.indexToken
          ),
      }
    );

  return (
    <div className="tg-box">
      <div>
        <p className="positive">
          {tpToken?.length > 0
            ? `${tpTokentMaxPrice}（${tpToken?.length}）`
            : '-'}
        </p>
        <p className="negative">
          {slToken?.length > 0
            ? `${slTokenMaxPrice}（${slToken?.length}）`
            : '-'}
        </p>
      </div>
      <div>
        {(tpToken?.length > 0 || slToken?.length > 0) && (
          <div
            className="flex cursor-pointer items-center justify-center p-1"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onEditTPSLOrder?.(position, 'edit');
            }}
          >
            <IconTpEdit fill="" className="h-[1.6rem] w-[1.6rem]" />
          </div>
        )}
        {!tpToken?.length && !slToken?.length && (
          <IconTpIncrease
            fill="none"
            stroke="currentColor"
            className="ml-[0.9rem] h-[1.6rem] w-[1.6rem] cursor-pointer"
            onClick={() => {
              onEditTPSLOrder?.(position, 'new');
            }}
          />
        )}
      </div>
    </div>
  );
}

export function PositionItem(p: Props) {
  // const shouldDisablePosition = false
  const isCurrentMarket = false;
  const showDebugValues = false;
  const { marketInfo } = p.position;
  const positionIndexTokenAddress =
    typeof marketInfo?.indexToken === 'string'
      ? marketInfo.indexToken
      : marketInfo?.indexToken?.address?.toBase58();

  const isScreen1024 = useMedia('(max-width: 1024px)');
  const savedShowPnlAfterFees = useAppStore(selectShowPnlAfterFees);
  const isPnlInLeverage = useAppStore(selectIsPnlInLeverage);
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );
  const lastTokenPriceMapRef = useRef(new Map<string, TickerPrice>());
  const getStableTokenPrice = useCallback(
    (tokenAddress?: string) => {
      if (!tokenAddress) return undefined;
      const tokenPrice = tokenPriceMap.get(tokenAddress);
      if (tokenPrice) {
        lastTokenPriceMapRef.current.set(tokenAddress, tokenPrice);
        return tokenPrice;
      }
      return lastTokenPriceMapRef.current.get(tokenAddress);
    },
    [tokenPriceMap]
  );
  const { trigger: triggerCancelOrder } = useTriggerCancelOrder();
  const [showTpDecrease, setShowTpDecrease] = useState(false);
  const [showSlDecrease, setShowSlDecrease] = useState(false);
  const [showLongOrShortLimit, setShowLongOrShortLimit] = useState(false);
  const [showTPSLDialog, setShowTPSLDialog] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PositionOrderInfo | null>(
    null
  );

  const handleOrderClick = (order: PositionOrderInfo) => {
    setCurrentOrder(order);
    if (order.orderType === OrderType.LimitIncrease) {
      setShowLongOrShortLimit(true);
    } else if (order.orderType === OrderType.LimitDecrease) {
      setShowTpDecrease(true);
    } else if (order.orderType === OrderType.StopLossDecrease) {
      setShowSlDecrease(true);
    }
  };

  const cancelOrderForCard = useCallback(
    async (orderAddress: string, skipPreflight?: boolean) => {
      if (!orderAddress) return;
      try {
        await triggerCancelOrder({
          skipPreflight: skipPreflight ?? false,
          orderAddress,
        });
      } catch {
        helperNotice.error(t`Failed to cancel order.`);
      }
    },
    [triggerCancelOrder]
  );

  const cancelOrderForTable = useCallback(
    async (orderAddress: string, skipPreflight?: boolean) => {
      if (!orderAddress) return;
      const noticeId = getGmw421Enabled()
        ? 0
        : helperNotice.info(t`Canceling order...`);
      try {
        await triggerCancelOrder({
          skipPreflight: skipPreflight ?? false,
          orderAddress,
        });
        if (noticeId) removeNotice(noticeId);
        helperNotice.success(t`Order canceled.`);
      } catch {
        if (noticeId) removeNotice(noticeId);
        helperNotice.error(t`Failed to cancel order.`);
      }
    },
    [triggerCancelOrder]
  );

  const pendingBorrowingFeeValue = new BN(
    p?.position?.pending_borrowing_fee_value?.toString()
  );
  const pendingFundingFeeValue = new BN(
    p?.position?.pending_funding_fee_value?.toString()
  );
  // pending borrowing fees are negative (accrued negative borrowing fees)
  const pendingBorrowingFeesUsd = pendingBorrowingFeeValue.abs();
  // pending funding fees are negative (accrued negative funding fees)
  const pendingFundingFeesUsd = pendingFundingFeeValue.abs();

  const collateralValue = new BN(p?.position?.collateral_value?.toString());
  const pendingPnl = new BN(p?.position?.pending_pnl?.toString());
  const liquidationPrice = new BN(p?.position?.liquidation_price?.toString());

  const totalPendingFeesUsd = getPositionPendingFeesUsd({
    pendingBorrowingFeesUsd: pendingBorrowingFeesUsd,
    pendingFundingFeesUsd: pendingFundingFeesUsd,
  });

  const pnlAfterFees = pendingPnl
    .sub(totalPendingFeesUsd)
    .sub(new BN(p?.position?.close_order_fee_value?.toString()));
  const pnlAfterFeesPercentage =
    collateralValue && !collateralValue?.isZero()
      ? getBasisPoints(
        pnlAfterFees,
        collateralValue.add(
          new BN(p?.position?.close_order_fee_value?.toString())
        )
      )
      : 0;
  const pnlPercentage =
    collateralValue && !collateralValue?.isZero()
      ? getBasisPoints(pendingPnl, collateralValue)
      : 0;

  const displayedPnl = savedShowPnlAfterFees ? pnlAfterFees : pendingPnl;

  const displayedPnlPercentage = savedShowPnlAfterFees
    ? pnlAfterFeesPercentage
    : pnlPercentage;

  const positiveFundingFee = new BN(
    p?.position?.pending_claimable_funding_fee_value_in_long_token?.toString()
  ).add(
    new BN(
      p?.position?.pending_claimable_funding_fee_value_in_short_token?.toString()
    )
  );
  const netCollateralValue = collateralValue
    // .add(positiveFundingFee)
    .sub(pendingBorrowingFeesUsd)
    .sub(pendingFundingFeesUsd);

  const displayedLeverage = isPnlInLeverage
    ? p?.position?.leverage
    : p?.position?.sizeInUsd
      ?.mul(new BN(10).pow(new BN(20)))
      .div(netCollateralValue);

  const collateralUnitPrice = new BN(
    getStableTokenPrice(p?.position?.collateralTokenAddress?.toBase58())
      ?.unitPrice || '0'
  );
  const netCollateralAmount = collateralUnitPrice.isZero()
    ? BN_ZERO
    : netCollateralValue.div(collateralUnitPrice);

  // net value
  function renderNetValue() {
    return (
      <TooltipWithPortal
        handle={formatUsd(new BN(p?.position?.net_value?.toString()))}
        position={p.isLarge ? 'bottom-start' : 'bottom-end'}
        renderContent={() => (
          <div>
            {t`Net Value: Initial Collateral + PnL - Borrowing Fee - Negative Funding Fee - Close Fee`}
            <br />
            <br />
            <StatsTooltipRow
              label={t`Initial Collateral`}
              value={formatUsd(collateralValue) || '...'}
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`PnL`}
              value={
                formatUsd(pendingPnl, {
                  signed: true,
                }) || '...'
              }
              showDollar={false}
              textClassName={getPositiveOrNegativeClass(pendingPnl)}
            />
            <StatsTooltipRow
              label={t`Accrued Borrowing Fee`}
              value={
                formatUsd(pendingBorrowingFeeValue.neg(), {
                  signed: true,
                }) || '...'
              }
              showDollar={false}
              textClassName={cx({
                'text-red-500': !pendingBorrowingFeeValue?.isZero(),
              })}
            />
            <StatsTooltipRow
              label={t`Accrued Negative Funding Fee`}
              value={
                formatUsd(pendingFundingFeeValue.neg(), {
                  signed: true,
                }) || '...'
              }
              showDollar={false}
              textClassName={cx({
                'text-red-500': !pendingFundingFeeValue?.isZero(),
              })}
            />
            <StatsTooltipRow
              label={t`Close Fee`}
              showDollar={false}
              value={
                formatUsd(
                  new BN(p?.position?.close_order_fee_value?.toString()).neg(),
                  {
                    signed: true,
                  }
                ) || '...'
              }
              textClassName="text-red-500"
            />
            <br />
            <StatsTooltipRow
              label={t`PnL After Fees`}
              value={formatDeltaUsd(pnlAfterFees, pnlAfterFeesPercentage)}
              showDollar={false}
              textClassName={getPositiveOrNegativeClass(pnlAfterFees)}
            />
          </div>
        )}
      />
    );
  }

  // collateral
  function renderCollateral() {
    return (
      <>
        <div
          className={cx('position-list-collateral', { isSmall: !p.isLarge })}
        >
          <TooltipWithPortal
            handle={
              <span data-qa="position-collateral-value">
                {formatUsd(netCollateralValue)}
              </span>
            }
            position={p.isLarge ? 'bottom-start' : 'bottom-end'}
            className="PositionItem-collateral-tooltip"
            handleClassName={cx({ negative: p?.position?.hasLowCollateral })}
            renderContent={() => {
              let fundingFeeRateUsd: BN | undefined = undefined;
              let borrowingFeeRateUsd: BN | undefined = undefined;

              if (p?.position?.marketInfo) {
                if (p?.position?.isLong) {
                  // long
                  const longBorrowingRateHour = new BN(
                    p?.position?.marketInfo?.longBorrowingFeeRateHour || '0'
                  );
                  const longFundingRateHour = new BN(
                    p?.position?.marketInfo?.longFundingFeeRateHour || '0'
                  );
                  const day = new BN(24);
                  const sizeInUsd = p?.position?.sizeInUsd;
                  fundingFeeRateUsd = longFundingRateHour
                    .mul(day)
                    .mul(sizeInUsd)
                    .div(new BN(10).pow(new BN(20)));
                  borrowingFeeRateUsd = longBorrowingRateHour
                    .mul(day)
                    .mul(sizeInUsd)
                    .div(new BN(10).pow(new BN(20)));
                } else if (!p?.position?.isLong) {
                  // short
                  const shortBorrowingRateHour = new BN(
                    p?.position?.marketInfo?.shortBorrowingFeeRateHour || '0'
                  );
                  const shortFundingRateHour = new BN(
                    p?.position?.marketInfo?.shortFundingFeeRateHour || '0'
                  );
                  const day = new BN(24);
                  const sizeInUsd = p?.position?.sizeInUsd;
                  fundingFeeRateUsd = shortFundingRateHour
                    .mul(day)
                    .mul(sizeInUsd)
                    .div(new BN(10).pow(new BN(20)));
                  borrowingFeeRateUsd = shortBorrowingRateHour
                    .mul(day)
                    .mul(sizeInUsd)
                    .div(new BN(10).pow(new BN(20)));
                }
              }

              return (
                <>
                  {p?.position?.hasLowCollateral && (
                    <div>
                      <Trans>
                        WARNING: This position has a low amount of collateral
                        after deducting fees, deposit more collateral to reduce
                        the position&apos;s liquidation risk.
                      </Trans>
                      <br />
                      <br />
                    </div>
                  )}
                  <StatsTooltipRow
                    label={t`Initial Collateral`}
                    value={
                      <>
                        <div>
                          {formatTokenAmount(
                            p?.position?.collateralAmount,
                            GMX_SOLANA_TOKENS_RAW[
                              p?.position?.collateralTokenAddress
                            ]?.decimals,
                            GMX_SOLANA_TOKENS_RAW[
                              p?.position?.collateralTokenAddress
                            ]?.symbol,
                            {
                              useCommas: true,
                            }
                          )}{' '}
                          ({formatUsd(collateralValue)})
                        </div>
                      </>
                    }
                    showDollar={false}
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Accrued Borrowing Fee`}
                    showDollar={false}
                    value={
                      formatUsd(pendingBorrowingFeeValue.neg(), {
                        signed: true,
                      }) || '...'
                    }
                    textClassName={cx({
                      'text-red-500': !pendingBorrowingFeeValue?.isZero(),
                    })}
                  />
                  <StatsTooltipRow
                    label={t`Accrued Negative Funding Fee`}
                    showDollar={false}
                    value={
                      formatUsd(pendingFundingFeeValue.neg(), {
                        signed: true,
                      }) || '...'
                    }
                    textClassName={cx({
                      'text-red-500': !pendingFundingFeeValue?.isZero(),
                    })}
                  />
                  <StatsTooltipRow
                    label={t`Accrued Positive Funding Fee`}
                    showDollar={false}
                    value={
                      formatUsd(positiveFundingFee, {
                        signed: true,
                      }) || '...'
                    }
                    textClassName={cx({
                      'text-green-500': positiveFundingFee.gt(BN_ZERO),
                    })}
                  />
                  <br />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Borrowing Fee / Day`}
                    value={
                      borrowingFeeRateUsd !== undefined
                        ? formatUsd(borrowingFeeRateUsd)
                        : '...'
                    }
                    textClassName={cx({
                      'text-red-500':
                        borrowingFeeRateUsd !== undefined &&
                        borrowingFeeRateUsd.lt(BN_ZERO),
                    })}
                  />
                  <StatsTooltipRow
                    showDollar={false}
                    label={t`Current Funding Fee / Day`}
                    value={
                      formatUsd(fundingFeeRateUsd, {
                        signed: true,
                      }) || '...'
                    }
                    textClassName={getPositiveOrNegativeClass(
                      fundingFeeRateUsd
                    )}
                  />
                  <br />
                  <Trans>
                    Use the edit collateral icon to deposit or withdraw
                    collateral.
                  </Trans>
                  <br />
                  <br />
                  <Trans>
                    Negative funding fees and borrowing fees are settled against
                    the collateral automatically and will influence the time to
                    liquidation, as shown under the liquidation price tooltip.
                  </Trans>
                  <br />
                  <br />
                  <Trans>
                    Positive funding fees are automatically claimed when the
                    position is adjusted through any operation.
                  </Trans>
                  <br />
                </>
              );
            }}
          />

          {!p.position.isOpening &&
            !p.hideActions &&
            p.onEditCollateralClick && (
              <span
                className="edit-icon"
                data-qa="position-edit-button"
                onClick={p.onEditCollateralClick}
              >
                <IconTpEdit className="text-slate-100" fontSize={16} />
              </span>
            )}
        </div>
        <div className="Exchange-list-info-label Position-collateral-amount muted">
          <span>
            {isScreen1024 ? '(' : ''}
            {formatBalanceAmount(
              netCollateralAmount,
              GMX_SOLANA_TOKENS_RAW[p?.position?.collateralTokenAddress]
                ?.decimals,
              getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[p?.position?.collateralTokenAddress]?.symbol)
            )}
            {isScreen1024 ? ')' : ''}
          </span>
        </div>
      </>
    );
  }

  // liq price
  function renderLiquidationPrice() {
    if (!p?.position?.marketInfo) {
      return (
        <Skeleton
          width={60}
          count={1}
          baseColor="#1F1F1F"
          highlightColor="#323232"
        />
      );
    }

    let liqPriceWarning: string | undefined;
    // const estimatedLiquidationHours = getPositionEstimatedLiquidationTimeInHours(p.position, minCollateralUsd);
    let estimatedLiquidationHours = new BN(0);

    let fundingFeeRateUsd: BN | undefined = undefined;
    let borrowingFeeRateUsd: BN | undefined = undefined;
    let minCollateralFactor: BN | undefined = undefined;
    if (p?.position?.marketInfo && p?.position?.liquidation_price) {
      if (p?.position?.isLong) {
        // long
        const longBorrowingRateHour = new BN(
          p?.position?.marketInfo?.longBorrowingFeeRateHour || '0'
        );
        const longFundingRateHour = new BN(
          p?.position?.marketInfo?.longFundingFeeRateHour || '0'
        );
        const day = new BN(24);
        const sizeInUsd = p?.position?.sizeInUsd;
        fundingFeeRateUsd = longFundingRateHour
          .mul(day)
          .mul(sizeInUsd)
          .div(new BN(10).pow(new BN(20)));
        borrowingFeeRateUsd = longBorrowingRateHour
          .mul(day)
          .mul(sizeInUsd)
          .div(new BN(10).pow(new BN(20)));
        minCollateralFactor = new BN(
          p?.position?.marketInfo?.minCollateralFactorForLong
        ).mul(p?.position?.sizeInUsd);
      } else if (!p?.position?.isLong) {
        // short
        const shortBorrowingRateHour = new BN(
          p?.position?.marketInfo?.shortBorrowingFeeRateHour || '0'
        );
        const shortFundingRateHour = new BN(
          p?.position?.marketInfo?.shortFundingFeeRateHour || '0'
        );
        const day = new BN(24);
        const sizeInUsd = p?.position?.sizeInUsd;
        fundingFeeRateUsd = shortFundingRateHour
          .mul(day)
          .mul(sizeInUsd)
          .div(new BN(10).pow(new BN(20)));
        borrowingFeeRateUsd = shortBorrowingRateHour
          .mul(day)
          .mul(sizeInUsd)
          .div(new BN(10).pow(new BN(20)));
        minCollateralFactor = new BN(
          p?.position?.marketInfo?.minCollateralFactorForShort
        ).mul(p?.position?.sizeInUsd).div(ONE_USD);
      }

      // (net value - (min_collateral_factor * size)) / （borrowing fee + funding fee）
      // net value - minCollateralFactor / (borrowing fee + funding fee)
      const netValue = new BN(p?.position?.net_value?.toString()).sub(
        minCollateralFactor
      );
      const liquidtaion = borrowingFeeRateUsd.add(fundingFeeRateUsd);

      estimatedLiquidationHours = liquidtaion.isZero()
        ? new BN(1001 * 24)
        : netValue.div(liquidtaion).mul(new BN(24));

      if (estimatedLiquidationHours.gt(new BN(0))) {
        estimatedLiquidationHours = new BN(1001 * 24);
      } else {
        estimatedLiquidationHours = estimatedLiquidationHours.abs();
      }
    }

    if (p?.position?.liquidation_price?.toString() === undefined) {
      if (
        !p?.position?.isLong &&
        new BN(p?.position?.collateral_value?.toString()).gte(
          p?.position?.sizeInTokens
        )
      ) {
        const symbol =
          GMX_SOLANA_TOKENS_RAW[p?.position?.collateralTokenAddress]?.symbol;
        const indexName =
          GMX_SOLANA_TOKENS_RAW[p?.position?.marketInfo?.indexToken]?.symbol;
        liqPriceWarning = t`Since your position's collateral is in ${symbol}, with an initial value higher than the ${indexName} short position size, the collateral value will increase to cover any negative PnL, so there is no liquidation price.`;
      } else if (
        p?.position?.isLong &&
        GMX_SOLANA_TOKENS_RAW[p?.position?.collateralTokenAddress]?.isStable &&
        p?.position?.collateral_value?.toString() >=
        p?.position?.sizeInUsd?.toString()
      ) {
        const symbol =
          GMX_SOLANA_TOKENS_RAW[p?.position?.collateralTokenAddress]?.symbol;
        const indexName =
          GMX_SOLANA_TOKENS_RAW[p?.position?.marketInfo?.indexToken]?.symbol;
        liqPriceWarning = t`Since your position's collateral is in ${symbol}, with an initial value higher than the ${indexName} long position size, the collateral value will cover any negative PnL, so there is no liquidation price.`;
      }
    }

    const getLiqPriceTooltipContent = () => (
      <>
        {liqPriceWarning && <div>{liqPriceWarning}</div>}
        {estimatedLiquidationHours ? (
          <div>
            {!liqPriceWarning && (
              <>
                <Trans>
                  Liquidation price is influenced by fees and collateral value.
                </Trans>
                <br />
              </>
            )}
            <br />
            {liqPriceWarning ? (
              <Trans>
                This position could still be liquidated, excluding any price
                movement, due to funding and borrowing fee rates reducing the
                position&apos;s collateral over time.
              </Trans>
            ) : (
              <Trans>
                This position could be liquidated, excluding any price movement,
                due to funding and borrowing fee rates reducing the
                position&apos;s collateral over time.
              </Trans>
            )}
            <br />
            <br />
            <StatsTooltipRow
              label={<Trans>Estimated Time to Liquidation</Trans>}
              value={formatPositionEstimatedLiquidationTime(
                estimatedLiquidationHours
              )}
              showDollar={false}
            />
          </div>
        ) : (
          ''
        )}
      </>
    );

    if (liqPriceWarning || estimatedLiquidationHours) {
      return (
        <TooltipWithPortal
          handle={
            formatLiquidationPrice(
              formatParseUsdToBN('1', p?.position?.decimals).mul(
                liquidationPrice
              ),
              {
                displayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(p?.position?.marketInfo?.indexToken) ? 5 : GMX_SOLANA_TOKENS_RAW[p?.position.marketInfo?.indexToken].decimals,
                isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(p?.position?.marketInfo?.indexToken)
              }
            ) || '...'
          }
          position="bottom-end"
          handleClassName={cx({
            'LiqPrice-soft-warning':
              estimatedLiquidationHours && estimatedLiquidationHours < 24 * 7,
            'LiqPrice-hard-warning':
              estimatedLiquidationHours && estimatedLiquidationHours < 24,
          })}
          renderContent={getLiqPriceTooltipContent}
        />
      );
    }
  }

  function PositionItemOrder({
    order,
    indexTokenAddress,
    handleClick,
    onCancelOrder,
  }: {
    order: PositionOrderInfo;
    indexTokenAddress?: string;
    handleClick: (order: PositionOrderInfo) => void;
    onCancelOrder: (
      orderAddress: string,
      skipPreflight?: boolean
    ) => Promise<void>;
  }) {
    return (
      <div key={order.orderAddress.toBase58()}>
        <div className="flex items-start justify-between gap-6">
          <Button
            variant="secondary"
            className="!block w-full !bg-[#1F1F1F] !p-6 before:!hidden"
          >
            <div className="flex items-center justify-between">
              <PositionItemOrderText
                order={order}
                indexTokenAddress={indexTokenAddress}
              />
              {!getGmw421Enabled() && (
                <FaAngleRight fontSize={16} className="ml-5 text-[#A3A3A3]" />
              )}
            </div>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              handleClick(order);
            }}
            className="!bg-[#1F1F1F] !p-6 hover:!bg-opacity-80 active:!bg-opacity-70"
          >
            <IconTpEdit fontSize={16} />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void onCancelOrder(order.orderAddress.toBase58());
            }}
            className="!bg-[#1F1F1F] !p-6 hover:!bg-opacity-80 active:!bg-opacity-70"
          >
            <IconTpClose fontSize={16} color='#A3A3A3' />
          </Button>
        </div>
      </div>
    );
  }

  function PositionItemOrderText({
    order,
    indexTokenAddress,
  }: {
    order: PositionOrderInfo;
    indexTokenAddress?: string;
  }) {
    const triggerThresholdType = getTriggerThresholdType(
      order.orderType,
      order.isLong
    );
    const isIncrease = isIncreaseOrderType(order?.orderType);
    const resolvedIndexTokenAddress = getGmw385Enabled()
      ? indexTokenAddress ?? order?.marketInfo?.indexToken
      : order?.marketInfo?.indexToken;
    const decimals =
      GMX_SOLANA_TOKENS_RAW[resolvedIndexTokenAddress]?.decimals;
    const triggerPrice = formatPriceUsd(
      formatParseUsdToBN('1', decimals).mul(
        new BN(order?.triggerPrice?.toString() || 0)
      ),
      {
        fallbackToZero: true,
        isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(resolvedIndexTokenAddress)
      }
    );

    return (
      <div
        key={order.orderAddress.toBase58()}
        className="text-start text-[#A3A3A3]"
      >
        {isDecreaseOrderType(order.orderType)
          ? getTriggerNameByOrderType(order.orderType, true)
          : t`Limit`}
        : {triggerThresholdType} {triggerPrice}:{' '}
        <span>
          {isIncrease ? '+' : '-'}
          {formatUsd(order.sizeDeltaUsd)}
        </span>
      </div>
    );
  }

  function renderCard() {
    const positionOrders =
      p?.position?.orderToken?.filter((order) => {
        return isMarketOrderShowType(order?.orderType);
      }) || [];

    return (
      <>
        <TpDecrease
          order={currentOrder}
          indexTokenAddress={positionIndexTokenAddress}
          isVisible={showTpDecrease}
          onClose={() => setShowTpDecrease(false)}
        />
        <SlDecrease
          order={currentOrder}
          indexTokenAddress={positionIndexTokenAddress}
          isVisible={showSlDecrease}
          onClose={() => setShowSlDecrease(false)}
        />
        <LongOrShortLimit
          order={currentOrder}
          isVisible={showLongOrShortLimit}
          onClose={() => setShowLongOrShortLimit(false)}
        />
        <TPSLDialog
          key={p.position?.address?.toBase58()}
          isVisible={showTPSLDialog}
          label={t`TP/SL for ${formatMarketName(marketInfo?.indexToken)} ${p.position?.isLong ? 'Long' : 'Short'}`}
          setIsVisible={setShowTPSLDialog}
          position={p.position}
          onOperateClick={(type) => {
            if (type === 'add') {
              p.onEditTPSLOrder?.(p.position, 'new');
            }
          }}
        />
        <div className="position-card">
          <div
            className="position-card-header cursor-pointer"
            onClick={() =>
              p.onSelectPositionClick?.(TradeMode.SelectMarket, p.position)
            }
          >
            <div className="position-card-symbol">
              <TokenIcon
                symbol={GMX_SOLANA_TOKENS_RAW[marketInfo?.indexToken]?.symbol}
                displaySize={20}
                importSize={40}
                className="position-card-token-icon"
              />
              <div className="position-card-symbol-info">
                <div className="position-card-market-name">
                  {formatMarketName(marketInfo?.indexToken)} &nbsp;{' '}
                  <span className="position-leverage">
                    {(displayedLeverage &&
                      formatLeverage(new BN(displayedLeverage?.toString()))) ||
                      '...'}
                  </span>
                  <span
                    className={cx('position-card-direction', {
                      long: p?.position?.isLong,
                      short: !p?.position?.isLong,
                    })}
                  >
                    {p.position.isLong ? t`Long` : t`Short`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="position-card-details">
            <div
              style={{
                borderBottom: '1px solid #53535380',
                padding: '0.8rem 0',
              }}
            >
              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>Pool</Trans>
                </div>
                <div className="position-card-detail-value">
                  {formatMarketName(marketInfo?.indexToken)}{' '}
                  <span style={{ color: '#A3A3A3' }}>
                    [
                    {marketInfo?.longToken === marketInfo?.shortToken
                      ? GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol
                      : `${GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol}-${GMX_SOLANA_TOKENS_RAW[marketInfo?.shortToken]?.symbol}`}
                    ]
                  </span>
                </div>
              </div>

              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>Size</Trans>
                </div>
                <div className="position-card-detail-value">
                  {formatUsd(p?.position?.sizeInUsd)}
                </div>
              </div>

              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>Net Value</Trans>
                </div>
                <div className="position-card-detail-value">
                  {renderNetValue()}
                </div>
              </div>

              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>PNL After Fees</Trans>
                </div>
                <div className="position-card-detail-value">
                  {formatDeltaUsd(displayedPnl, displayedPnlPercentage, {
                    fallbackToZero: true,
                    showPlusForZero: true,
                  })}
                </div>
              </div>

              <div className="position-card-detail-row">
                <div
                  className="position-card-detail-label"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Trans>Collateral</Trans>
                </div>
                <div className="position-card-collateral-info">
                  {renderCollateral()}
                </div>
              </div>
            </div>
            <div
              style={{
                borderBottom: '1px solid #53535380',
                padding: '0.8rem 0',
              }}
            >
              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>Entry Price</Trans>
                </div>
                <div className="position-card-detail-value">
                  {formatPriceUsd(
                    formatParseUsdToBN('1', p?.position?.decimals).mul(
                      new BN(p?.position?.entry_price?.toString() || 0)
                    ),
                    {
                      fallbackToZero: true,
                      isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(p?.position?.marketInfo?.indexToken)
                    }
                  )}
                </div>
              </div>

              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>Mark Price</Trans>
                </div>
                <div className="position-card-detail-value">
                  {formatPriceUsd(
                    new BN(
                      getStableTokenPrice(
                        p?.position?.marketInfo?.indexToken
                      )?.price || 0
                    ),
                    {
                      fallbackToZero: true,
                      isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(p?.position?.marketInfo?.indexToken)
                    }
                  )}
                </div>
              </div>

              <div className="position-card-detail-row">
                <div className="position-card-detail-label">
                  <Trans>Liq. Price</Trans>
                </div>
                <div className="position-card-detail-value">
                  {renderLiquidationPrice()}
                </div>
              </div>
            </div>

            {/* <div className="position-card-detail-row">
            <div className="position-card-detail-label">
              <Trans>TP/SL</Trans>
            </div>
            <div className="position-card-detail-value">
              <RenderTpl
                position={p.position}
                onEditTPSLOrder={p.onEditTPSLOrder}
              />
            </div>
          </div> */}
            {positionOrders?.length === 0 && (
              <div
                style={{
                  borderBottom: '1px solid #53535380',
                  padding: '1.2rem 0',
                }}
              >
                <div className="position-card-detail-row">
                  <div className="position-card-detail-label">
                    <Trans>Orders</Trans>
                  </div>
                  <div
                    className="position-card-detail-value"
                    style={{ color: '#A3A3A3' }}
                  >
                    -
                  </div>
                </div>
              </div>
            )}
          </div>

          {positionOrders?.length > 0 && (
            <div
              style={{
                padding: '1.2rem 1.6rem',
                borderBottom: '1px solid #53535380',
              }}
            >
              <div
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 500,
                  marginBottom: '1rem',
                  color: '#A3A3A3',
                }}
              >
                <Trans>Orders</Trans>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                }}
              >
                {positionOrders?.map((item, index) => (
                  <PositionItemOrder
                    key={index}
                    order={item}
                    indexTokenAddress={positionIndexTokenAddress}
                    handleClick={handleOrderClick}
                    onCancelOrder={cancelOrderForCard}
                  />
                ))}
              </div>
            </div>
          )}
          {!p.hideActions && (
            <div className="position-card-actions">
              <div className="position-card-tpsl-button-container">
                <Button
                  variant="ghost"
                  className="position-card-button !rounded-[0.8rem] !bg-[#1F1F1F] !p-[0.8rem] !text-[1.3rem] !text-[#A3A3A3] hover:!bg-[#1313131a] hover:!text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const tpslOrders = positionOrders?.filter(
                      (order) => order.orderType === 7 || order.orderType === 8
                    );
                    if (!tpslOrders || tpslOrders.length === 0) {
                      p.onEditTPSLOrder?.(p.position, 'new');
                    } else {
                      setShowTPSLDialog(true);
                    }
                  }}
                >
                  <img src={triggerClose} alt="Increase Limit" height={16} />
                  <Trans>TP/SL</Trans>
                </Button>

                <Button
                  variant="ghost"
                  className="position-card-button !rounded-[0.8rem] !bg-[#1F1F1F] !p-[0.8rem] !text-[1.3rem] !text-[#A3A3A3] hover:!bg-[#1313131a] hover:!text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    p.onEditCollateralClick?.();
                  }}
                >
                  <IconTpEdit width={16} height={16} />
                  <Trans>Edit Collateral</Trans>
                </Button>

                <Button
                  variant="ghost"
                  className="position-card-button !rounded-[0.8rem] !bg-[#1F1F1F] !p-[0.8rem] !text-[1.3rem] !text-[#A3A3A3] hover:!bg-[#1313131a] hover:!text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    p.onClosePositionClick?.(p.position, 'Market');
                  }}
                >
                  <IconTpClose fontSize={16} />
                  <Trans>Close</Trans>
                </Button>
              </div>
              <div className="position-card-dropdown">
                <PositionDropdown
                  handleEditCollateral={p.onEditCollateralClick}
                  handleMarketSelect={() =>
                    p.onSelectPositionClick?.(
                      TradeMode.SelectMarket,
                      p.position
                    )
                  }
                  handleMarketIncreaseSize={() => {
                    p.onSelectPositionClick?.(TradeMode.Market, p.position);
                  }}
                  handleLimitIncreaseSize={() =>
                    p.onSelectPositionClick?.(TradeMode.Limit, p.position)
                  }
                  handleTriggerClose={() =>
                    p.onClosePositionClick?.(p.position, 'TpSl')
                  }
                  handleShare={p.onShareClick}
                />
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderLarge() {
    const qaAttr = `position-item-${p?.position?.address.toBase58()}-${p?.position?.isLong ? 'Long' : 'Short'}`;

    const positionOrders =
      p?.position?.orderToken?.filter((order) => {
        return isMarketOrderShowType(order?.orderType);
      }) || [];
    return (
      <TableTr
        data-qa={qaAttr}
        className={cx('Exchange-list-item', {
          'Exchange-list-item-active': isCurrentMarket,
          'pointer-events-none opacity-50': p?.position?.shouldDisablePosition,
        })}
        bordered={false}
      >
        <TableTd
          data-qa="position-handle"
          className={cx({
            'shadow-cold-blue-500 shadow-[inset_2px_0_0]': isCurrentMarket,
          })}
          onClick={() =>
            p.onSelectPositionClick?.(TradeMode.SelectMarket, p.position)
          }
        >
          {/* title */}
          <div
            className={cx(
              'Exchange-list-title',
              getGmw235Enabled() && 'position-card-title'
            )}
          >
            <TooltipWithPortal
              handle={
                <div className="inline-flex items-center gap-5">
                  <TokenIcon
                    className="PositionList-token-icon min-h-20 min-w-20"
                    symbol={p?.position?.symbol === 'WGMX' ? 'GMX' : p?.position?.symbol}
                    displaySize={20}
                    importSize={24}
                  />
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onSelectPositionClick?.(
                        TradeMode.SelectMarket,
                        p.position
                      );
                    }}
                  >
                    {formatMarketName(marketInfo?.indexToken)}
                  </span>
                  <ExternalLink
                    href={getAddressUrl(p?.position?.address)}
                    className="ml-2 inline-flex items-center hover:opacity-80"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(
                        getAddressUrl(p?.position?.address),
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}
                  >
                    <img
                      src={newLinkIcon}
                      alt="View in explorer"
                      width={12}
                      height={12}
                    />
                  </ExternalLink>
                  {p?.position?.shouldDisablePosition && (
                    <ImSpinner2 className="spin ml-2 text-primary-500" size={16} />
                  )}
                </div>
              }
              position="bottom-start"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Pool`}
                    value={
                      <div className="flex items-center">
                        <span className="subtext leading-1">
                          {formatMarketName(marketInfo?.indexToken)}{' '}
                          {marketInfo?.longToken ? (
                            <>
                              <span className='text-[#A3A3A3]'>
                                [
                                {
                                  GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[marketInfo?.longToken]?.symbol
                                }
                                {
                                  '-' +
                                  GMX_SOLANA_TOKENS_RAW[
                                    marketInfo?.shortToken
                                  ]?.symbol
                                }
                                ]
                              </span>
                            </>
                          ) : (
                            <>...</>
                          )}
                        </span>
                      </div>
                    }
                    showDollar={false}
                  />
                  <br />
                  <div>
                    <Trans>
                      Click on the position to select it, then use the trade box to increase it.
                    </Trans>
                    <br />
                    <br />
                    <Trans>
                      {`Use the "Close" button to reduce your position.`}
                    </Trans>
                    <br />
                  </div>

                  {showDebugValues && (
                    <>
                      <br />
                      <StatsTooltipRow
                        label={'Position Address'}
                        value={
                          <div className="debug-key muted">
                            {p.position.address.toBase58()}
                          </div>
                        }
                        showDollar={false}
                      />
                    </>
                  )}
                </div>
              )}
            />
          </div>
          <div className="Exchange-list-info-label">
            <span className="muted Position-leverage">
              {(displayedLeverage &&
                formatLeverage(new BN(displayedLeverage?.toString()))) ||
                '...'}
              &nbsp;
            </span>
            <span
              className={cx({
                positive: p?.position?.isLong,
                negative: !p?.position?.isLong,
              })}
            >
              {p.position.isLong ? t`Long` : t`Short`}
            </span>
          </div>
        </TableTd>
        <TableTd>
          {/* size */}
          <p>{formatUsd(p?.position?.sizeInUsd)}</p>
          <TpDecrease
            order={currentOrder}
            indexTokenAddress={positionIndexTokenAddress}
            isVisible={showTpDecrease}
            onClose={() => setShowTpDecrease(false)}
          />
          <SlDecrease
            order={currentOrder}
            indexTokenAddress={positionIndexTokenAddress}
            isVisible={showSlDecrease}
            onClose={() => setShowSlDecrease(false)}
          />
          <LongOrShortLimit
            order={currentOrder}
            isVisible={showLongOrShortLimit}
            onClose={() => setShowLongOrShortLimit(false)}
          />
          {positionOrders?.length > 0 && (
            <>
              <TooltipWithPortal
                className="Position-list-active-orders"
                handle={
                  <>
                    <Trans>Orders ({positionOrders?.length})</Trans>
                    <div className={cx('relative top-3 size-6 rounded-full')} />
                  </>
                }
                position="bottom-start"
                handleClassName={cx([
                  'Exchange-list-info-label',
                  'Exchange-position-list-orders',
                  'clickable',
                  'text-[#A3A3A3]',
                ])}
                maxAllowedWidth={370}
                tooltipClassName="!z-10 w-[370px]"
                content={
                  <div className="leading-base flex max-h-[350px] cursor-auto flex-col gap-10 overflow-y-auto">
                    <div>
                      <Trans>Active Orders</Trans>
                    </div>
                    {positionOrders?.map((item, index) => (
                      <PositionItemOrder
                        key={index}
                        order={item}
                        indexTokenAddress={positionIndexTokenAddress}
                        handleClick={handleOrderClick}
                        onCancelOrder={cancelOrderForTable}
                      />
                    ))}
                  </div>
                }
              />
            </>
          )}

          {/* <PositionItemOrdersLarge
            positionKey={p.position.address.toBase58()}
            onOrdersClick={p.onOrdersClick}
          /> */}
        </TableTd>
        <TableTd>
          {/* netValue */}
          {renderNetValue()}
          {displayedPnl !== undefined && (
            <div
              className={cx('Exchange-list-info-label Position-pnl', {
                positive: displayedPnl.gt(BN_ZERO),
                negative: displayedPnl.lt(BN_ZERO),
                muted: displayedPnl?.isZero(),
              })}
            >
              {formatDeltaUsd(displayedPnl, displayedPnlPercentage, {
                fallbackToZero: true,
                showPlusForZero: true,
              })}
            </div>
          )}
        </TableTd>
        <TableTd>
          {/* collateral */}
          {renderCollateral()}
        </TableTd>
        <TableTd>
          {/* entryPrice */}
          {formatPriceUsd(
            formatParseUsdToBN('1', p?.position?.decimals).mul(
              new BN(p?.position?.entry_price?.toString() || 0)
            ),
            {
              fallbackToZero: true,
              isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(p?.position?.marketInfo?.indexToken)
            }
          )}
        </TableTd>
        <TableTd>
          {/* markPrice */}
          {formatPriceUsd(
            new BN(
              getStableTokenPrice(p?.position?.marketInfo?.indexToken)?.price || 0
            ),
            {
              fallbackToZero: true,
              isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(p?.position?.marketInfo?.indexToken)
            }
          )}
        </TableTd>
        <TableTd>
          {/* liqPrice */}
          {renderLiquidationPrice()}
        </TableTd>
        <TableTd>
          {/* tp/sl */}
          <RenderTpl
            position={p.position}
            onEditTPSLOrder={p.onEditTPSLOrder}
          />
        </TableTd>
        <TableTd>
          <Button
            variant="ghost"
            className="Exchange-list-action !mx-[0.3rem] !my-0 !rounded-[3px] !bg-transparent !p-0 !text-[#A3A3A3] hover:!bg-transparent hover:!text-white"
            data-qa="position-close-button"
            onClick={(e) => {
              e.stopPropagation();
              p.onClosePositionClick?.(p.position, 'Market');
            }}
          >
            <Trans>Close</Trans>
          </Button>
        </TableTd>

        <TableTd>
          <PositionDropdown
            handleEditCollateral={p.onEditCollateralClick}
            handleMarketSelect={() =>
              p.onSelectPositionClick?.(TradeMode.SelectMarket, p.position)
            }
            handleMarketIncreaseSize={() => {
              p.onSelectPositionClick?.(TradeMode.Market, p.position);
            }}
            handleLimitIncreaseSize={() =>
              p.onSelectPositionClick?.(TradeMode.Limit, p.position)
            }
            handleTriggerClose={() =>
              p.onClosePositionClick?.(p.position, 'TpSl')
            }
            handleShare={p.onShareClick}
          />
        </TableTd>
      </TableTr>
    );
  }

  if (!getGmw330Enabled()) {
    return isScreen1024 ? renderCard() : renderLarge();
  }

  const card = renderCard();
  const large = renderLarge();

  return isScreen1024 ? card : large;
}
