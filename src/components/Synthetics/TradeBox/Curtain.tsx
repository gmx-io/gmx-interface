import cx from "classnames";
import throttle from "lodash/throttle";
import { CSSProperties, PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { RemoveScroll } from "react-remove-scroll";
import { createGlobalState } from "react-use";

import Button from "components/Button/Button";

import LeftArrowIcon from "img/ic_arrowleft16.svg?react";

const HEADER_HEIGHT = 52;
const DECELERATION = 0.01;
const DIRECTION_THRESHOLD = 2;
const MOVEMENT_THRESHOLD = 10;

const CURTAIN_STYLE: CSSProperties = {
  bottom: `0`,
  transform: `translateY(calc(100% - ${HEADER_HEIGHT}px))`,
  height: `calc(100dvh - ${HEADER_HEIGHT}px)`,
};

export const useIsCurtainOpen = createGlobalState(false);

export function Curtain({
  children,
  header,
  dataQa,
}: PropsWithChildren<{
  header: React.ReactNode;
  dataQa?: string;
}>) {
  const curtainRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  /**
   * Distance from bottom of the screen to the bottom of the curtain,
   * positive meaning the bottom of the curtain is below the bottom of the screen
   * 0 meaning the bottom of the curtain is at the bottom of the screen
   * negative values are not possible
   */
  const currentRelativeY = useRef(0);
  const prevScreenY = useRef(0);
  const prevScreenX = useRef(0);
  const prevTime = useRef(0);
  const currentVelocity = useRef(0);
  const isDirectionLocked = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [externalIsCurtainOpen, setExternalIsCurtainOpen] = useIsCurtainOpen();

  const handleAnimate = useCallback((newIsOpen: boolean) => {
    if (!curtainRef.current) return;

    const oldTransition = curtainRef.current.style.transition;
    const animation = curtainRef.current.animate(
      {
        transform: `translateY(${newIsOpen ? 0 : `calc(100% - ${HEADER_HEIGHT}px)`})`,
      },
      {
        duration: 150,
        easing: "ease-out",
        fill: "both",
      }
    );
    animation.addEventListener("finish", () => {
      animation.commitStyles();
      animation.cancel();
      if (curtainRef.current) {
        curtainRef.current.style.transform = `translateY(${newIsOpen ? 0 : `calc(100% - ${HEADER_HEIGHT}px)`})`;
        curtainRef.current.style.transition = oldTransition;
      }
    });
  }, []);

  const headerClick = useCallback(() => {
    setIsOpen(true);
    setExternalIsCurtainOpen(true);
    handleAnimate(true);
  }, [setIsOpen, handleAnimate, setExternalIsCurtainOpen]);

  const handleToggle = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    setExternalIsCurtainOpen(newIsOpen);
    handleAnimate(newIsOpen);
  }, [isOpen, handleAnimate, setExternalIsCurtainOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setExternalIsCurtainOpen(false);
    handleAnimate(false);
  }, [setIsOpen, handleAnimate, setExternalIsCurtainOpen]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!curtainRef.current) {
      return;
    }

    if (e.currentTarget === scrollableContainerRef.current) {
      const scrollTop = scrollableContainerRef.current?.scrollTop;
      if (scrollTop !== 0) {
        return;
      }
    }

    isPointerDownRef.current = true;
    isDirectionLocked.current = false;
    isDraggingRef.current = false;
    startX.current = e.screenX;
    startY.current = e.screenY;

    const curtainRect = curtainRef.current.getBoundingClientRect();

    currentRelativeY.current = (window.innerHeight - curtainRect.bottom) * -1;

    prevScreenY.current = e.screenY;
    prevScreenX.current = e.screenX;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const offsetX = e.screenX - startX.current;
    const offsetY = e.screenY - startY.current;

    if (!isDirectionLocked.current) {
      const isVertical = Math.abs(offsetY) > Math.abs(offsetX) * DIRECTION_THRESHOLD;
      if (Math.abs(offsetX) > MOVEMENT_THRESHOLD || Math.abs(offsetY) > MOVEMENT_THRESHOLD) {
        isDirectionLocked.current = true;
        isDraggingRef.current = isVertical;
        if (!isVertical) return;
      }
    }

    if (!isDraggingRef.current || !curtainRef.current) return;

    const deltaY = e.screenY - prevScreenY.current;

    curtainRef.current.style.willChange = "transform";

    const time = e.timeStamp - prevTime.current;
    const velocity = deltaY / time;

    let newY = currentRelativeY.current + deltaY;
    const heightWithBorder = curtainRef.current.clientHeight + 1;

    if (newY < 0) {
      newY = 0;
    } else if (newY > heightWithBorder - HEADER_HEIGHT) {
      newY = heightWithBorder - HEADER_HEIGHT;
    }

    curtainRef.current.style.transform = `translateY(${newY}px)`;

    currentRelativeY.current = newY;
    prevTime.current = e.timeStamp;
    currentVelocity.current = velocity;

    prevScreenX.current = e.screenX;
    prevScreenY.current = e.screenY;
  }, []);

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;

    if (!isDraggingRef.current || !curtainRef.current) {
      return;
    }

    isDraggingRef.current = false;
    curtainRef.current.style.willChange = "";

    /**
     * target y of the top of the curtain
     * distance from bottom of the screen to the top of the curtain
     */
    const targetY =
      currentRelativeY.current -
      curtainRef.current.clientHeight +
      (Math.sign(currentVelocity.current) * currentVelocity.current ** 2) / (2 * DECELERATION);

    if (curtainRef.current) {
      const heightWithBorder = curtainRef.current.clientHeight + 1;
      const isOpen = -targetY > heightWithBorder / 2;

      setIsOpen(isOpen);
      setExternalIsCurtainOpen(isOpen);
      handleAnimate(isOpen);
    }
  }, [handleAnimate, setExternalIsCurtainOpen]);

  const handlePointerCancel = useCallback(() => {
    isPointerDownRef.current = false;
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const handler = throttle(
      () => {
        if (isOpen && !isDraggingRef.current) {
          handleAnimate(true);
        }
      },
      50,
      { leading: false, trailing: true }
    );

    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
    };
  }, [handleAnimate, isOpen]);

  useEffect(() => {
    if (externalIsCurtainOpen && !isOpen) {
      setIsOpen(true);
      handleAnimate(true);
    }
  }, [externalIsCurtainOpen, isOpen, handleAnimate]);

  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-[900] bg-black/70 transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={handleClose}
      />
      <RemoveScroll enabled={isOpen}>
        <div
          data-qa={dataQa}
          ref={curtainRef}
          className="text-body-medium fixed left-0 right-0 z-[901] flex flex-col rounded-t-4 border-x border-t border-gray-800 bg-slate-800
                     shadow-[0px_-24px_48px_-8px_rgba(0,0,0,0.35)]"
          style={CURTAIN_STYLE}
        >
          <div
            className="flex touch-none select-none items-stretch justify-between gap-4 px-15 pb-8 pt-8"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="grow" onClick={headerClick}>
              {header}
            </div>
            <Button
              variant="secondary"
              type="button"
              className="size-35 !bg-cold-blue-900 !px-0 !py-0"
              onClick={handleToggle}
            >
              <LeftArrowIcon
                className={cx("transition-transform duration-500 ease-out", isOpen ? "rotate-[270deg]" : "rotate-90")}
              />
            </Button>
          </div>

          <div
            className="flex grow flex-col overflow-y-auto"
            ref={scrollableContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className="flex grow flex-col px-15 pb-10">{children}</div>
          </div>
        </div>
      </RemoveScroll>
    </>
  );
}
