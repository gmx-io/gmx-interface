import { t } from "@lingui/macro";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VARIANTS: Variants = {
  initial: { opacity: 0, y: 98, zIndex: 1 },
  enter: { opacity: 1, y: 0, zIndex: 1 },
  exit: { opacity: 0, y: -98, zIndex: 0 },
};
const TRANSITION = {
  opacity: {
    duration: 0.25,
    ease: "easeInOut",
  },
  y: {
    duration: 0.25,
    ease: "easeInOut",
  },
};

export function AnimatedTitle() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const titles = useMemo(() => {
    return [
      t`with 100x leverage`,
      t`90+ crypto tokens`,
      t`multiple asset classes`,
      t`deep liquid markets`,
      t`from 5 blockchains`,
    ];
  }, []);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    intervalRef.current = window.setInterval(() => {
      requestAnimationFrame(() => {
        setCurrentIndex((i) => (i + 1) % titles.length);
      });
    }, 2500);
  }, [stop, titles]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  useEffect(() => {
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [start, stop]);
  const currentText = titles[currentIndex];
  return (
    <div className="relative">
      <span className="invisible">&nbsp;{currentText}</span>
      <AnimatePresence mode="popLayout">
        <motion.div
          className="will-change-opacity absolute inset-0 transform-gpu will-change-transform
                     [backface-visibility:hidden]"
          transition={TRANSITION}
          key={currentIndex}
          variants={VARIANTS}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          <span className="opacity-0">Trade </span>
          {currentText}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
