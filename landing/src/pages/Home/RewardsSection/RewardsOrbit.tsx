import { useInView } from "framer-motion";
import { useRef, type CSSProperties } from "react";

import useIsWindowVisible from "lib/useIsWindowVisible";

import innerOrbit from "img/rewards-landing/promo-orbit-inner.svg";
import middleOrbit from "img/rewards-landing/promo-orbit-middle.svg";
import outerOrbit from "img/rewards-landing/promo-orbit-outer.svg";

const MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const STARTING_PHASE = 0.84;

export function RewardsOrbit() {
  const orbitRef = useRef<HTMLDivElement>(null);
  const inView = useInView(orbitRef);
  const windowVisible = useIsWindowVisible();

  return (
    <div className="home-rewards-orbit" ref={orbitRef} data-animate={inView && windowVisible} aria-hidden="true">
      <img className="home-rewards-orbit-inner" src={innerOrbit} alt="" />
      <img className="home-rewards-orbit-middle" src={middleOrbit} alt="" />
      <img className="home-rewards-orbit-outer" src={outerOrbit} alt="" />
      {MULTIPLIERS.map((multiplier, index) => (
        <span
          key={multiplier}
          className="home-rewards-sphere"
          style={{ "--sphere-phase": (STARTING_PHASE + index / MULTIPLIERS.length) % 1 } as CSSProperties}
        >
          <span>{multiplier}x</span>
        </span>
      ))}
    </div>
  );
}
