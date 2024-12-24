import cx from "classnames";
import { MotionStyle, PanInfo, motion, useSpring } from "framer-motion";
import { ReactNode, useCallback, useMemo, useRef, useState } from "react";

type Props = {
  options: (string | number)[];
  option: string | number | undefined;
  onChange?: (option: any) => void;
  optionLabels?: Record<string | number, ReactNode> | string[];
  optionClassnames?: Record<string | number, string>;
  icons?: Record<string, ReactNode>;
  qa?: string;
};

export function SwipeTabs({ options, option, onChange, optionLabels, icons, qa, optionClassnames }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bgRef = useRef<HTMLDivElement>(null);
  const [visuallyActiveOption, setVisuallyActiveOption] = useState(option);
  const offsetRef = useRef(0);
  const x = useSpring(0, { stiffness: 1000, damping: 60, bounce: 0 });
  const isDragging = useRef(false);

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
    isDragging.current = true;
    offsetRef.current = x.get();
  }, [x]);

  const handlePan = useCallback(
    (event: PointerEvent, info: PanInfo) => {
      if (!isDragging.current) return;

      let newX = offsetRef.current - info.delta.x * 2;
      offsetRef.current = newX;

      const {
        option: nearestOption,
        width,
        offset,
      } = getNearestOption(newX, {
        withHalfWidth: true,
        isAbsolute: false,
      });

      x.set((offset ?? 0) * 0.8 + newX * 0.2);
      if (nearestOption) {
        setVisuallyActiveOption(nearestOption);

        bgRef.current!.style.width = `${width}px`;
      }
    },
    [getNearestOption, x]
  );

  const handlePanEnd = useCallback(() => {
    const { offset: targetOffset } = getNearestOption(offsetRef.current, {
      withHalfWidth: true,
      isAbsolute: false,
    });

    if (targetOffset !== undefined) {
      isDragging.current = false;

      x.set(targetOffset);

      const { option: nearestOption } = getNearestOption(targetOffset, {
        withHalfWidth: true,
        isAbsolute: false,
      });

      if (nearestOption !== option) {
        setVisuallyActiveOption(nearestOption);
        onChange?.(nearestOption);
      }
    }
  }, [getNearestOption, onChange, option, x]);

  const bgStyle = useMemo(
    (): MotionStyle => ({
      x,
    }),
    [x]
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
          "absolute left-0 top-0 h-full w-[100px] bg-cold-blue-500",
          visuallyActiveOption && optionClassnames?.[visuallyActiveOption]
        )}
        style={bgStyle}
      />

      {options.map((opt, index) => {
        const label = optionLabels && optionLabels[opt] ? optionLabels[opt] : opt;
        const isActive = opt === visuallyActiveOption;

        return (
          <div
            className={cx(
              "relative flex grow items-center justify-center gap-8 px-15 pb-9 pt-8 text-center transition-colors",
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
