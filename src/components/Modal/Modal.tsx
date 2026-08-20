import { t } from "@lingui/macro";
import cx from "classnames";
import { AnimatePresence, Variants, motion } from "framer-motion";
import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useId, useMemo, useRef } from "react";
import { RemoveScroll } from "react-remove-scroll";

import { PRIVY_DIALOG_SCROLL_SHARDS } from "lib/wallets/privyUiCompat";

import Button from "components/Button/Button";
import ErrorBoundary from "components/Errors/ErrorBoundary";

import ChevronLeftIcon from "img/ic_chevron_left.svg?react";
import CloseIcon from "img/ic_close.svg?react";

import "./Modal.css";
import { ModalFocusScopeProvider, useModalFocusScope } from "./modalFocusScope";

const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0, pointerEvents: "none" },
  visible: { opacity: 1, pointerEvents: "auto" },
};

const VISIBLE_STYLES: React.CSSProperties = {
  overflow: "hidden",
  position: "fixed",
};

const HIDDEN_STYLES: React.CSSProperties = {
  overflow: "visible",
  position: "fixed",
};

export const MODAL_ANIMATION_DURATION_MS = 200;

const TRANSITION = { duration: MODAL_ANIMATION_DURATION_MS / 1000 };

export type ModalProps = PropsWithChildren<{
  className?: string;
  isVisible?: boolean;
  setIsVisible: (isVisible: boolean) => void;
  zIndex?: number;
  label?: React.ReactNode;
  onBack?: () => void;
  headerContent?: React.ReactNode;
  footerContent?: ReactNode;
  onAfterOpen?: () => void;
  /**
   * If false, you need to add padding and spacing to the children yourself.
   */
  contentPadding?: boolean;
  qa?: string;
  contentClassName?: string;
  disableOverflowHandling?: boolean;
  keepScrollbarVisible?: boolean;
  withMobileBottomPosition?: boolean;
  takeFullHeight?: boolean;
  hideHeaderBorder?: boolean;
  hideCloseButton?: boolean;
}>;

export default function Modal({
  className,
  isVisible,
  label,
  onBack,
  zIndex,
  children,
  headerContent,
  footerContent,
  contentPadding = true,
  onAfterOpen,
  setIsVisible,
  qa,
  contentClassName,
  disableOverflowHandling = false,
  keepScrollbarVisible = false,
  withMobileBottomPosition = false,
  takeFullHeight = false,
  hideHeaderBorder = false,
  hideCloseButton = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const focusScope = useModalFocusScope({
    contentRef,
    isVisible: Boolean(isVisible),
    onClose: () => setIsVisible(false),
  });

  useEffect(() => {
    if (typeof onAfterOpen === "function") onAfterOpen();
  }, [onAfterOpen]);

  const modalStyle = useMemo(() => ({ zIndex }), [zIndex]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <ModalFocusScopeProvider scope={focusScope}>
          <RemoveScroll shards={PRIVY_DIALOG_SCROLL_SHARDS} removeScrollBar={!keepScrollbarVisible}>
            <motion.div
              className={cx("Modal", className, { "max-md:!items-end": withMobileBottomPosition })}
              ref={modalRef}
              style={modalStyle}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={FADE_VARIANTS}
              transition={TRANSITION}
            >
              <div
                className="Modal-backdrop"
                style={isVisible ? VISIBLE_STYLES : HIDDEN_STYLES}
                onClick={() => setIsVisible(false)}
              />

              <div
                ref={contentRef}
                className={cx(
                  "Modal-content flex flex-col",
                  {
                    "gap-16": contentPadding,
                    "max-md:w-full max-md:!rounded-t-0": withMobileBottomPosition,
                  },
                  contentClassName
                )}
                onClick={stopPropagation}
                data-qa={qa}
                role="dialog"
                aria-modal="true"
                aria-labelledby={label ? titleId : undefined}
                tabIndex={-1}
              >
                <div
                  className={cx(
                    "Modal-header-wrapper flex flex-col gap-8 px-adaptive pb-12 pt-adaptive",
                    hideHeaderBorder ? "" : "border-b-1/2 border-slate-600"
                  )}
                >
                  <div className="Modal-title-bar h-28">
                    <div className="Modal-title-group">
                      {onBack && (
                        <Button variant="ghost" size="small" className="px-8" onClick={onBack} aria-label="Back">
                          <ChevronLeftIcon className="size-16" />
                        </Button>
                      )}
                      <div id={titleId} className="Modal-title font-medium text-typography-primary">
                        {label}
                      </div>
                    </div>
                    {!hideCloseButton && (
                      <button
                        type="button"
                        className="Modal-close-button"
                        onClick={() => setIsVisible(false)}
                        aria-label={t`Close`}
                      >
                        <CloseIcon className="Modal-close-icon size-20" />
                      </button>
                    )}
                  </div>
                  {headerContent}
                </div>
                <ErrorBoundary id="Modal" variant="block" wrapperClassName="rounded-t-8">
                  {disableOverflowHandling ? (
                    children
                  ) : (
                    <div className={cx("overflow-auto", { "flex grow flex-col": takeFullHeight })}>
                      <div
                        className={cx("Modal-body", {
                          "px-adaptive": contentPadding,
                          "pb-adaptive": contentPadding && !footerContent,
                          "flex grow flex-col": takeFullHeight,
                        })}
                      >
                        {children}
                      </div>
                    </div>
                  )}
                  {footerContent && (
                    <div className="border-t-1/2 border-slate-600 px-adaptive py-16">{footerContent}</div>
                  )}
                </ErrorBoundary>
              </div>
            </motion.div>
          </RemoveScroll>
        </ModalFocusScopeProvider>
      )}
    </AnimatePresence>
  );
}
