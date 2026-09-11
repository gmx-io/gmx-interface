import { Trans } from "@lingui/macro";
import { useFlywheelAnimation } from "landing/hooks/useFlywheelAnimation";
import { useId } from "react";

export function RewardsFlywheel() {
  const { flywheelRef, pathRef, gradientRef } = useFlywheelAnimation();
  const gradientId = useId();

  return (
    <div className="rewards-cycle" ref={flywheelRef}>
      <svg className="rewards-cycle-track" aria-hidden="true">
        <defs>
          <radialGradient id={gradientId} ref={gradientRef} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2d42fc" />
            <stop offset="0.35" stopColor="#2d42fc" stopOpacity="0.9" />
            <stop offset="0.7" stopColor="#2d42fc" stopOpacity="0.45" />
            <stop offset="1" stopColor="#2d42fc" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect className="rewards-cycle-path" ref={pathRef} stroke="#1e2033" />
        <rect className="rewards-cycle-path rewards-cycle-light" stroke={`url(#${gradientId})`} />
      </svg>
      <div className="rewards-cycle-steps">
        <span data-flywheel-node>
          <span className="rewards-cycle-label">
            <Trans>Trade</Trans>
          </span>
        </span>
        <span data-flywheel-node>
          <span className="rewards-cycle-label">
            <Trans>Earn esGMX</Trans>
          </span>
        </span>
        <span data-flywheel-node>
          <span className="rewards-cycle-label">
            <Trans>Stake it</Trans>
          </span>
        </span>
        <span className="rewards-cycle-higher" data-flywheel-node>
          <span className="rewards-cycle-label">
            <Trans>Higher multiplier</Trans>
          </span>
        </span>
      </div>
      <div className="rewards-cycle-copy">
        <h3>
          <Trans>The Season 1 flywheel</Trans>
        </h3>
        <p>
          <Trans>...and it compounds, every week</Trans>
        </p>
      </div>
      <span className="rewards-cycle-next" data-flywheel-node>
        <span className="rewards-cycle-label">
          <Trans>Earn more on the next trade</Trans>
        </span>
      </span>
    </div>
  );
}
