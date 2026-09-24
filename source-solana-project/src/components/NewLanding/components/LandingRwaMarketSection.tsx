import cx from 'classnames';
import { useRef, type ReactNode } from 'react';
import { useMedia } from 'react-use';
import dashboard from '@/img/new-landing/dashboard.png';
import rwaMarketBg from '@/img/new-landing/rwa-market-bg2.png';
import { useScrollShrinkReveal } from '../hooks/useScrollShrinkReveal';
import FeatureCard from './FeatureCard';
import FeeCard from './FeeCard';
import UpLeverageCard from './UpLeverageCard';
import DeepLiquidity from './DeepLiquidity';
import Transparent from './Transparent';
import '../scss/landingRwaMarket.scss';

type RwaCard = {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
};

function getRwaCards(): RwaCard[] {
  return [
    {
      title: 'Up to 500x Leverage',
      description:
        'Flexible leverage for every risk profile. Maximize your capital efficiency.',
      children: <UpLeverageCard />,
    },
    {
      title: 'Deep Liquidity',
      description:
        'Trade any size against deep pooled liquidity. Low slippage, no fragmentation.',
      children: <DeepLiquidity />,
    },
    {
      title: 'Ultra-low Fees',
      description: 'Low gas on Solana, plus low trading fees on GMTrade markets.',
      children: <FeeCard />,
    },
    {
      title: 'Transparent',
      description:
        'All trades executed by audited smart contracts. Every position and liquidation visible on-chain.',
      children: <Transparent />,
    },
  ];
}

export default function LandingRwaMarketSection() {
  const isXl = useMedia('(min-width: 1280px)');
  const sectionContentRef = useRef<HTMLDivElement>(null);
  const cards = getRwaCards();

  return (
    <section className="relative mx-auto w-full overflow-hidden bg-[#131313] py-[10rem]">
      <img
        src={rwaMarketBg}
        alt=""
        className="pointer-events-none absolute bottom-0 left-0 h-1/2 w-full"
      />
      <div
        ref={sectionContentRef}
        className="relative mx-auto max-w-[144rem]  xl:px-[5.6rem]"
      >
        <h2 className=" mb-[4rem] text-center  text-[3.2rem] font-semibold leading-[4.7rem] tracking-[-0.032rem] md:mb-[5rem] md:text-[4.8rem] md:tracking-[-0.048rem] xl:mb-[0]">
          <span className="font-nunito block text-[#F1F1F1]">
            Trade RWA Markets
          </span>
          <span className="font-nunito block text-[#FA7B4E]">
            on Your Terms.
          </span>
        </h2>
        {isXl ? (
          <DesktopRwaMarket cards={cards} />
        ) : (
          <MobileRwaMarket cards={cards} />
        )}
      </div>
    </section>
  );
}

function DesktopRwaMarket({ cards }: { cards: RwaCard[] }) {
  const { ref: dashboardRef, isNormalScale, scale, isShrinking } =
    useScrollShrinkReveal({
      threshold: 1,
    });

  const cardRevealClassName = cx(
    'landing-rwa-card-reveal',
    isNormalScale && 'is-visible'
  );

  return (
    <div className="grid grid-cols-[24.8rem_1fr_24.8rem] grid-rows-[30rem_30rem] gap-x-[2.4rem] gap-y-[2.4rem]">
      <div className={cx(cardRevealClassName, 'row-start-1')}>
        <FeatureCard title={cards[0].title} description={cards[0].description}>
          {cards[0].children}
        </FeatureCard>
      </div>
      <div className={cx(cardRevealClassName, 'col-start-3 row-start-1')}>
        <FeatureCard title={cards[1].title} description={cards[1].description}>
          {cards[1].children}
        </FeatureCard>
      </div>
      <div
        ref={dashboardRef}
        className={cx(
          'landing-rwa-dashboard relative col-start-2 row-span-2 row-start-1 flex items-center justify-center',
          isShrinking && 'is-scroll-shrinking',
          isNormalScale && 'is-normal-scale'
        )}
        style={!isNormalScale ? { transform: `scale(${scale})` } : undefined}
      >
        <img
          src={dashboard}
          alt=""
          className="landing-rwa-dashboard-image w-full max-w-[75rem] object-contain"
        />
      </div>
      <div className={cx(cardRevealClassName, 'row-start-2')}>
        <FeatureCard title={cards[2].title} description={cards[2].description}>
          {cards[2].children}
        </FeatureCard>
      </div>
      <div className={cx(cardRevealClassName, 'col-start-3 row-start-2')}>
        <FeatureCard title={cards[3].title} description={cards[3].description}>
          {cards[3].children}
        </FeatureCard>
      </div>
    </div>
  );
}

const AXIS_LOCK_THRESHOLD_PX = 8;

function MobileRwaMarket({ cards }: { cards: RwaCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    axis: null as 'x' | 'y' | null,
  });

  const resetDragState = () => {
    dragStateRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      startScrollLeft: 0,
      axis: null,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const container = scrollRef.current;
    if (!container) return;

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: container.scrollLeft,
      axis: null,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    const state = dragStateRef.current;
    if (!container || state.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;

    if (state.axis === null) {
      if (
        Math.abs(deltaX) < AXIS_LOCK_THRESHOLD_PX &&
        Math.abs(deltaY) < AXIS_LOCK_THRESHOLD_PX
      ) {
        return;
      }

      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        state.axis = 'y';
        return;
      }

      if (container.scrollWidth <= container.clientWidth + 1) {
        state.axis = 'y';
        return;
      }

      state.axis = 'x';
      container.setPointerCapture(e.pointerId);
    }

    if (state.axis !== 'x') return;

    e.preventDefault();
    container.scrollLeft = state.startScrollLeft - deltaX;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    const state = dragStateRef.current;
    if (!container || state.pointerId !== e.pointerId) return;

    if (state.axis === 'x') {
      container.releasePointerCapture(e.pointerId);
    }
    resetDragState();
  };

  return (
    <div className="flex w-full flex-col items-center gap-[3.2rem] md:gap-[5.2rem] xl:gap-[2.4rem]">
      <div className="w-full px-[2.4rem] md:px-[3.2rem] xl:px-[0]">
        <img src={dashboard} alt="" className=" object-contain" />
      </div>
      <div
        ref={scrollRef}
        className="landing-rwa-mobile-cards scrollbar-hide w-full min-w-0 overflow-x-auto px-[2.4rem] md:px-[0]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex flex-col items-stretch justify-start gap-[2rem] md:w-max md:min-w-full md:flex-row md:justify-center">
          {cards.map((card, index) => (
            <div key={index} className="w-full shrink-0 md:w-[24.8rem]">
              <FeatureCard title={card.title} description={card.description}>
                {card.children}
              </FeatureCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
