import cx from "classnames";
import { AnimatePresence, Variants, motion } from "framer-motion";
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { useMedia } from "react-use";

import { usePrevious } from "lib/usePrevious";

import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SyntheticsInfoRow } from "./SyntheticsInfoRow";

const ANIMATION_DURATION = 0.2;

const EXPAND_ANIMATION_VARIANTS: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
  },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "visible",
    transition: {
      height: { duration: ANIMATION_DURATION, ease: "easeInOut" },
      opacity: { duration: ANIMATION_DURATION, ease: "easeInOut" },
      overflow: { delay: ANIMATION_DURATION },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: {
      height: { duration: ANIMATION_DURATION, ease: "easeInOut" },
      opacity: { duration: ANIMATION_DURATION, ease: "easeInOut" },
    },
  },
};

interface Props {
  title: ReactNode;
  open: boolean;
  children: ReactNode;
  onToggle: (val: boolean) => void;
  /**
   * if true - disables the collapse when the error is present
   */
  disableCollapseOnError?: boolean;
  /**
   * if true - expands the row when the error is present
   */
  autoExpandOnError?: boolean;
  hasError?: boolean;
  /**
   * error message to show in the tooltip when disableCollapseOnError=true
   */
  errorMessage?: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollIntoViewOnMobile?: boolean;
  withToggleSwitch?: boolean;
  handleClassName?: string;
}

export function ExpandableRow({
  open,
  children,
  title,
  onToggle,
  hasError,
  disableCollapseOnError = false,
  autoExpandOnError = true,
  errorMessage,
  className,
  contentClassName,
  scrollIntoViewOnMobile = false,
  withToggleSwitch = false,
  handleClassName,
}: Props) {
  const previousHasError = usePrevious(hasError);
  const contentRef = useRef<HTMLDivElement>(null);

  const isMobile = useMedia(`(max-width: 1024px)`, false);

  const handleAnimationComplete = useCallback(
    (definition: string) => {
      if (definition === "expanded" && scrollIntoViewOnMobile && isMobile && contentRef.current) {
        contentRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [scrollIntoViewOnMobile, isMobile]
  );

  useEffect(() => {
    if (autoExpandOnError && hasError && !previousHasError) {
      onToggle(true);
    }
  }, [hasError, previousHasError, open, onToggle, autoExpandOnError]);

  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      if (hasError && disableCollapseOnError) {
        return;
      }

      onToggle(!open);
    },
    [onToggle, open, hasError, disableCollapseOnError]
  );

  const label = useMemo(() => {
    return hasError && disableCollapseOnError ? (
      <TooltipWithPortal handle={title} handleClassName={handleClassName} content={errorMessage} />
    ) : (
      <span className={handleClassName}>{title}</span>
    );
  }, [hasError, disableCollapseOnError, title, errorMessage, handleClassName]);

  const disabled = disableCollapseOnError && hasError;

  const value = withToggleSwitch ? (
    <ToggleSwitch isChecked={open} setIsChecked={onToggle} disabled={disabled} />
  ) : open ? (
    <FaChevronUp className="w-12 text-typography-secondary group-gmx-hover:text-blue-300" />
  ) : (
    <FaChevronDown className="w-12 text-typography-secondary group-gmx-hover:text-blue-300" />
  );

  return (
    <div className={cx("min-h-16", className)}>
      <AnimatePresence initial={false}>
        <div key="handle" className={cx({ "mb-14": open })}>
          <SyntheticsInfoRow
            className={cx("group relative !items-center gmx-hover:text-blue-300", {
              "cursor-not-allowed": disabled,
            })}
            onClick={disabled ? undefined : handleOnClick}
            label={
              <span className="flex flex-row justify-between align-middle group-hover:!text-blue-300">{label}</span>
            }
            value={value}
          />
        </div>
        {open && (
          <motion.div
            ref={contentRef}
            className={contentClassName}
            variants={EXPAND_ANIMATION_VARIANTS}
            initial="collapsed"
            animate="expanded"
            exit="exit"
            onAnimationComplete={handleAnimationComplete}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
