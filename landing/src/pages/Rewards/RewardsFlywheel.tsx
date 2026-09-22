import { Trans } from "@lingui/macro";
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
    <div className="rewards-cycle" ref={flywheelRef}>
      <div className="rewards-cycle-track" ref={trackRef} aria-hidden="true">
        <img className="rewards-cycle-outer-ring" src={outerRing} alt="" loading="lazy" />
        <img className="rewards-cycle-ring-background" src={ring} alt="" loading="lazy" />
        <svg className="rewards-cycle-ring" viewBox="0 0 442 442">
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
        <img className="rewards-cycle-inner-ring" src={innerRing} alt="" loading="lazy" />
        <img className="rewards-cycle-center-ring" src={centerRing} alt="" loading="lazy" />
        <img className="rewards-cycle-logo" src={logo} alt="" loading="lazy" />
      </div>
      <div className="rewards-cycle-steps">
        <div className="rewards-cycle-trade" data-flywheel-node>
          <span className="rewards-cycle-step-title">
            <Trans>Trade</Trans>
          </span>
          <span className="rewards-cycle-label">
            <Trans>Pay fees on any trade</Trans>
          </span>
        </div>
        <div className="rewards-cycle-earn" data-flywheel-node>
          <span className="rewards-cycle-step-title">
            <Trans>Earn</Trans>
          </span>
          <span className="rewards-cycle-label">
            <Trans>esGMX rewards</Trans>
          </span>
        </div>
        <div className="rewards-cycle-stake" data-flywheel-node>
          <span className="rewards-cycle-step-title">
            <Trans>Stake</Trans>
          </span>
          <span className="rewards-cycle-label">
            <Trans>Stake the esGMX</Trans>
          </span>
        </div>
        <div className="rewards-cycle-multiply" data-flywheel-node>
          <span className="rewards-cycle-step-title">
            <Trans>Multiply</Trans>
          </span>
          <span className="rewards-cycle-label">
            <Trans>Higher multiplier</Trans>
          </span>
        </div>
      </div>
      <div className="rewards-cycle-copy">
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
