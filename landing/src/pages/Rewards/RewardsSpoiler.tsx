import { Trans } from "@lingui/macro";
import { useSpoilerBlur } from "landing/hooks/useSpoilerBlur";
import { useMemo, type CSSProperties, type ReactNode } from "react";

import IcEye from "img/rewards-landing/reveal-eye.svg?react";

export function RewardsSpoiler({
  children,
  onFocusAddress,
  blurRadius = 30,
}: {
  children: ReactNode;
  onFocusAddress?: () => void;
  blurRadius?: number;
}) {
  const { sourceRef, canvasRef, ready } = useSpoilerBlur(blurRadius);
  const style = useMemo(
    () => ({ "--rewards-spoiler-blur": `${(blurRadius * 2) / 3}px` }) as CSSProperties,
    [blurRadius]
  );
  return (
    <div className="rewards-spoiler" data-ready={ready} style={style}>
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
