import './BuybackSeason2.scss';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trans } from '@lingui/macro';
import { BN } from '@coral-xyz/anchor';
import Button from '@/components/Common/Button/Button';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import timeSvg from '@/img/gt/time.svg';
import coinsPayoutSvg from '@/img/gt/coins-payout.svg';
import { useAppStore } from '@/zustand/useAppStore';
import { selectGtUserDetailsAmount } from '@/selectors/gt/gtUserDetailsSelectors';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import { formatAmount } from '@/utils/legacy';
import { useGtBuybackSummary } from './hooks/useGtBuybackSummary';
import { useGtSellContext } from './hooks/useGtSellContext';
import { BUYBACK_SEASON } from './buybackConstants';
import {
  calcAvailableToSell,
  calcBuybackPoolStatus,
  formatCountdownToTimestamp,
  formatEstBuybackPrice,
  formatGtAmount,
  formatUsdcAmount,
  parseNum,
  rawToUi,
} from './utils/buybackDerivations';
import { SellGtModal } from './SellGtModal';
import type { BuybackPoolStatus } from './types';

const QuotaValueSkeleton = () => <CellSkeleton width={96} height={16} />;
const StatValueSkeleton = () => <CellSkeleton width={88} height={14} />;

function statusClassName(status: BuybackPoolStatus): string {
  if (status === 'Strong') return 'status-strong';
  if (status === 'Moderate') return 'status-moderate';
  return 'status-pressure';
}

function BuybackSeason2() {
  const { connected } = useWallet();
  const gtBalanceBN = useAppStore(selectGtUserDetailsAmount);
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals) || 7;

  const {
    pool,
    participation,
    isLoading,
  } = useGtBuybackSummary();
  const { context: sellContext, isLoading: isSellContextLoading } =
    useGtSellContext();

  const [isSellModalVisible, setIsSellModalVisible] = useState(false);
  const [countdown, setCountdown] = useState('—');

  useEffect(() => {
    const tick = () => {
      if (!pool?.nextBuybackTimestamp) {
        setCountdown('—');
        return;
      }
      setCountdown(formatCountdownToTimestamp(pool.nextBuybackTimestamp));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pool?.nextBuybackTimestamp]);

  const gtBalance = useMemo(() => {
    const formatted = formatAmount(gtBalanceBN || new BN(0), gtDecimals, 6, false);
    return parseNum(formatted.replace(/,/g, ''));
  }, [gtBalanceBN, gtDecimals]);

  const remaining = useMemo(() => {
    if (!sellContext?.sellQuotaSnapshot) {
      return 0;
    }
    const quotaRaw = BigInt(
      sellContext.sellQuotaSnapshot.cumulativeSellQuota
    );
    const selledRaw = BigInt(sellContext.userSrState?.selledRaw ?? '0');
    const remainingRaw = quotaRaw > selledRaw ? quotaRaw - selledRaw : 0n;
    return rawToUi(remainingRaw.toString(), gtDecimals);
  }, [sellContext, gtDecimals]);

  const totalEarned = useMemo(() => {
    return sellContext?.sellQuota
      ? rawToUi(sellContext.sellQuota.cumulativeSellQuota, gtDecimals)
      : 0;
  }, [sellContext, gtDecimals]);

  const availableToSell = useMemo(
    () => calcAvailableToSell(remaining, gtBalance),
    [remaining, gtBalance]
  );

  const poolStatus = useMemo(() => {
    if (!pool) return null;
    return calcBuybackPoolStatus(
      pool.estBuybackPrice,
      pool.currentMintingPrice
    );
  }, [pool]);

  const canSell = connected && !isSellContextLoading && availableToSell > 0;
  const quotaLoading = isSellContextLoading;

  return (
    <div className="gt-buyback-s2">
      <div className="buyback-s2-title">
        <h2>{BUYBACK_SEASON.name}</h2>
        <p>
          <Trans>Started</Trans>
          {` ${BUYBACK_SEASON.startedAt} · ${BUYBACK_SEASON.status}`}
        </p>
      </div>

      <div className="buyback-s2-quota">
        <div className="buyback-s2-quota-header">
          <div className="buyback-s2-section-title">
            <div>
              <Trans>My Sellable GT Quota</Trans>
            </div>
            <TooltipWithPortal
              handle={<img src={InfoSvg} alt="info" />}
              position="bottom"
              className="block h-[1.6rem]"
              renderContent={() => (
                <div className="buyback-s2-tooltip font-[500]">
                  <div>
                      <Trans>Total Earned Quota:</Trans>
                  </div>
                  <div className="text-[#A3A3A3]">
                    <Trans>
                      The total sellable GT quota earned in Season 2. It
                      increases when your referred users generate GT from
                      trading.
                    </Trans>
                  </div>
                  <br />
                  <div>
                    <Trans>Remaining Quota:</Trans>
                  </div>
                  <div className="text-[#A3A3A3]">
                    <Trans>
                      Your earned sellable GT quota minus GT already sold or
                      locked through buyback.
                    </Trans>
                  </div>
                  <br />
                  <div>
                    <Trans>Available to Sell:</Trans>
                  </div>
                  <div className="text-[#A3A3A3]">
                    <Trans>
                      The lower of your remaining quota and your GT balance.
                    </Trans>
                  </div>
                </div>
              )}
            />
          </div>
          <Button
            variant="primary-action"
            type="button"
            className="sell-gt-btn"
            disabled={!canSell}
            onClick={() => setIsSellModalVisible(true)}
          >
            <Trans>Sell GT</Trans>
            <span className="sell-gt-arrow">→</span>
          </Button>
        </div>
        <div className="buyback-s2-quota-cards">
          <div className="quota-card quota-card-total-earned">
            <div className="quota-card-label ">
              <Trans>Total Earned</Trans>
            </div>
            <div className="quota-card-value">
              {quotaLoading ? (
                <QuotaValueSkeleton />
              ) : (
                `${formatGtAmount(totalEarned, 6)} GT`
              )}
            </div>
          </div>
          <div className="quota-card">
            <div className="quota-card-label">
              <Trans>Remaining</Trans>
            </div>
            <div className="quota-card-value">
              {quotaLoading ? (
                <QuotaValueSkeleton />
              ) : (
                `${formatGtAmount(remaining, 6)} GT`
              )}
            </div>
          </div>
          <div className="quota-card quota-card-available">
            <div className="quota-card-label">
              <Trans>Available to sell</Trans>
            </div>
            <div className="quota-card-value">
              {quotaLoading ? (
                <QuotaValueSkeleton />
              ) : (
                `${formatGtAmount(availableToSell, 6)} GT`
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="buyback-s2-mid">
        <div className="buyback-s2-pool">
          <div className="buyback-s2-card-header">
            <div className="buyback-s2-section-title">
              <span>
                <Trans>Today&apos;s Buyback Pool</Trans>
              </span>
            </div>
            {poolStatus && (
              <TooltipWithPortal
                disableHandleStyle
                handle={
                  <span
                    className={`pool-status-badge ${statusClassName(poolStatus.status)}`}
                  >
                    {poolStatus.status === 'Strong' && <Trans>Strong</Trans>}
                    {poolStatus.status === 'Moderate' && (
                      <Trans>Moderate</Trans>
                    )}
                    {poolStatus.status === 'Under Pressure' && (
                      <Trans>Under Pressure</Trans>
                    )}
                  </span>
                }
                position="bottom"
                renderContent={() => (
                  <div className="buyback-s2-tooltip">
                    <p className="buyback-s2-tooltip-title">
                      <Trans>
                        Buyback pool is {poolStatus.status}.
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Est. buyback price is {poolStatus.ratioPercent}% of the
                        current minting price (
                        {formatUsdcAmount(pool?.currentMintingPrice ?? 0, 4)}{' '}
                        USDC).
                      </Trans>
                    </p>
                    <p>
                      <Trans>
                        Based on current pool value and queued GT for sell.
                      </Trans>
                    </p>
                  </div>
                )}
              />
            )}
          </div>
          <div className="buyback-s2-stat-list">
            <div className="stat-row">
              <div className="stat-label">
                <div>
                  <Trans>Max Buyback Value</Trans>
                </div>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  className="block h-[1.6rem]"
                  renderContent={() => (
                    <div className="buyback-s2-tooltip text-white font-[500]">
                      <div className=" mb-[1.5rem]">
                        <Trans>
                        Maximum USDC value available for today’s buyback.
                        Updated at 07:50, 15:50, and 23:50 UTC.
                        </Trans>
                      </div>
                      <div className=" mb-[1.5rem]">
                        <div>
                          <Trans>This value is the lower of:</Trans>
                        </div>
                        <div >
                          <Trans>· 60% of the Treasury’s daily fee income</Trans>
                        </div>
                        <div>
                          <Trans>· 4% of the total Treasury value</Trans>
                        </div>
                      
                      </div>
                      <div>
                        <div>
                          <Trans>
                            The final buyback value will not exceed:
                          </Trans>
                        </div>
                        <div >
                          <Trans>·Total submitted GT × current minting price</Trans>
                        </div>
                      </div>
                    </div>
                  )}
                />
              </div>
              <div className="stat-value">
                {isLoading && !pool ? (
                  <StatValueSkeleton />
                ) : (
                  `${formatUsdcAmount(pool?.maxBuybackValue ?? 0, 2)} USDC`
                )}
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-label">
                <Trans>Queued GT for Sell</Trans>
              </div>
              <div className="stat-value">
                {isLoading && !pool ? (
                  <StatValueSkeleton />
                ) : (
                  `${formatGtAmount(pool?.queuedGtForSell ?? 0)} GT`
                )}
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-label">
                <Trans>Est. Buyback Price</Trans>
              </div>
              <div className="stat-value">
                {isLoading && !pool ? (
                  <StatValueSkeleton />
                ) : (
                  `$${formatEstBuybackPrice(pool?.estBuybackPrice ?? 0, 4)}/GT`
                )}
              </div>
            </div>
          </div>
          <div className="buyback-s2-countdown">
            <div className="countdown-label ">
              <img src={timeSvg} alt="time" />
              <span>
                <Trans>Next Buyback In</Trans>
              </span>
            </div>
            <div className="countdown-value">
              <span className="mobile-only">
                <Trans>Next Buyback In</Trans>
              </span>
              {isLoading && !pool ? <StatValueSkeleton /> : countdown}
            </div>
          </div>
        </div>

        <div className="buyback-s2-participation">
          <div className="buyback-s2-card-header">
            <div className="buyback-s2-section-title">
              <span>
                <Trans>My Buyback Participation</Trans>
              </span>
            </div>
          </div>
          <div className="buyback-s2-stat-list">
            <div className="stat-row">
              <div className="stat-label">
                <Trans>Queued GT for Sell</Trans>
              </div>
              <div className="stat-value">
                {isLoading && !participation ? (
                  <StatValueSkeleton />
                ) : (
                  `${formatGtAmount(participation?.queuedGtForSell ?? 0)} GT`
                )}
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-label">
                <div>
                  <Trans>Est. Sell Proceeds</Trans>
                </div>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  className="block h-[1.6rem]"
                  renderContent={() => (
                    <div className="buyback-s2-tooltip">
                        <Trans>
                          Calculated using the current Est. Buyback Price. The final proceeds may differ when the buyback executes.
                        </Trans>
                    </div>
                  )}
                />
              </div>
              <div className="stat-value">
                {isLoading && !participation ? (
                  <StatValueSkeleton />
                ) : (
                  `${formatUsdcAmount(participation?.estSellProceeds ?? 0, 4)} USDC`
                )}
              </div>
            </div>
            <div className="stat-row empty-stat-row">
              {/* <div className="stat-label">
                <div>
                  <Trans>Final Payout</Trans>
                </div>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  className="block h-[1.6rem]"
                  renderContent={() => (
                    <div className="buyback-s2-tooltip">
                      <p>
                        <Trans>
                          Final USDC payout for requests that have entered
                          payout or settled. Paid automatically by the keeper.
                        </Trans>
                      </p>
                    </div>
                  )}
                />
              </div>
              <div className="stat-value">
                {isLoading && !participation
                  ? '—'
                  : `${formatUsdcAmount(finalPayout, 4)} USDC`}
              </div> */}
            </div>
          </div>
          <div className="buyback-s2-claim">
            <img src={coinsPayoutSvg} alt="" className="buyback-s2-claim-icon" />
            <span className="buyback-s2-claim-text">
              <Trans>
                Proceeds will be sent to your wallet within 24h after the
                buyback.
              </Trans>
            </span>
          </div>
        </div>
      </div>

      <SellGtModal
        isVisible={isSellModalVisible}
        onClose={() => setIsSellModalVisible(false)}
        availableToSell={availableToSell}
        gtDecimals={gtDecimals}
        maxBuybackValue={pool?.maxBuybackValue ?? 0}
        queuedGtForSell={pool?.queuedGtForSell ?? 0}
        estBuybackPrice={pool?.estBuybackPrice ?? 0}
        currentMintingPrice={pool?.currentMintingPrice ?? 0}
        sellContext={sellContext}
      />
    </div>
  );
}

export default BuybackSeason2;
