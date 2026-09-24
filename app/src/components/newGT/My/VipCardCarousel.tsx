import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Trans, t } from '@lingui/macro';
import { BN } from '@coral-xyz/anchor';
import { FloatingPortal } from '@floating-ui/react';
import ArrowRight from '@/img/ArrowRight.svg';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import { getGmw446Enabled } from '@/config/featureFlagEnable';
import { useAppStore } from '@/zustand/useAppStore';
import {
  selectGtGlobalDetailsDecimals,
  selectGtGlobalDetailsOrderFeeDiscountFactors,
  selectGtGlobalDetailsRanks,
  selectGtGlobalDetailsReferralDiscountFactor,
  selectGtGlobalDetailsReferralRewardFactors,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import {
  selectGtUserDetailsAmount,
  selectGtUserDetailsRank,
} from '@/selectors/gt/gtUserDetailsSelectors';
import { formatAmount } from '@/utils/legacy';
import { BN_ZERO, ONE_USD } from '@/config/constants';
import EarnGtPanel from './EarnGtPanel';
import 'swiper/css';

const VIP_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const FALLBACK_FEE_DISCOUNT = ['1%', '2%', '3%', '4%', '5%', '6%', '7%', '8%', '9%', '10%'];
const FALLBACK_REFERRAL_DISCOUNT = '10%';
const FALLBACK_REFERRAL_REWARDS = '50%';
const FALLBACK_GT_REQUIRED = [
  '<600 GT',
  '≥600 GT',
  '≥2,000 GT',
  '≥5,000 GT',
  '≥10,000 GT',
  '≥20,000 GT',
  '≥50,000 GT',
  '≥100,000 GT',
  '≥200,000 GT',
  '≥500,000 GT',
];

type VipCardStatus = 'current' | 'achieved' | 'locked';

type VipCardCarouselProps = {
  selected: number;
  onSelect: (level: number) => void;
  onSellClick?: () => void;
};

function formatFactorPercent(factor: BN | undefined, displayDecimals = 0): string | null {
  if (!factor) return null;
  return `${formatAmount(factor.muln(100), 20, displayDecimals, true, true)}%`;
}

/** Combined discount: 1 − (1 − vip) × (1 − referral) */
function combineDiscountFactors(vip: BN, referral: BN): BN {
  return ONE_USD.sub(
    ONE_USD.sub(vip).mul(ONE_USD.sub(referral)).div(ONE_USD)
  );
}

function parsePercentString(value: string): number {
  return Number.parseFloat(value.replace('%', '')) || 0;
}

function formatCombinedPercentFromStrings(vipPct: string, referralPct: string): string {
  const vip = parsePercentString(vipPct) / 100;
  const referral = parsePercentString(referralPct) / 100;
  const max = (1 - (1 - vip) * (1 - referral)) * 100;
  const rounded = Math.round(max * 10) / 10;
  return `${rounded}%`;
}

function formatGtRequired(level: number, ranks: BN[] | undefined, gtDecimals: number): string {
  if (!ranks?.length) return FALLBACK_GT_REQUIRED[level] ?? '—';

  if (level === 0) {
    if (!ranks[0]) return FALLBACK_GT_REQUIRED[0];
    return `<${formatAmount(ranks[0], gtDecimals, 0, true)} GT`;
  }

  const threshold = ranks[level - 1];
  if (!threshold) return FALLBACK_GT_REQUIRED[level] ?? '—';
  return `≥${formatAmount(threshold, gtDecimals, 0, true)} GT`;
}

function getCardStatus(level: number, userRank: number): VipCardStatus {
  if (level === userRank) return 'current';
  if (level < userRank) return 'achieved';
  return 'locked';
}

function VipCardCarousel({ selected, onSelect, onSellClick }: VipCardCarouselProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [earnOpen, setEarnOpen] = useState(false);
  const hideSellActions = getGmw446Enabled();
  const userRank = useAppStore(selectGtUserDetailsRank) || 0;
  const userAmount = useAppStore(selectGtUserDetailsAmount);
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals) || 7;
  const ranks = useAppStore(selectGtGlobalDetailsRanks);
  const orderFeeDiscountFactors = useAppStore(selectGtGlobalDetailsOrderFeeDiscountFactors);
  const referralRewardFactors = useAppStore(selectGtGlobalDetailsReferralRewardFactors);
  const referralDiscountFactor = useAppStore(selectGtGlobalDetailsReferralDiscountFactor);
  
  const gtPointsDisplay = useMemo(() => {
    return `${formatAmount(userAmount || BN_ZERO, gtDecimals, 2, true)} GT`;
  }, [userAmount, gtDecimals]);

  const cards = useMemo(() => {
    const referralDiscountFromChain =
      referralDiscountFactor && !referralDiscountFactor.isZero()
        ? formatFactorPercent(referralDiscountFactor)
        : null;
    const referralDiscount = referralDiscountFromChain ?? FALLBACK_REFERRAL_DISCOUNT;

    return VIP_LEVELS.map((level) => {
      const vipFeeFromChain = formatFactorPercent(orderFeeDiscountFactors?.[level]);
      const vipFeeDiscount = vipFeeFromChain ?? FALLBACK_FEE_DISCOUNT[level];
      const referralRewardsFromChain = formatFactorPercent(referralRewardFactors?.[level]);
      const status = getCardStatus(level, userRank);

      const vipFactor = orderFeeDiscountFactors?.[level];
      const maxDiscount =
        vipFactor && referralDiscountFactor && !referralDiscountFactor.isZero()
          ? formatFactorPercent(combineDiscountFactors(vipFactor, referralDiscountFactor), 1) ??
            formatCombinedPercentFromStrings(vipFeeDiscount, referralDiscount)
          : formatCombinedPercentFromStrings(vipFeeDiscount, referralDiscount);

      let nextLevelHint: ReactNode = null;
      if (level >= 9) {
        nextLevelHint = <Trans>Max VIP level</Trans>;
      } else if (ranks?.[level]) {
        const threshold = ranks[level];
        const amount = userAmount || BN_ZERO;
        const remaining = threshold.gt(amount) ? threshold.sub(amount) : BN_ZERO;
        nextLevelHint = `${formatAmount(remaining, gtDecimals, 2, true)} GT to VIP ${level + 1}`;
      } else {
        nextLevelHint = `— GT to VIP ${level + 1}`;
      }

      return {
        level,
        status,
        gtRequired: formatGtRequired(level, ranks, gtDecimals),
        nextLevelHint,
        vipFeeDiscount,
        referralDiscount,
        maxDiscount,
        calculationFormula: `1 − (1 − ${vipFeeDiscount}) × (1 − ${referralDiscount}) = ${maxDiscount}`,
        referralRewards: referralRewardsFromChain ?? FALLBACK_REFERRAL_REWARDS,
      };
    });
  }, [
    orderFeeDiscountFactors,
    referralRewardFactors,
    referralDiscountFactor,
    ranks,
    userRank,
    userAmount,
    gtDecimals,
  ]);

  // Match Flutter PageView: opacity / blur / translateY / scale by slide distance.
  // Horizontal translate compensates the visual gap created by center-origin scale.
  const applySlideEffects = (swiper: SwiperInstance) => {
    const slideWidth = swiper.width || 0;
    swiper.slides.forEach((slideEl) => {
      const progress =
        (slideEl as HTMLElement & { progress?: number }).progress ?? 0;
      const distance = Math.min(Math.abs(progress), 1);
      const opacity = Math.max(0, 1 - distance * 0.7);
      const blurSigma = distance * 7;
      const translateY = distance * 20;
      const scale = 1 - distance * 0.5;
      // Partially close the scale gap, leave a small intentional space between cards
      const GAP_PX = 16;
      const fullPull = ((1 - scale) / 2) * slideWidth;
      const translateX =
        progress === 0 ? 0 : Math.sign(progress) * Math.max(0, fullPull - GAP_PX / 2);

      const card = slideEl.querySelector('.vip-card-unit') as HTMLElement | null;
      if (!card) return;
      card.style.opacity = String(opacity);
      card.style.filter = `blur(${blurSigma}px)`;
      card.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    });
  };

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    if (swiper.activeIndex !== selected) {
      swiper.slideTo(selected);
    }
  }, [selected]);

  const handleEarnClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setEarnOpen(true);
  };

  const handleSellClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onSellClick?.();
  };

  const renderActionButtons = () => (
    <>
      <button
        type="button"
        className="vip-card-action-btn"
        onClick={handleEarnClick}
      >
        <Trans>Earn GT</Trans>
        <img src={ArrowRight} alt="" />
      </button>
      <button
        type="button"
        className="vip-card-action-btn"
        onClick={handleSellClick}
      >
        <Trans>Sell GT</Trans>
        <img src={ArrowRight} alt="" />
      </button>
    </>
  );

  return (
    <div className="vip-card-carousel">
      <Swiper
        slidesPerView={1}
        spaceBetween={0}
        speed={450}
        watchSlidesProgress
        initialSlide={selected}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          applySlideEffects(swiper);
        }}
        onProgress={applySlideEffects}
        onSetTranslate={applySlideEffects}
        onSlideChange={(swiper) => {
          if (swiper.activeIndex !== selected) {
            onSelect(swiper.activeIndex);
          }
        }}
      >
        {cards.map((card) => (
          <SwiperSlide key={card.level}>
            <div className={`vip-card-unit is-${card.status}`}>
              <div className="vip-card">
                <div className="vip-card-left">
                  <div className="vip-card-title">VIP {card.level}</div>
                  <div className="vip-card-points">
                    {card.status === 'current' ? (
                      <>
                        <div className="vip-card-points-label">
                          <Trans>My GT Points</Trans>
                        </div>
                        <div className="vip-card-points-value">{gtPointsDisplay}</div>
                        <div className="vip-card-points-hint">{card.nextLevelHint}</div>
                      </>
                    ) : (
                      <>
                        <div className="vip-card-points-label">
                          <Trans>GT Required</Trans>
                        </div>
                        <div className="vip-card-points-value">{card.gtRequired}</div>
                        <div className={`vip-card-status is-${card.status}`}>
                          <div className="vip-card-status-dot" aria-hidden="true" />
                          <span>
                            {card.status === 'achieved' ? (
                              <Trans>Achieved</Trans>
                            ) : (
                              <Trans>Locked</Trans>
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="vip-card-stats">
                  <div className="vip-card-stat">
                    <TooltipWithPortal
                      disableHandleStyle
                      shouldStopPropagation
                      fitContentWidth
                      position="top"
                      handleClassName="vip-card-fee-tooltip-handle"
                      handle={
                        <div className="vip-card-stat-value is-underlined">
                          {card.maxDiscount}
                        </div>
                      }
                      renderContent={() => (
                        <div className="vip-fee-discount-tooltip">
                          <div className="vip-fee-discount-tooltip-row">
                            <span className="is-secondary">
                              {t`Maximum Discount on VIP ${card.level}`}
                            </span>
                            <span className="is-value">{card.maxDiscount}</span>
                          </div>
                          <div className="vip-fee-discount-tooltip-row">
                            <span className="is-secondary">
                              <Trans>Discount Breakdown</Trans>
                            </span>
                          </div>
                          <div className="vip-fee-discount-tooltip-row">
                            <span className="is-inactive">
                              <Trans>VIP Fee Discount</Trans>
                            </span>
                            <span className="is-value">{card.vipFeeDiscount}</span>
                          </div>
                          <div className="vip-fee-discount-tooltip-row">
                            <span className="is-inactive">
                              <Trans>Referral Discount</Trans>
                            </span>
                            <span className="is-value">{card.referralDiscount}</span>
                          </div>
                          <div className="vip-fee-discount-tooltip-row">
                            <span className="is-secondary">
                              <Trans>How It&apos;s Calculated</Trans>
                            </span>
                            <span className="is-value">{card.calculationFormula}</span>
                          </div>
                        </div>
                      )}
                    />
                    <div className="vip-card-stat-label">
                      <Trans>Trading Fee Discount</Trans>
                    </div>
                  </div>
                  <div className="vip-card-stat">
                    <div className="vip-card-stat-value">{card.referralRewards}</div>
                    <div className="vip-card-stat-label">
                      <Trans>Referral Rewards</Trans>
                    </div>
                  </div>
                </div>
              </div>

              {!hideSellActions && (
                <div className="vip-card-actions vip-card-actions--in-slide">
                  {renderActionButtons()}
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {!hideSellActions && (
        <>
          <div className="vip-card-actions vip-card-actions--fixed">
            {renderActionButtons()}
          </div>

          {earnOpen && (
            <FloatingPortal>
              <EarnGtPanel onClose={() => setEarnOpen(false)} />
            </FloatingPortal>
          )}
        </>
      )}
    </div>
  );
}

export default VipCardCarousel;
