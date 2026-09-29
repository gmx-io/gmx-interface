import { Trans } from "@lingui/macro";
import cx from "classnames";
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
    <div
      className={cx(
        "rewards-spoiler relative h-full min-h-[477px] min-w-0 overflow-hidden rounded-20 [background:#090a14]",
        "max-mobile:min-h-[430px]",
        "[&>canvas]:pointer-events-none [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:opacity-[0]",
        "[&[data-ready='true']>.rewards-spoiler-source]:opacity-[0]",
        "[&[data-ready='true']>canvas]:opacity-[1]"
      )}
      data-ready={ready}
      style={style}
    >
      <div
        ref={sourceRef}
        className="rewards-spoiler-source pointer-events-none h-full [filter:blur(var(--rewards-spoiler-blur,_20px))_brightness(0.6)] [&>*]:h-full"
        aria-hidden="true"
      >
        {children}
      </div>
      <canvas ref={canvasRef} aria-hidden="true" />
      {onFocusAddress && (
        <button
          type="button"
          className={cx(
            "rewards-spoiler-button absolute inset-0 h-full w-full cursor-pointer rounded-[inherit] [background:transparent] [border:0]",
            "[&:active_.rewards-reveal-prompt]:shadow-none [&:active_.rewards-reveal-prompt]:[transform:translate(-50%,_-50%)_scale(0.98)]",
            "[&:focus-visible_.rewards-reveal-prompt]:border-[#ffffff40] [&:focus-visible_.rewards-reveal-prompt]:shadow-[0_0_20px_#7885ff26]",
            "[&:focus-visible_.rewards-reveal-prompt]:[background:#0101014d]",
            "[@media(hover:hover)]:[&:hover_.rewards-reveal-prompt]:border-[#ffffff40]",
            "[@media(hover:hover)]:[&:hover_.rewards-reveal-prompt]:shadow-[0_0_20px_#7885ff26]",
            "[@media(hover:hover)]:[&:hover_.rewards-reveal-prompt]:[background:#0101014d]",
            "[@media(hover:hover)]:[&:hover_.rewards-reveal-prompt]:[transform:translate(-50%,_calc(-50%_-_2px))]"
          )}
          aria-controls="rewards-address"
          onClick={onFocusAddress}
        >
          <span
            className={cx(
              "rewards-reveal-prompt absolute left-1/2 top-1/2 flex w-max max-w-[calc(100%_-_32px)] items-center justify-center gap-8 rounded-8 px-16 py-8",
              "text-16 leading-[24px] text-white [background:#01010133] [border:1px_solid_#ffffff26] [transform:translate(-50%,_-50%)]",
              "[transition:background-color_0.18s,_border-color_0.18s,_box-shadow_0.18s,_transform_0.18s_ease-out]",
              "[&_svg]:h-16 [&_svg]:w-16 [&_svg]:shrink-0"
            )}
          >
            <IcEye aria-hidden="true" />
            <Trans>Enter any wallet to see Comeback Bonus</Trans>
          </span>
        </button>
      )}
    </div>
  );
}
