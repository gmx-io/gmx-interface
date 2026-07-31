import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { PointerEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { REWARDS_ONBOARDING_DISMISSED_KEY } from "config/localStorage";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CandlesIcon from "img/ic_candles_filled.svg?react";
import GmxIcon from "img/ic_gmx_glyph.svg?react";
import HourglassIcon from "img/ic_hourglass.svg?react";
import InfoIcon from "img/ic_info_circle.svg?react";
import MultiplierIcon from "img/ic_multiplier_solid.svg?react";
import RewardsIcon from "img/ic_rewards.svg?react";
import StatsIcon from "img/ic_stats.svg?react";
import EsGmxIcon from "img/tokens/ic_esgmx.svg?react";

const SLIDE_COUNT = 4;
const SWIPE_THRESHOLD_PX = 40;

type DiagramPillProps = {
  children: ReactNode;
  className: string;
  icon?: ReactNode;
  tone?: "blue" | "green";
};

function DiagramPill({ children, className, icon, tone = "blue" }: DiagramPillProps) {
  return (
    <div
      className={cx(
        "absolute z-10 flex h-36 items-center gap-6 whitespace-nowrap rounded-12 border-1/2 px-12 text-14 font-medium",
        tone === "green"
          ? "border-green-300/70 bg-green-900/60 text-green-800 dark:text-green-300"
          : "border-blue-300/70 bg-cold-blue-900 text-blue-700 dark:text-blue-100",
        className
      )}
    >
      {icon}
      {children}
    </div>
  );
}

function DiagramCircle({ children, className, icon }: { children?: ReactNode; className: string; icon: ReactNode }) {
  return (
    <div
      className={cx(
        "absolute z-10 flex size-[136px] items-center justify-center rounded-full border-1/2 border-dashed border-blue-300/50",
        className
      )}
    >
      <div className="flex size-[120px] flex-col items-center justify-center gap-4 rounded-full border-1/2 border-blue-300 bg-slate-950 text-blue-700 dark:text-blue-100">
        {icon}
        {children ? <span className="text-14 font-medium">{children}</span> : null}
      </div>
    </div>
  );
}

function Connector({ className }: { className: string }) {
  return <div className={cx("absolute border-t-1/2 border-dashed border-blue-300/60", className)} />;
}

function DiagramViewport({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[200px] w-full shrink-0 justify-center max-[479px]:h-[180px] max-[453px]:h-[160px] max-[407px]:h-[140px] max-[361px]:h-[120px]">
      <div className="origin-top max-[479px]:scale-90 max-[453px]:scale-[0.8] max-[407px]:scale-[0.7] max-[361px]:scale-[0.6]">
        {children}
      </div>
    </div>
  );
}

function RewardsProgramDiagram() {
  return (
    <div className="relative h-[200px] w-[460px]" aria-hidden="true">
      <DiagramPill className="left-12 top-52">
        <Trans>Trader</Trans>
      </DiagramPill>
      <DiagramPill className="left-12 top-[112px]">
        <Trans>Affiliate</Trans>
      </DiagramPill>
      <Connector className="left-[82px] top-[70px] w-[86px]" />
      <Connector className="left-[91px] top-[130px] w-[77px]" />
      <div className="absolute left-[150px] top-[70px] h-[60px] border-l-1/2 border-dashed border-blue-300/60" />
      <Connector className="left-[150px] top-[100px] w-[18px]" />
      <DiagramCircle className="left-[168px] top-32" icon={<GmxIcon className="size-48" />}>
        <Trans>Rewards</Trans>
      </DiagramCircle>
      <Connector className="left-[304px] top-[100px] w-[144px]" />
    </div>
  );
}

function MultiplierInputsDiagram() {
  return (
    <div className="relative h-[200px] w-[460px]" aria-hidden="true">
      <DiagramPill className="left-12 top-18" icon={<StatsIcon className="size-16" />}>
        <Trans>Volume</Trans>
      </DiagramPill>
      <DiagramPill className="left-12 top-82" icon={<GmxIcon className="size-16" />}>
        <Trans>Staking</Trans>
      </DiagramPill>
      <DiagramPill className="left-12 top-[146px]" icon={<CandlesIcon className="size-16" />}>
        <Trans>Trading activity</Trans>
      </DiagramPill>
      <Connector className="left-[104px] top-36 w-[188px]" />
      <Connector className="left-[105px] top-[100px] w-[187px]" />
      <Connector className="left-[139px] top-[164px] w-[153px]" />
      <div className="absolute left-[274px] top-36 h-[128px] border-l-1/2 border-dashed border-blue-300/60" />
      <DiagramCircle className="left-[292px] top-32" icon={<MultiplierIcon className="size-40 text-blue-300" />}>
        <Trans>Multiplier</Trans>
      </DiagramCircle>
    </div>
  );
}

function RewardsOutputDiagram() {
  return (
    <div className="relative h-[200px] w-[460px]" aria-hidden="true">
      <DiagramCircle className="left-36 top-32" icon={<MultiplierIcon className="size-40 text-blue-300" />}>
        <Trans>Multiplier</Trans>
      </DiagramCircle>
      <Connector className="left-[172px] top-[100px] w-[84px]" />
      <div className="absolute left-[256px] top-64 h-72 border-l-1/2 border-dashed border-blue-300/60" />
      <Connector className="left-[256px] top-64 w-28" />
      <Connector className="left-[256px] top-[136px] w-28" />
      <DiagramPill className="left-[284px] top-46" icon={<EsGmxIcon className="size-18" />} tone="green">
        <Trans>esGMX Rewards</Trans>
      </DiagramPill>
      <DiagramPill className="left-[284px] top-[118px]" tone="green">
        <Trans>GT Rewards</Trans>
      </DiagramPill>
    </div>
  );
}

function RewardsDistributionDiagram() {
  return (
    <div className="relative h-[200px] w-[460px]" aria-hidden="true">
      <DiagramPill className="left-4 top-44" icon={<EsGmxIcon className="size-18" />} tone="green">
        <Trans>esGMX</Trans>
      </DiagramPill>
      <Connector className="left-[94px] top-62 w-28" />
      <ArrowRightIcon className="absolute left-[116px] top-[54px] z-10 size-16 text-green-300" />
      <DiagramPill className="left-[132px] top-44" icon={<HourglassIcon className="size-16" />} tone="green">
        <Trans>Vesting</Trans>
      </DiagramPill>
      <Connector className="left-[224px] top-62 w-28" />
      <ArrowRightIcon className="absolute left-[246px] top-[54px] z-10 size-16 text-green-300" />
      <DiagramPill className="left-[262px] top-44" icon={<GmxIcon className="size-16" />} tone="green">
        <Trans>GMX</Trans>
      </DiagramPill>

      <DiagramPill className="left-4 top-[124px]" tone="green">
        <Trans>GT</Trans>
      </DiagramPill>
      <Connector className="left-62 top-[142px] w-[70px]" />
      <ArrowRightIcon className="absolute left-[116px] top-[134px] z-10 size-16 text-green-300" />
      <DiagramPill className="left-[132px] top-[124px]" icon={<RewardsIcon className="size-16" />} tone="green">
        <Trans>Accumulates</Trans>
      </DiagramPill>
    </div>
  );
}

function SlideContent({ index }: { index: number }) {
  if (index === 0) {
    return (
      <>
        <DiagramViewport>
          <RewardsProgramDiagram />
        </DiagramViewport>
        <div className="flex min-h-[104px] w-full max-w-[360px] flex-col items-center gap-8 text-center">
          <h2 className="text-h2 text-typography-primary">
            <Trans>Welcome to GMX Rewards</Trans>
          </h2>
          <p className="text-body-medium max-w-[360px] text-typography-secondary">
            <Trans>
              GMX Rewards is a rewards program for active traders and affiliates. Trade and stake on GMX to earn up to
              120% of your fees as rewards.
            </Trans>
          </p>
        </div>
      </>
    );
  }

  if (index === 1) {
    return (
      <>
        <DiagramViewport>
          <MultiplierInputsDiagram />
        </DiagramViewport>
        <div className="flex min-h-[104px] w-full max-w-[360px] flex-col items-center gap-8 text-center">
          <h2 className="text-h2 text-typography-primary">
            <Trans>Your multiplier is at the core of the rewards program</Trans>
          </h2>
          <p className="text-body-medium max-w-[360px] text-typography-secondary">
            <Trans>
              It determines how many rewards you earn and is based on your trading volume, GMX staking, and
              participation in trading activities.
            </Trans>
          </p>
        </div>
      </>
    );
  }

  if (index === 2) {
    return (
      <>
        <DiagramViewport>
          <RewardsOutputDiagram />
        </DiagramViewport>
        <div className="flex min-h-[104px] w-full max-w-[360px] flex-col items-center gap-8 text-center">
          <h2 className="text-h2 text-typography-primary">
            <Trans>The higher the multiplier, the more rewards you receive</Trans>
          </h2>
          <p className="text-body-medium max-w-[360px] text-typography-secondary">
            <Trans>Rewards are distributed each epoch in esGMX and GT tokens.</Trans>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <DiagramViewport>
        <RewardsDistributionDiagram />
      </DiagramViewport>
      <div className="flex min-h-[104px] w-full max-w-[360px] flex-col items-center gap-8 text-center">
        <h2 className="text-h2 text-typography-primary">
          <Trans>How rewards are distributed</Trans>
        </h2>
        <ul className="text-body-medium w-full list-disc space-y-4 pl-16 text-left text-typography-secondary">
          <li>
            <Trans>esGMX can be converted into GMX through vesting.</Trans>
          </li>
          <li>
            <Trans>
              GT accumulates in your account and will become available after the GT token generation event (TGE).
            </Trans>
          </li>
        </ul>
      </div>
    </>
  );
}

export function RewardsOnboardingModal({ shouldAutoOpen }: { shouldAutoOpen: boolean }) {
  const [dismissed, setDismissed] = useLocalStorageSerializeKeySafe<boolean>(REWARDS_ONBOARDING_DISMISSED_KEY, false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number }>();

  useEffect(() => {
    if (shouldAutoOpen && dismissed === false) {
      setIsVisible(true);
    }
  }, [dismissed, shouldAutoOpen]);

  const close = useCallback(() => {
    setIsVisible(false);
    setDismissed(true);
  }, [setDismissed]);

  const open = useCallback(() => {
    setActiveSlide(0);
    setIsVisible(true);
  }, []);

  const goToSlide = useCallback((nextSlide: number) => {
    setActiveSlide(Math.max(0, Math.min(nextSlide, SLIDE_COUNT - 1)));
  }, []);

  const goToRelativeSlide = useCallback(
    (offset: number) => {
      goToSlide(activeSlide + offset);
    },
    [activeSlide, goToSlide]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    swipeStartRef.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    goToRelativeSlide(deltaX < 0 ? 1 : -1);
  };

  const isLastSlide = activeSlide === SLIDE_COUNT - 1;

  return (
    <>
      <button
        type="button"
        className="flex shrink-0 items-center gap-8 py-8 pl-12 text-16 font-medium text-typography-secondary gmx-hover:text-typography-primary"
        onClick={open}
        aria-haspopup="dialog"
      >
        <Trans>How it works?</Trans>
        <InfoIcon className="size-20" />
      </button>

      <ModalWithPortal
        isVisible={isVisible}
        setIsVisible={(nextIsVisible) => {
          if (!nextIsVisible) close();
        }}
        label={t`How it works`}
        headerContent={
          <button
            type="button"
            className="absolute right-48 top-[22px] text-14 text-typography-secondary gmx-hover:text-typography-primary"
            onClick={close}
          >
            <Trans>Skip</Trans>
          </button>
        }
        contentClassName="relative w-[500px] [&_.Modal-header-wrapper]:pb-0 [&_.Modal-header-wrapper]:pt-20"
        contentPadding={false}
        hideHeaderBorder
        withMobileBottomPosition
      >
        <div
          className="flex h-[480px] flex-col px-20 pb-20 pt-20 outline-none"
          role="region"
          aria-roledescription="carousel"
          aria-label={t`How GMX Rewards works`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goToRelativeSlide(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goToRelativeSlide(-1);
            }
          }}
        >
          <div
            data-testid="rewards-onboarding-slide"
            className="flex flex-col items-center overflow-hidden [touch-action:pan-y]"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              swipeStartRef.current = undefined;
            }}
          >
            <div className="flex w-full flex-col items-center gap-20" aria-live="polite" aria-atomic="true">
              <SlideContent index={activeSlide} />
            </div>
          </div>

          <div className="mt-auto flex h-32 items-center justify-center">
            {Array.from({ length: SLIDE_COUNT }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t`Go to slide ${index + 1}`}
                aria-current={index === activeSlide}
                className={cx(
                  "flex size-24 items-center justify-center rounded-full transition-opacity",
                  index === activeSlide ? "opacity-100" : "opacity-40 gmx-hover:opacity-70"
                )}
                onClick={() => goToSlide(index)}
              >
                <span className="size-8 rounded-full bg-blue-300" />
              </button>
            ))}
          </div>

          <Button
            variant={isLastSlide ? "primary-action" : "secondary"}
            size={isLastSlide ? "small" : "controlled"}
            className={cx("h-56 w-full", !isLastSlide && "!gap-8 !px-24 !py-18 !text-16")}
            onClick={isLastSlide ? close : () => goToRelativeSlide(1)}
          >
            {isLastSlide ? (
              <Trans>Get started</Trans>
            ) : (
              <>
                <Trans>Next</Trans>
                <ArrowRightIcon className="size-24" />
              </>
            )}
          </Button>
        </div>
      </ModalWithPortal>
    </>
  );
}
