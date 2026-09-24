import { useMedia } from 'react-use';
import { useState } from 'react';

import mobileExperiencePhone from '@/img/new-landing/mobile-experience-phone.png';
import testflightIcon from '@/img/new-landing/testflight-icon.png';

import { useScrollThresholdReveal } from '../hooks/useScrollThresholdReveal';

import '../scss/landingMobileExperience.scss';

export default function LandingMobileExperienceSection() {
  const isDesktop = useMedia('(min-width: 1280px)');
  const isMobile = useMedia('(max-width: 767px)');
  const [isTestFlightOpen, setIsTestFlightOpen] = useState(false);
  const { ref: phoneWrapRef, isRevealed } = useScrollThresholdReveal({
    enabled: isDesktop,
    thresholdVh: 15,
    threshold: 0,
  });
  const isPreReveal = isDesktop && !isRevealed;

  return (
    <section className="landing-mobile-experience">
      <div className="landing-mobile-experience__glow" aria-hidden="true" />
      <div className="landing-mobile-experience__inner">
        <div
          className={`landing-mobile-experience__copy${
            isPreReveal ? ' landing-mobile-experience__copy--pre-reveal' : ''
          }`}
        >
          <h2 className="landing-mobile-experience__title  ">
            <span className="font-nunito">GMTrade</span>
            <span className="font-nunito">Mobile App</span>
          </h2>
          <p className="landing-mobile-experience__description">
            A next-gen trading experience, built for mobile.
          </p>
          <button
            type="button"
            className={`landing-mobile-experience__testflight${
              isTestFlightOpen ? ' landing-mobile-experience__testflight--soon-open' : ''
            }`}
            aria-disabled="true"
            onClick={() => {
              if (isMobile) {
                setIsTestFlightOpen((isOpen) => !isOpen);
              }
            }}
          >
            <img src={testflightIcon} alt="" aria-hidden="true" />
            <span>iOS TestFlight</span>
            <span className="landing-mobile-experience__soon">Coming Soon</span>
          </button>
        </div>

        <div
          ref={phoneWrapRef}
          className={`landing-mobile-experience__phone-wrap${
            isPreReveal
              ? ' landing-mobile-experience__phone-wrap--pre-reveal'
              : ''
          }`}
          aria-hidden="true"
        >
          <img
            src={mobileExperiencePhone}
            alt=""
            className="landing-mobile-experience__phone"
          />
        </div>
      </div>
      <div className="landing-mobile-experience__fade" aria-hidden="true" />
      <div
        className="landing-mobile-experience__fade-mobile block xl:hidden"
        aria-hidden="true"
      />
    </section>
  );
}
