import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { REWARDS_ONBOARDING_DISMISSED_KEY } from "config/localStorage";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";

import Button from "components/Button/Button";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import InfoIcon from "img/ic_info_circle.svg?react";
import rewardsOnboardingFlowSrc from "img/rewards_onboarding_flow.svg";

import { REWARDS_ONBOARDING_OPEN_ACTION, REWARDS_ONBOARDING_SEARCH_PARAM } from "../rewardsRoutes";

const SLIDE_COUNT = 4;
const SWIPE_THRESHOLD_PX = 40;
const DIAGRAM_OFFSETS = [0, 308, 605, 880] as const;
const SLIDE_TRACK_STYLES = Array.from({ length: SLIDE_COUNT }, (_, index) => ({
  transform: `translate3d(${-index * 100}%, 0, 0)`,
}));
const DIAGRAM_TRACK_STYLES = DIAGRAM_OFFSETS.map((offset) => ({
  transform: `translate3d(${-offset}px, 0, 0)`,
}));

function clampSlide(index: number) {
  return Math.max(0, Math.min(index, SLIDE_COUNT - 1));
}

function RewardsFlowDiagram({ activeSlide }: { activeSlide: number }) {
  return (
    <div className="-mx-20 flex h-[200px] w-[calc(100%+40px)] shrink-0 justify-center overflow-hidden max-[479px]:h-[180px] max-[453px]:h-[160px] max-[407px]:h-[140px] max-[361px]:h-[120px]">
      <div className="relative h-[200px] w-[500px] shrink-0 origin-top overflow-hidden max-[479px]:scale-90 max-[453px]:scale-[0.8] max-[407px]:scale-[0.7] max-[361px]:scale-[0.6]">
        <img
          src={rewardsOnboardingFlowSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          data-testid="rewards-onboarding-diagram-track"
          className="pointer-events-none absolute left-20 top-0 h-[200px] w-[1340px] max-w-none select-none transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none"
          style={DIAGRAM_TRACK_STYLES[activeSlide]}
        />
        {activeSlide > 0 ? (
          <div className="to-transparent pointer-events-none absolute inset-y-0 left-0 z-10 w-40 bg-gradient-to-r from-slate-900" />
        ) : null}
        {activeSlide < SLIDE_COUNT - 1 ? (
          <div className="to-transparent pointer-events-none absolute inset-y-0 right-0 z-10 w-96 bg-gradient-to-l from-slate-900" />
        ) : null}
      </div>
    </div>
  );
}

function SlideContent({ index }: { index: number }) {
  if (index === 0) {
    return (
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
    );
  }

  if (index === 1) {
    return (
      <div className="flex min-h-[104px] w-full max-w-[360px] flex-col items-center gap-8 text-center">
        <h2 className="text-h2 text-typography-primary">
          <Trans>Your multiplier is at the core of the rewards program</Trans>
        </h2>
        <p className="text-body-medium max-w-[360px] text-typography-secondary">
          <Trans>
            It determines how many rewards you earn and is based on your trading volume, GMX staking, and participation
            in trading activities.
          </Trans>
        </p>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="flex min-h-[104px] w-full max-w-[360px] flex-col items-center gap-8 text-center">
        <h2 className="text-h2 text-typography-primary">
          <Trans>The higher the multiplier, the more rewards you receive</Trans>
        </h2>
        <p className="text-body-medium max-w-[360px] text-typography-secondary">
          <Trans>Rewards are distributed each epoch in esGMX and GT tokens.</Trans>
        </p>
      </div>
    );
  }

  return (
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
  );
}

export function RewardsOnboardingModal({ shouldAutoOpen }: { shouldAutoOpen: boolean }) {
  const [dismissed, setDismissed] = useLocalStorageSerializeKeySafe<boolean>(REWARDS_ONBOARDING_DISMISSED_KEY, false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const swipeStartRef = useRef<{ pointerId: number; x: number; y: number }>();
  const history = useHistory();
  const { pathname, search } = useLocation();

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

  useEffect(() => {
    const searchParams = new URLSearchParams(search);

    if (searchParams.get(REWARDS_ONBOARDING_SEARCH_PARAM) !== REWARDS_ONBOARDING_OPEN_ACTION) return;

    open();
    searchParams.delete(REWARDS_ONBOARDING_SEARCH_PARAM);
    const nextSearch = searchParams.toString();
    history.replace({ pathname, search: nextSearch ? `?${nextSearch}` : "" });
  }, [history, open, pathname, search]);

  const goToSlide = useCallback((nextSlide: number) => {
    setActiveSlide(clampSlide(nextSlide));
  }, []);

  const goToRelativeSlide = useCallback((offset: number) => {
    setActiveSlide((currentSlide) => clampSlide(currentSlide + offset));
  }, []);

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
        className="flex h-32 shrink-0 items-center justify-center gap-4 whitespace-nowrap rounded-8 px-12 py-8 text-13 font-medium leading-[1.25] tracking-[-0.156px] text-typography-secondary gmx-hover:text-typography-primary"
        onClick={open}
        aria-haspopup="dialog"
      >
        <Trans>How it works?</Trans>
        <InfoIcon className="size-16" />
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
            className="absolute right-20 top-[22px] flex items-center gap-4 text-14 text-typography-secondary gmx-hover:text-typography-primary"
            onClick={close}
          >
            <Trans>Skip</Trans>
            <CloseIcon className="size-16" aria-hidden="true" />
          </button>
        }
        contentClassName="relative w-[500px] [&_.Modal-header-wrapper]:pb-0 [&_.Modal-header-wrapper]:pt-20"
        contentPadding={false}
        hideCloseButton
        hideHeaderBorder
        withMobileBottomPosition
      >
        <div
          className="flex h-[480px] flex-col px-20 pb-20 pt-20 outline-none"
          role="region"
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
            className="w-full [touch-action:pan-y]"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              swipeStartRef.current = undefined;
            }}
          >
            <RewardsFlowDiagram activeSlide={activeSlide} />
            <div className="mt-20 w-full overflow-hidden">
              <div
                data-testid="rewards-onboarding-track"
                className="flex w-full min-w-0 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none"
                style={SLIDE_TRACK_STYLES[activeSlide]}
              >
                {Array.from({ length: SLIDE_COUNT }, (_, index) => (
                  <div
                    key={index}
                    data-testid="rewards-onboarding-panel"
                    className="flex w-full min-w-0 shrink-0 flex-col items-center"
                    role="group"
                    aria-label={t`Slide ${index + 1} of ${SLIDE_COUNT}`}
                    aria-hidden={index !== activeSlide}
                  >
                    <SlideContent index={index} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {t`Slide ${activeSlide + 1} of ${SLIDE_COUNT}`}
          </span>

          <div className="mt-auto flex w-full shrink-0 flex-col items-center">
            <div className="mb-32 flex h-8 items-center justify-center gap-8">
              {Array.from({ length: SLIDE_COUNT }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={t`Go to slide ${index + 1}`}
                  aria-current={index === activeSlide}
                  className={cx(
                    "relative size-8 rounded-full bg-blue-300 transition-opacity after:absolute after:-inset-4 after:content-['']",
                    index === activeSlide ? "opacity-100" : "opacity-40 gmx-hover:opacity-70"
                  )}
                  onClick={() => goToSlide(index)}
                />
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
        </div>
      </ModalWithPortal>
    </>
  );
}
