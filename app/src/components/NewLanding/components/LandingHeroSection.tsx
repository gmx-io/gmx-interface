import cx from 'classnames';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import { DEFAULT_DOCS_ENV } from '@/config/env';
import { getGmw412Enabled } from '@/config/featureFlagEnable';
import { useInViewport } from '@/hooks/utilsHooks/useInViewport';
import { useLandingStats } from '../hooks/useLandingStats';
import mainHero0 from '@/img/new-landing/main-hero-0.png';
import mainHero2 from '@/img/new-landing/main-hero-2.png';
import mainHero3 from '@/img/new-landing/main-hero-3.png';
import heroLight from '@/img/new-landing/hero-light.png';
import { useMedia } from 'react-use';

import '../scss/landingHero.scss';
import '../scss/landingInViewReveal.scss';

type LandingHeroSectionProps = {
  onLaunch: (e: React.MouseEvent) => void;
};

function StatItem({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex flex-col gap-[0.8rem]">
      <span className="text-[1.6rem] font-medium leading-[1.5] tracking-[-0.016rem] text-[#807F7E]">
        {label}
      </span>
      <span className="font-nunito text-[3.2rem] font-semibold leading-normal  tracking-[-0.032rem] text-[#F2F2F2] transition-all duration-300 hover:cursor-default hover:text-[#FA7B4E] md:text-[4.8rem] md:tracking-[-0.048rem]">
        {value}
      </span>
    </div>
  );
}

export default function LandingHeroSection({
  onLaunch,
}: LandingHeroSectionProps) {
  const { formatLiquidity, formatTraders, formatTotalVolume } =
    useLandingStats();
  const heroButtonsRef = useRef<HTMLDivElement>(null);
  const { isInView } = useInViewport({
    revealAfterScrollVh: 20,
    anchorRef: heroButtonsRef,
    once: true,
  });
  const isMobile = useMedia('(max-width: 767px)');
  return (
    <div className="w-full ">
      <div className="mx-auto flex  max-w-[144rem] flex-col items-center  md:px-[8rem]">
        <div
          className={cx(
            'hero-top-container flex flex-col items-center justify-center px-[2.4rem]',
            getGmw412Enabled() && 'gmw-412-enabled'
          )}
        >
          <HeroSectionAnimation />
          <div className="mb-[8.6rem] md:mb-[4.5rem] xl:mb-[13rem] flex max-w-[82.4rem] flex-col items-center gap-[2.4rem] text-center  ">
            <h1 className="text-[3.2rem] font-semibold leading-[1.05] tracking-[-0.04rem] text-[#F1F1F1] md:text-[6.4rem] md:tracking-[-0.064rem]">
              <span className="font-nunito block md:leading-[6.7rem]">
                Trade 60+ Global Markets from your wallet
              </span>
            </h1>
            <span className="px-[2.4rem] text-[1.4rem] font-normal leading-[1.2]  text-[#807F7E] md:text-[2rem]">
              Commodities, forex, equities, crypto, indexes and more — all
              accessible on-chain through a single trading engine.
            </span>
            <div
              ref={heroButtonsRef}
              className="mt-[2rem] flex flex-wrap items-center justify-center gap-[1.6rem]"
            >
              <button
                type="button"
                onClick={onLaunch}
                className="flex h-[4.4rem] items-center justify-center rounded-[1.2rem] bg-[#FA7B4E] px-[1.6rem] py-[0.8rem] text-[1.6rem] font-medium leading-[1.5] text-white transition-opacity duration-300 hover:opacity-80"
              >
                Start Trading
              </button>
              <ExternalLink
                href={DEFAULT_DOCS_ENV}
                className="ExternalLink flex h-[4.4rem] items-center justify-center rounded-[1.2rem] border border-[rgba(241,241,241,0.1)] bg-[#333333] px-[1.6rem] py-[0.8rem] text-[1.6rem] font-medium leading-[1.5] text-white no-underline "
              >
                Read Docs
              </ExternalLink>
            </div>
          </div>
        </div>

        <div
          className={cx(
            'landing-in-view-reveal',
            (isInView || isMobile) && 'is-in-view',
            'mt-[6rem] flex w-full flex-col items-start justify-between gap-40  px-[2.4rem] py-[4rem] md:mt-[0] md:items-center xl:flex-row'
          )}
        >
          <div className="flex w-full flex-col gap-[0.8rem] text-left md:text-center xl:max-w-[28.3rem] xl:text-left">
            <h2 className="font-nunito text-[2.4rem] font-semibold leading-[1.4] tracking-[-0.024rem] text-[#F1F1F1]">
              Trusted at Scale
            </h2>
            <p className="text-[1.4rem] font-normal leading-[1.5] tracking-[-0.014rem] text-[#807F7E]">
              A growing on-chain trading venue trusted by traders worldwide.
            </p>
          </div>

          <div className="flex w-full flex-col gap-[2.4rem] md:w-full md:flex-row  md:flex-nowrap md:justify-between md:gap-[4.8rem] xl:max-w-[73.5rem]">
            <StatItem label="Total Volume" value={formatTotalVolume()} />
            <StatItem label="Traders" value={formatTraders()} />
            <StatItem label="Liquidity" value={formatLiquidity()} />
          </div>
        </div>
      </div>
    </div>
  );
}

const HeroSectionAnimation = () => {
  return (
    <div className="hero-section-animation relative mt-[12.1rem] md:mt-[22.6rem] flex h-[20.4rem] md:h-[26.857rem] w-[40.857rem] flex-col items-center justify-center">
      <div className="hero-light-container ">
        <img src={heroLight} alt="" className="hero-light-image1" />
        <img src={heroLight} alt="" className="hero-light-image2" />
        <img src={heroLight} alt="" className="hero-light-image3" />
      </div>

      <div className="hero-main-1-float absolute left-1/2 top-[-1rem] z-[3]">
        <img
          src={mainHero0}
          alt=""
          width={122}
          className="absolute left-1/2 top-[3rem]  z-10 -translate-x-1/2"
        />
        <div className="hero-main-1-bottom relative left-1/2 top-1"></div>
      </div>
      {/* <img
        src={mainHero1}
        width={188}
        alt=""
        className="hero-main-1-float absolute left-1/2 top-0 z-[3]"
      /> */}
      <img
        src={mainHero2}
        width={255.9}
        alt=""
        className="absolute left-1/2 top-40 z-[2] -translate-x-1/2"
      />
      <img
        src={mainHero3}
        width={408.57}
        alt=""
        className="absolute left-1/2 top-0 z-[1] -translate-x-1/2"
      />
    </div>
  );
};
