import cx from "classnames";
import { AnimatePresence, Variants, motion } from "framer-motion";
import { ReactNode } from "react";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ChevronUpIcon from "img/ic_chevron_up.svg?react";

const ANIMATION_DURATION = 0.2;

const HOW_IT_WORKS_BLOCK_ANIMATION_VARIANTS: Variants = {
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

type Props = {
  icon: ReactNode;
  title: ReactNode;
  children: ReactNode;
  isExpanded: boolean;
  onToggle: (isExpanded: boolean) => void;
};

export function HowItWorksBlock({ icon, title, children, isExpanded, onToggle }: Props) {
  return (
    <div className="group flex flex-col rounded-8 border-1/2 border-slate-600 bg-slate-950">
      <button
        type="button"
        className={cx(
          "flex min-h-16 w-full items-center justify-between gap-12 p-16 text-left transition-[margin,color] duration-200",
          "text-typography-primary group-hover:text-blue-300",
          { "mb-2": isExpanded }
        )}
        aria-expanded={isExpanded}
        onClick={() => onToggle(!isExpanded)}
      >
        <span className="flex items-center gap-12">
          {icon}
          <span className="text-14 font-medium">{title}</span>
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-16 shrink-0 text-typography-secondary group-hover:text-blue-300" />
        ) : (
          <ChevronDownIcon className="w-16 shrink-0 text-typography-secondary group-hover:text-blue-300" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            variants={HOW_IT_WORKS_BLOCK_ANIMATION_VARIANTS}
            initial="collapsed"
            animate="expanded"
            exit="exit"
          >
            <div className="px-16 pb-16">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
