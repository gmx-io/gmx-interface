import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useFlywheelAnimation } from "landing/hooks/useFlywheelAnimation";
import { useId } from "react";

import centerRing from "img/rewards-landing/flywheel-center-ring.webp";
import innerRing from "img/rewards-landing/flywheel-inner-ring.webp";
import logo from "img/rewards-landing/flywheel-logo.webp";
import outerRing from "img/rewards-landing/flywheel-outer-ring.svg";
import ring from "img/rewards-landing/flywheel-ring.webp";

export function RewardsFlywheel() {
  const { flywheelRef, trackRef, gradientRef } = useFlywheelAnimation();
  const gradientId = useId();

  return (
    <div
      className={cx(
        "relative mb-0 ml-auto mr-auto mt-80 grid h-[560px] max-w-[1152px] place-items-center text-center [--rewards-cycle-size:468px]",
        "max-mobile:mt-64 max-mobile:h-[calc(var(--rewards-cycle-size)_+_92px)] max-mobile:[--rewards-cycle-size:min(66vw,_360px)]"
      )}
      ref={flywheelRef}
    >
      <div
        className={cx(
          "pointer-events-none absolute left-1/2 top-1/2 h-[var(--rewards-cycle-size)] w-[var(--rewards-cycle-size)]",
          "[transform:translate(-50%,_-50%)]",
          "[&>.rewards-cycle-logo]:w-[59.829%] [&>.rewards-cycle-logo]:opacity-[0.3] [&>.rewards-cycle-logo]:[filter:blur(40px)]",
          "[&>.rewards-cycle-logo]:[transform:translate(-50%,_-55%)]",
          "[&>img]:absolute [&>img]:left-1/2 [&>img]:top-1/2 [&>img]:[transform:translate(-50%,_-50%)]"
        )}
        ref={trackRef}
        aria-hidden="true"
      >
        <img className="w-full" src={outerRing} alt="" loading="lazy" />
        <img className="w-[94.444%] [clip-path:circle(49.1%)]" src={ring} alt="" loading="lazy" />
        <svg className="absolute left-1/2 top-1/2 w-[94.444%] [transform:translate(-50%,_-50%)]" viewBox="0 0 442 442">
          <defs>
            <radialGradient id={gradientId} ref={gradientRef} cx="1" cy="0.5" r="0.5">
              <stop stopColor="#2d42fc" />
              <stop offset="1" stopColor="#2d42fc" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g fill="none" strokeWidth="4" strokeDasharray="0.25 0.75">
            <circle cx="221" cy="221" r="219" pathLength="172" stroke="#171827" />
            <circle cx="221" cy="221" r="219" pathLength="172" stroke={`url(#${gradientId})`} />
          </g>
        </svg>
        <img className="w-[82.051%] opacity-[0.2]" src={innerRing} alt="" loading="lazy" />
        <img className="w-[51.709%] opacity-[0.2]" src={centerRing} alt="" loading="lazy" />
        <img className="rewards-cycle-logo" src={logo} alt="" loading="lazy" />
      </div>
      <div
        className={cx(
          "absolute inset-0",
          "[&>.rewards-cycle-earn]:left-[calc(50%_+_var(--rewards-cycle-size)_/_2_+_4px)]",
          "max-mobile:[&>.rewards-cycle-earn]:left-[calc(50%_+_var(--rewards-cycle-size)_/_2)]",
          "[&>.rewards-cycle-multiply]:left-[calc(50%_-_var(--rewards-cycle-size)_/_2_-_4px)]",
          "max-mobile:[&>.rewards-cycle-multiply]:left-[calc(50%_-_var(--rewards-cycle-size)_/_2)]",
          "[&>.rewards-cycle-stake]:top-[calc(100%_-_65.5px)]",
          "max-mobile:[&>.rewards-cycle-stake]:top-[calc(100%_-_46px)] max-mobile:[&>.rewards-cycle-stake]:w-[160px]",
          "[&>.rewards-cycle-trade]:top-[65.5px]",
          "max-mobile:[&>.rewards-cycle-trade]:top-46 max-mobile:[&>.rewards-cycle-trade]:w-[160px]",
          "[&>div::before]:pointer-events-none [&>div::before]:absolute",
          "[&>div::before]:left-[calc(var(--rewards-light-x,_-1000px)_-_var(--rewards-node-x,_0px))]",
          "[&>div::before]:top-[calc(var(--rewards-light-y,_-1000px)_-_var(--rewards-node-y,_0px))] [&>div::before]:h-[148px] [&>div::before]:w-[200px]",
          "[&>div::before]:[background:url('../../src/img/rewards-landing/flywheel-step-glow.svg')_center_/_contain_no-repeat]",
          "[&>div::before]:[content:''] [&>div::before]:[transform:translate(-50%,_-50%)]",
          "[&>div]:absolute [&>div]:left-1/2 [&>div]:top-1/2 [&>div]:flex [&>div]:min-h-71 [&>div]:w-[193px] [&>div]:flex-col [&>div]:justify-center",
          "[&>div]:overflow-hidden [&>div]:rounded-16 [&>div]:px-12 [&>div]:py-16 [&>div]:text-16 [&>div]:font-medium [&>div]:leading-[24px]",
          "[&>div]:[background:#171827] [&>div]:[border:1px_solid_#3c406780] [&>div]:[transform:translate(-50%,_-50%)]",
          "max-mobile:[&>div]:w-[clamp(90px,_25vw,_150px)] max-mobile:[&>div]:px-6 max-mobile:[&>div]:py-12 max-mobile:[&>div]:text-12",
          "max-mobile:[&>div]:leading-[16px]"
        )}
      >
        <div className="rewards-cycle-trade" data-flywheel-node>
          <span className="relative text-12 uppercase leading-[15px] tracking-[0.002em] text-blue-300 [overflow-wrap:anywhere] max-mobile:text-[10px] max-mobile:leading-[15px]">
            <Trans>Trade</Trans>
          </span>
          <span className="relative [overflow-wrap:anywhere]">
            <Trans>Pay fees on any trade</Trans>
          </span>
        </div>
        <div className="rewards-cycle-earn" data-flywheel-node>
          <span className="relative text-12 uppercase leading-[15px] tracking-[0.002em] text-blue-300 [overflow-wrap:anywhere] max-mobile:text-[10px] max-mobile:leading-[15px]">
            <Trans>Earn</Trans>
          </span>
          <span className="relative [overflow-wrap:anywhere]">
            <Trans>esGMX rewards</Trans>
          </span>
        </div>
        <div className="rewards-cycle-stake" data-flywheel-node>
          <span className="relative text-12 uppercase leading-[15px] tracking-[0.002em] text-blue-300 [overflow-wrap:anywhere] max-mobile:text-[10px] max-mobile:leading-[15px]">
            <Trans>Stake</Trans>
          </span>
          <span className="relative [overflow-wrap:anywhere]">
            <Trans>Stake the esGMX</Trans>
          </span>
        </div>
        <div className="rewards-cycle-multiply" data-flywheel-node>
          <span className="relative text-12 uppercase leading-[15px] tracking-[0.002em] text-blue-300 [overflow-wrap:anywhere] max-mobile:text-[10px] max-mobile:leading-[15px]">
            <Trans>Multiply</Trans>
          </span>
          <span className="relative [overflow-wrap:anywhere]">
            <Trans>Higher multiplier</Trans>
          </span>
        </div>
      </div>
      <div
        className={cx(
          "relative flex w-[210px] flex-col gap-12",
          "[&_h3]:text-transparent [&_h3]:text-24 [&_h3]:leading-[28px] [&_h3]:tracking-[-0.032em] [&_h3]:[background-clip:text]",
          "[&_h3]:[background-image:linear-gradient(150deg,_#a4c3f9_15%,_#2d42fc_205%)]",
          "max-mobile:[&_h3]:text-18 max-mobile:[&_h3]:leading-[22px]",
          "max-mobile:w-[clamp(110px,_36vw,_190px)] max-mobile:gap-8",
          "[&_p]:text-14 [&_p]:leading-[20px] [&_p]:text-blue-300",
          "max-mobile:[&_p]:text-12 max-mobile:[&_p]:leading-[16px]"
        )}
      >
        <h3>
          <Trans>
            The Season 1
            <br />
            Flywheel
          </Trans>
        </h3>
        <p>
          <Trans>Your next trade earns more</Trans>
        </p>
      </div>
    </div>
  );
}
