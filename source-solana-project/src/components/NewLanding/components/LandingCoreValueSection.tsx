import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import { useMedia } from 'react-use';

import glvIcon from '@/img/new-landing/core-value/glv.png';
import gmIcon from '@/img/new-landing/core-value/gm.png';
import coreValueLight from '@/img/new-landing/core-value/light.png';
import { useLandingCoreValueMetrics } from '../hooks/useLandingCoreValueMetrics';
import { useScrollFlipReveal } from '../hooks/useScrollFlipReveal';
import { useScrollRangeProgress } from '../hooks/useScrollRangeProgress';
import { easeOutCubic } from '../hooks/scrollRevealUtils';

import '../scss/landingCoreValue.scss';

type LiquidityCard = {
  title: string;
  description: ReactNode;
  image: string;
  apr: string;
  caption: ReactNode;
};

const CARD_DEFINITIONS = [
  {
    key: 'GLV' as const,
    title: 'GLV',
    description:
      'Yield-optimized vaults supplying liquidity across multiple markets. Steady returns without management.',
    image: glvIcon,
    caption: 'avg. across GLV vaults',
  },
  {
    key: 'GM' as const,
    title: 'GM',
    description:
      'Provide liquidity to a single market. Invest with control over risk and reward.',
    image: gmIcon,
    caption: 'avg. across GM pools',
  },
];

export default function LandingCoreValueSection() {
  const isDesktop = useMedia('(min-width: 1280px)');
  const { totalFeesLabel, glvAvgApr30d, gmAvgApr30d } =
    useLandingCoreValueMetrics();
  const sectionRef = useRef<HTMLElement>(null);
  const revenueRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { ref: metricRef, progress: rawProgress } = useScrollRangeProgress({
    enabled: isDesktop,
    thresholdVh: 15,
    rangeVh: 45,
  });
  const progress = useMemo(
    () => (isDesktop ? easeOutCubic(rawProgress) : rawProgress),
    [isDesktop, rawProgress]
  );
  const { layoutRevealed } = useScrollFlipReveal(
    progress,
    [metricRef, revenueRef, cardsRef],
    {
      enabled: isDesktop,
      rootRef: sectionRef,
      metricRef,
      cardsRef,
      fadeInRefs: [revenueRef, cardsRef],
      fadeInConfig: [
        { start: 0.12, end: 0.58, translateY: 16 },
        { start: 0.32, end: 0.88, translateY: 24 },
      ],
    }
  );
  const isScrollRevealing = isDesktop && progress > 0 && progress < 1;
  const rootClassName = `landing-core-value ${
    layoutRevealed || !isDesktop ? 'is-revealed' : ''
  } ${isScrollRevealing ? 'is-scroll-revealing' : ''}`;
  const rootStyle = isDesktop
    ? ({
        '--core-value-reveal-progress': progress,
      } as CSSProperties)
    : undefined;

  const cards: LiquidityCard[] = useMemo(
    () =>
      CARD_DEFINITIONS.map((card) => ({
        title: card.title,
        description: card.description,
        image: card.image,
        apr: card.key === 'GLV' ? glvAvgApr30d : gmAvgApr30d,
        caption: card.caption,
      })),
    [glvAvgApr30d, gmAvgApr30d]
  );

  const feesHeading = `${totalFeesLabel}+ fees`;

  return (
    <section ref={sectionRef} className={rootClassName} style={rootStyle}>
      <div className="landing-core-value__inner">
        <div className="landing-core-value__header">
          <div className="landing-core-value__metric-wrap">
            <div className="landing-core-value__metric" ref={metricRef}>
              <h2 className="font-nunito">{feesHeading}</h2>
              <p>Distributed to Liquidity Providers</p>
            </div>
          </div>

          <div className="landing-core-value__revenue" ref={revenueRef}>
            <div className="landing-core-value__revenue-copy">
              <p>LPs capture the majority of protocol revenue {'\u2014'}</p>
              <p>
                <span>75%</span> by design.
              </p>
            </div>
            <Link to="/pools" className="landing-core-value__button">
              Start Earning
            </Link>
          </div>
        </div>

        <div ref={cardsRef} className="landing-core-value__cards">
          {cards.map((card) => (
            <article className="landing-core-value-card" key={card.title}>
              <img
                src={coreValueLight}
                alt=""
                aria-hidden="true"
                className="landing-core-value-card__light"
              />
              <div className="landing-core-value-card__top">
                <div className="landing-core-value-card__icon">
                  <img src={card.image} alt="" aria-hidden="true" />
                </div>
                <h3>{card.title}</h3>
              </div>
              <div className="landing-core-value-card__bottom">
                <p className="landing-core-value-card__description">
                  {card.description}
                </p>
                <div className="landing-core-value-card__apr">
                  <span className="font-nunito">30d Fee APR</span>
                  <strong className="font-nunito">{card.apr}</strong>
                  <span className="font-nunito">{card.caption}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
