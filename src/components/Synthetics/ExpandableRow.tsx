import cx from "classnames";
import { useMedia } from "react-use";
import { motion, AnimatePresence } from "framer-motion";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { usePrevious } from "lib/usePrevious";
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import { SyntheticsInfoRow } from "./SyntheticsInfoRow";

const EXPAND_ANIMATION_INITIAL = { height: 0, opacity: 0 };
const EXPAND_ANIMATION_ANIMATE = { height: "auto", opacity: 1 };
const EXPAND_ANIMATION_EXIT = { height: 0, opacity: 0 };
const EXPAND_ANIMATION_TRANSITION = { duration: 0.2, ease: "easeInOut" };

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
}: Props) {
  const previousHasError = usePrevious(hasError);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoExpandOnError && hasError && !previousHasError) {
      onToggle(true);
    }
  }, [hasError, previousHasError, open, onToggle, autoExpandOnError]);

  const handleOnClick = useCallback(() => {
    if (hasError && disableCollapseOnError) {
      return;
    }

    onToggle(!open);
  }, [onToggle, open, hasError, disableCollapseOnError]);

  const label = useMemo(() => {
    return hasError && disableCollapseOnError ? <TooltipWithPortal handle={title} content={errorMessage} /> : title;
  }, [hasError, disableCollapseOnError, title, errorMessage]);

  const disabled = disableCollapseOnError && hasError;

  const isMobile = useMedia(`(max-width: 1100px)`, false);
  useEffect(() => {
    if (open && scrollIntoViewOnMobile && isMobile && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrollIntoViewOnMobile, open, isMobile]);

  return (
    <div className={className}>
      <SyntheticsInfoRow
        className={cx("group relative -my-14 !items-center py-14 gmx-hover:text-blue-300", {
          "cursor-not-allowed": disabled,
        })}
        onClick={disabled ? undefined : handleOnClick}
        label={
          <span className="flex flex-row justify-between align-middle group-gmx-hover:text-blue-300">{label}</span>
        }
        value={
          open ? (
            <BiChevronUp className="-mb-4 -mr-[0.3rem] -mt-4 h-24 w-24 text-white group-gmx-hover:text-blue-300" />
          ) : (
            <BiChevronDown className="-mb-4 -mr-[0.3rem] -mt-4 h-24 w-24 text-white group-gmx-hover:text-blue-300" />
          )
        }
      />

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            ref={contentRef}
            className={contentClassName}
            initial={EXPAND_ANIMATION_INITIAL}
            animate={EXPAND_ANIMATION_ANIMATE}
            exit={EXPAND_ANIMATION_EXIT}
            transition={EXPAND_ANIMATION_TRANSITION}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
