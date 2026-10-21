import cx from "classnames";
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
    <div
      className={cx(
        "pointer-events-none absolute left-[calc(50%_+_55px)] top-[calc(50%_+_55px)] h-[263.422px] w-[970.193px]",
        "[--orbit-duration:60s] [container-type:size] [transform:translate(-50%,_-50%)_rotate(-31.39deg)]",
        "max-desktop:h-[240px] max-desktop:w-[830px]",
        "max-tablet:left-1/2 max-tablet:top-1/2 max-tablet:h-[110%] max-tablet:w-[160%]",
        "[&>img]:absolute [&>img]:left-1/2 [&>img]:top-1/2 [&>img]:max-w-none [&>img]:[transform:translate(-50%,_-50%)]",
        "[&[data-animate='true']_.home-rewards-sphere]:[animation-play-state:running]",
        "motion-reduce:[&[data-animate]_.home-rewards-sphere]:[animation-play-state:paused]"
      )}
      ref={orbitRef}
      data-animate={inView && windowVisible}
      aria-hidden="true"
    >
      <img className="h-full w-full" src={innerOrbit} alt="" />
      <img className="h-[108.342%] w-[108.342%]" src={middleOrbit} alt="" />
      <img className="h-[116.451%] w-[116.451%]" src={outerOrbit} alt="" />
      {MULTIPLIERS.map((multiplier, index) => (
        <span
          key={multiplier}
          className={cx(
            "home-rewards-sphere absolute left-0 top-0 grid h-88 w-88 animate-[home-rewards-orbit_var(--orbit-duration)_linear_infinite]",
            "place-items-center rounded-full text-[28px] leading-[32px] tracking-[-0.032em] shadow-[0_8px_28px_#00000059]",
            "[animation-delay:calc(-1_*_var(--sphere-phase)_*_var(--orbit-duration))] [animation-play-state:paused]",
            "[background:linear-gradient(135deg,_#2d42fc,_#1b2796)] [border:2px_solid_#ffffff26] [offset-anchor:center]",
            "[offset-path:ellipse(50cqw_50cqh_at_50cqw_50cqh)] [offset-rotate:31.39deg]",
            "max-tablet:text-18 max-tablet:h-56 max-tablet:w-56 max-tablet:leading-[24px]",
            "[&>span]:grid [&>span]:h-[68.182%] [&>span]:w-[68.182%] [&>span]:place-items-center [&>span]:rounded-full [&>span]:[background:#ffffff0d]"
          )}
          style={{ "--sphere-phase": (STARTING_PHASE + index / MULTIPLIERS.length) % 1 } as CSSProperties}
        >
          <span>{multiplier}x</span>
        </span>
      ))}
    </div>
  );
}
