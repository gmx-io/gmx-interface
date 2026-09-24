import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useMedia } from 'react-use';

import gtPointsLight from '@/img/new-landing/gt-points-light.svg';
import gtPointsLightActive from '@/img/new-landing/gt-points-light.png';
import gtPointsLiquidity from '@/img/new-landing/gt-points-liquidity.png';
import gtPointsRefer from '@/img/new-landing/gt-points-refer.png';
import gtPointsTrade from '@/img/new-landing/gt-points-trade.png';

import { useScrollThresholdReveal } from '../hooks/useScrollThresholdReveal';

import '../scss/landingGtPoints.scss';

type GtPointsCard = {
  title: ReactNode;
  description: ReactNode;
  description2?: ReactNode;
  image: string;
  imageClassName: string;
};

const CARDS: GtPointsCard[] = [
  {
    title: 'Trade',
    description: 'Earn GT ',
    description2: 'from every trade you make.',
    image: gtPointsTrade,
    imageClassName: 'landing-gt-points-card__orb--trade',
  },
  {
    title: 'Provide Liquidity',
    description: 'Earn trading fees ',
    description2: 'while receiving additional GT rewards.',
    image: gtPointsLiquidity,
    imageClassName: 'landing-gt-points-card__orb--liquidity',
  },
  {
    title: 'Refer',
    description: 'Earn passive rewards ',
    description2: "from your referrals' trading.",
    image: gtPointsRefer,
    imageClassName: 'landing-gt-points-card__orb--refer',
  },
];

export default function LandingGtPointsSection() {
  const isDesktop = useMedia('(min-width: 1280px)');
  const cardsRef = useRef<HTMLDivElement>(null);
  const { ref: copyRef, isRevealed: areCardsRevealed } =
    useScrollThresholdReveal<HTMLAnchorElement>({
      enabled: isDesktop,
      thresholdVh: 8,
      threshold: 1,
    });
  const sectionClassName = `landing-gt-points ${
    areCardsRevealed || !isDesktop ? 'is-cards-revealed' : ''
  }`;

  return (
    <section className={sectionClassName}>
      <div className="landing-gt-points__inner">
        <div className="landing-gt-points__copy">
          <h2 className="landing-gt-points__title  ">
            <span className="font-nunito">Every Action</span>
            <div className="flex max-w-fit">
              <span className="font-nunito mr-8">Earns</span>
              <span className="font-nunito landing-gt-points__accent">
                GT Points
              </span>
            </div>
          </h2>
          <div className="landing-gt-points__content">
            <div className="landing-gt-points__description">
              <div>
                GT is an on-chain point system that becomes harder to earn over
                time.
              </div>
              <div>Early participation gives you a lasting advantage.</div>
            </div>

            <Link ref={copyRef} to="/gt" className="landing-gt-points__button">
              View More
            </Link>
          </div>
        </div>

        <div ref={cardsRef} className="landing-gt-points__cards">
          {CARDS.map((card) => (
            <article className="landing-gt-points-card" key={card.image}>
              <img
                src={gtPointsLight}
                alt=""
                aria-hidden="true"
                className="landing-gt-points-card__light"
              />
              <img
                src={gtPointsLightActive}
                alt=""
                aria-hidden="true"
                className="landing-gt-points-card__light-active"
              />
              <img
                src={card.image}
                alt=""
                aria-hidden="true"
                className={`landing-gt-points-card__orb ${card.imageClassName}`}
              />
              <div className="landing-gt-points-card__copy">
                <h3>{card.title}</h3>
                <div>
                  <p>{card.description}</p>
                  <p>{card.description2}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
