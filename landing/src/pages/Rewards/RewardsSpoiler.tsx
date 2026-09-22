import { Trans } from "@lingui/macro";
import { useSpoilerBlur } from "landing/hooks/useSpoilerBlur";
import type { ReactNode } from "react";

import IcEye from "img/rewards-landing/reveal-eye.svg?react";

export function RewardsSpoiler({ children, onFocusAddress }: { children: ReactNode; onFocusAddress?: () => void }) {
  const { sourceRef, canvasRef, ready } = useSpoilerBlur();
  return (
    <div className="rewards-spoiler" data-ready={ready}>
      <div ref={sourceRef} className="rewards-spoiler-source" aria-hidden="true">
        {children}
      </div>
      <canvas ref={canvasRef} aria-hidden="true" />
      {onFocusAddress && (
        <button
          type="button"
          className="rewards-spoiler-button"
          aria-controls="rewards-address"
          onClick={onFocusAddress}
        >
          <span className="rewards-reveal-prompt">
            <IcEye aria-hidden="true" />
            <Trans>Enter any wallet to see Comeback Bonus</Trans>
          </span>
        </button>
      )}
    </div>
  );
}
