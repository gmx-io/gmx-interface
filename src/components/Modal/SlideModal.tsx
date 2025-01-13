import cx from "classnames";
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemoveScroll } from "react-remove-scroll";

import Portal from "components/Common/Portal";
import { MdClose } from "react-icons/md";
import { useMedia } from "react-use";
import Modal from "./Modal";

const TOP_OFFSET = 52;
const DECELERATION = 0.01;
const DIRECTION_THRESHOLD = 2;
const MOVEMENT_THRESHOLD = 10;

function MobileSlideModal({
  children,
  label,
  headerContent,
  headerRef,
  qa,
  isVisible: isOpen,
  setIsVisible: setIsOpen,
  contentPadding = true,
  footerContent,
  className,
  noDivider = false,
}: PropsWithChildren<{
  label?: React.ReactNode;
  headerContent?: React.ReactNode;
  headerRef?: React.Ref<HTMLDivElement>;
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  qa?: string;
  contentPadding?: boolean;
  footerContent?: React.ReactNode;
  className?: string;
  noDivider?: boolean;
}>) {
  const curtainStyle = useMemo(
    () => ({
      top: `calc(100dvh)`,
      height: `calc(100dvh - ${TOP_OFFSET}px)`,
    }),
    []
  );
  const curtainRef = useRef<HTMLDivElement | null>(null);

  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const currentRelativeY = useRef(0);
  const prevScreenY = useRef(0);
  const prevScreenX = useRef(0);
  const prevTime = useRef(0);
  const currentVelocity = useRef(0);
  const isDirectionLocked = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const scrollableContainerRef = useRef<HTMLDivElement | null>(null);

  const [isHideTransitionFinished, setIsHideTransitionFinished] = useState(!isOpen);

  const handleAnimate = useCallback((newIsOpen: boolean) => {
    if (!curtainRef.current) return;

    const oldTransition = curtainRef.current.style.transition;
    const animation = curtainRef.current.animate(
      {
        transform: `translateY(${newIsOpen ? `-100%` : 0})`,
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
        curtainRef.current.style.transition = oldTransition;
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    handleAnimate(false);
  }, [setIsOpen, handleAnimate]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!curtainRef.current) {
      return;
    }
    e.stopPropagation();

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

    currentRelativeY.current = (curtainRect.height + TOP_OFFSET - curtainRect.top) * -1;
    prevScreenY.current = e.screenY;
    prevScreenX.current = e.screenX;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    e.stopPropagation();

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

    if (newY > 0) {
      newY = 0;
    } else if (newY < -heightWithBorder) {
      newY = -heightWithBorder;
    }

    curtainRef.current.style.transform = `translateY(${newY}px)`;

    currentRelativeY.current = newY;
    prevTime.current = e.timeStamp;
    currentVelocity.current = velocity;

    prevScreenX.current = e.screenX;
    prevScreenY.current = e.screenY;
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isPointerDownRef.current = false;

      if (!isDraggingRef.current || !curtainRef.current) {
        return;
      }

      e.stopPropagation();

      isDraggingRef.current = false;
      curtainRef.current.style.willChange = "";

      const targetY =
        currentRelativeY.current +
        (Math.sign(currentVelocity.current) * currentVelocity.current ** 2) / (2 * DECELERATION);

      if (curtainRef.current) {
        const heightWithBorder = curtainRef.current.clientHeight + 1;
        const isOpen = heightWithBorder / 2 < -targetY;
        setIsOpen(isOpen);
        handleAnimate(isOpen);
      }
    },
    [handleAnimate, setIsOpen]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();

    isPointerDownRef.current = false;
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    if (!isDraggingRef.current) {
      if (isOpen) {
        setIsHideTransitionFinished(false);
      } else {
        handleAnimate(false);
      }
    }
  }, [isOpen, handleAnimate]);

  const setCurtainRef = useCallback(
    (el: HTMLDivElement | null) => {
      curtainRef.current = el;
      if (el) {
        handleAnimate(true);
      }
    },
    [handleAnimate]
  );

  const handleTransitionEnd = useCallback(() => {
    if (!isOpen) {
      setIsHideTransitionFinished(true);
    }
  }, [isOpen]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (isHideTransitionFinished) return null;

  return (
    <Portal>
      <div
        className={cx(
          "fixed inset-0 z-[9999] bg-black/70 transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onTransitionEnd={handleTransitionEnd}
        onClick={handleClose}
      />
      <RemoveScroll enabled={isOpen}>
        <div
          data-qa={qa}
          ref={setCurtainRef}
          className={cx(
            "text-body-medium fixed left-0 right-0 z-[10000] flex flex-col rounded-t-4 border-x border-t border-gray-800 bg-slate-800",
            className
          )}
          style={curtainStyle}
          onClick={stopPropagation}
        >
          <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
            <div className="flex touch-none select-none items-stretch justify-between gap-4 px-14 pb-14 pt-14">
              <div className="text-body-large grow">{label}</div>

              <MdClose fontSize={20} className="cursor-pointer text-slate-100 hover:opacity-90" onClick={handleClose} />
            </div>
            {headerRef ? (
              <div className="px-14 last:*:mb-14" ref={headerRef} />
            ) : headerContent ? (
              <div className="px-14 last:*:mb-14">{headerContent}</div>
            ) : null}

            {!noDivider && <div className="divider" />}
          </div>

          <div
            className="grow overflow-y-auto"
            ref={scrollableContainerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <div className={cx("flex grow flex-col", contentPadding ? "p-14" : "pr-5")}>{children}</div>
          </div>
          {footerContent && (
            <>
              <div className="border-b border-stroke-primary" />
              <div>{footerContent}</div>
            </>
          )}
        </div>
      </RemoveScroll>
    </Portal>
  );
}

export function SlideModal({
  children,
  label,
  headerContent,
  headerRef,
  isVisible,
  setIsVisible,
  qa,
  contentPadding = true,
  footerContent,
  className,
  noDivider = false,
}: PropsWithChildren<{
  label?: React.ReactNode;
  headerContent?: React.ReactNode;
  headerRef?: React.Ref<HTMLDivElement>;
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  qa?: string;
  contentPadding?: boolean;
  footerContent?: React.ReactNode;
  className?: string;
  noDivider?: boolean;
}>) {
  const isMobile = useMedia("(max-width: 700px)", false);

  if (isMobile) {
    return (
      <MobileSlideModal
        label={label}
        headerContent={headerContent}
        headerRef={headerRef}
        qa={qa}
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        contentPadding={contentPadding}
        footerContent={footerContent}
        noDivider={noDivider}
        className={className}
      >
        {children}
      </MobileSlideModal>
    );
  }

  return (
    <Portal>
      <Modal
        qa={qa}
        setIsVisible={setIsVisible}
        isVisible={isVisible}
        label={label}
        headerContent={headerContent}
        contentPadding={contentPadding}
        noDivider={noDivider}
        footerContent={footerContent}
        className={className}
      >
        {children}
      </Modal>
    </Portal>
  );
}
