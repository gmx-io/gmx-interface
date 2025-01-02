import cx from "classnames";
import { MotionProps, MotionStyle, PanInfo, motion, useSpring } from "framer-motion";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  options: (string | number)[];
  option: string | number | undefined;
  onChange?: (option: any) => void;
  optionLabels?: Record<string | number, ReactNode> | string[];
  optionClassnames?: Record<string | number, string>;
  icons?: Record<string, ReactNode>;
  qa?: string;
};

const MAGNETIC_SNAP_WEIGHT = 0.8;
const SWIPE_SENSITIVITY = 1.5;
const DIRECTION_THRESHOLD = 2;
const MOVEMENT_THRESHOLD = 10;

function getTransformTemplate({ x }: Parameters<Exclude<MotionProps["transformTemplate"], undefined>>[0]) {
  // Make a custom string to avoid translateZ passed by Framer Motion default
  // It causes stacking context issues in iOS
  return `translateX(${x})`;
}

export function SwipeTabs({ options, option, onChange, optionLabels, icons, qa, optionClassnames }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bgRef = useRef<HTMLDivElement>(null);
  const [visuallyActiveOption, setVisuallyActiveOption] = useState(option);
  const offsetRef = useRef(0);
  const x = useSpring(0, { stiffness: 1000, damping: 60, bounce: 0 });
  const isDragging = useRef(false);
  const isDirectionLocked = useRef(false);

  const onClick = useCallback(
    (opt: string | number) => {
      onChange?.(opt);

      const optElem = optionsRefs.current[options.indexOf(opt)];
      if (!optElem) return;

      const optRect = optElem.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      x.set(optRect.x - containerRect.x);

      if (bgRef.current) {
        bgRef.current.style.width = `${optRect.width}px`;
      }
      setVisuallyActiveOption(opt);
    },
    [onChange, options, x]
  );

  const getNearestOption = useCallback(
    (
      atX: number,
      params: { withHalfWidth: boolean; isAbsolute: boolean } = { withHalfWidth: true, isAbsolute: false }
    ) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      const bgRect = bgRef.current?.getBoundingClientRect();

      if (!containerRect || !bgRect) return {};

      const xDiff = atX + (params.withHalfWidth ? bgRect.width / 2 : 0) - (params.isAbsolute ? containerRect.x : 0);

      let acc = 0;
      for (let i = 0; i < options.length; i++) {
        const optionElem = optionsRefs.current[i];
        if (!optionElem) continue;

        acc += optionElem.clientWidth;

        if (acc > xDiff || i === options.length - 1) {
          return {
            option: options[i],
            elem: optionElem,
            width: optionElem.clientWidth,
            offset: acc - optionElem.clientWidth,
          };
        }
      }

      return {};
    },
    [options]
  );

  const handlePanStart = useCallback(() => {
    isDragging.current = false;
    isDirectionLocked.current = false;
    offsetRef.current = x.get();
  }, [x]);

  const handlePan = useCallback(
    (event: PointerEvent, info: PanInfo) => {
      if (!isDirectionLocked.current) {
        const isHorizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y) * DIRECTION_THRESHOLD;
        if (Math.abs(info.offset.x) > MOVEMENT_THRESHOLD || Math.abs(info.offset.y) > MOVEMENT_THRESHOLD) {
          isDirectionLocked.current = true;
          isDragging.current = isHorizontal;
          if (!isHorizontal) return;
        }
      }

      if (!isDragging.current) return;

      let newX = offsetRef.current + info.delta.x * SWIPE_SENSITIVITY;
      offsetRef.current = newX;

      const {
        option: nearestOption,
        width,
        offset,
      } = getNearestOption(newX, {
        withHalfWidth: true,
        isAbsolute: false,
      });

      x.set((offset ?? 0) * MAGNETIC_SNAP_WEIGHT + newX * (1 - MAGNETIC_SNAP_WEIGHT));
      if (nearestOption) {
        setVisuallyActiveOption(nearestOption);

        bgRef.current!.style.width = `${width}px`;
      }
    },
    [getNearestOption, x]
  );

  const handlePanEnd = useCallback(() => {
    const { offset: targetOffset, option: nearestOption } = getNearestOption(offsetRef.current, {
      withHalfWidth: true,
      isAbsolute: false,
    });

    if (targetOffset !== undefined) {
      isDragging.current = false;

      x.set(targetOffset);

      if (nearestOption !== option) {
        setVisuallyActiveOption(nearestOption);
        onChange?.(nearestOption);
      }
    }
  }, [getNearestOption, onChange, option, x]);

  useEffect(() => {
    if (!option) return;

    const optElem = optionsRefs.current[options.indexOf(option)];
    if (!optElem) return;

    const optRect = optElem.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    x.set(optRect.x - containerRect.x);

    if (bgRef.current) {
      bgRef.current.style.width = `${optRect.width}px`;
    }
    setVisuallyActiveOption(option);
  }, [option, options, x]);

  const bgStyle = useMemo(
    (): MotionStyle => ({
      x,
    }),
    [x]
  );

  useEffect(
    function handleResize() {
      if (!bgRef.current) return;

      const handler = () => {
        if (!option) return;

        const optElem = optionsRefs.current[options.indexOf(option)];
        if (!optElem) return;

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const optRect = optElem.getBoundingClientRect();

        x.set(optRect.x - containerRect.x);
        if (bgRef.current) {
          bgRef.current.style.width = `${optRect.width}px`;
        }
      };

      window.addEventListener("resize", handler);

      return () => {
        window.removeEventListener("resize", handler);
      };
    },
    [option, options, x]
  );

  return (
    <motion.div
      ref={containerRef}
      data-qa={qa}
      className="text-body-medium relative flex touch-none select-none overflow-hidden rounded-3 bg-cold-blue-900 text-slate-100 shadow-[inset_0px_0px_30px_5px_rgba(255,255,255,0.01)]"
      onPanStart={handlePanStart}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
    >
      <motion.div
        ref={bgRef}
        className={cx(
          "absolute left-0 top-0 z-0 h-full w-[100px] bg-cold-blue-500",
          visuallyActiveOption && optionClassnames?.[visuallyActiveOption]
        )}
        style={bgStyle}
        transformTemplate={getTransformTemplate}
      />

      {options.map((opt, index) => {
        const label = optionLabels && optionLabels[opt] ? optionLabels[opt] : opt;
        const isActive = opt === visuallyActiveOption;

        return (
          <div
            className={cx(
              "relative z-10 flex grow items-center justify-center gap-8 px-15 pb-9 pt-8 text-center transition-colors",
              isActive ? "text-white" : ""
            )}
            onClick={() => onClick(opt)}
            key={opt}
            data-qa={`${qa}-tab-${opt}`}
            ref={(el) => (optionsRefs.current[index] = el)}
          >
            {icons && icons[opt] && <span className="mt-2 scale-75">{icons[opt]}</span>}
            {label}
          </div>
        );
      })}
    </motion.div>
  );
}
