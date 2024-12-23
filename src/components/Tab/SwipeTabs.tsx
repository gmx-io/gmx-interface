import cx from "classnames";
import { DraggableProps, MotionStyle, motion, useDragControls, useMotionValue } from "framer-motion";
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
  const x = useMotionValue(0);

  const onClick = useCallback(
    (opt: string | number) => {
      onChange?.(opt);
    },
    [onChange]
  );

  const dragControls = useDragControls();

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

  const detectNearestOptionOnDrag = useCallback(() => {
    const bgRect = bgRef.current?.getBoundingClientRect();

    if (!bgRect) return;

    const { option: nearestOption, width } = getNearestOption(bgRect.x, { withHalfWidth: true, isAbsolute: true });

    if (!nearestOption) return;

    setVisuallyActiveOption(nearestOption);

    if (bgRef.current) {
      bgRef.current.style.width = `${width}px`;
    }
  }, [getNearestOption]);

  const startDrag = useCallback(
    (event: React.PointerEvent) => {
      dragControls.start(event, { snapToCursor: false });

      const containerRect = containerRef.current?.getBoundingClientRect();

      if (!containerRect) return;

      const {
        option: nearestOption,
        width,
        offset,
      } = getNearestOption(event.clientX, {
        withHalfWidth: false,
        isAbsolute: true,
      });

      if (offset !== undefined) {
        x.set(offset);
      }

      setVisuallyActiveOption(nearestOption);

      if (bgRef.current) {
        bgRef.current.style.width = `${width}px`;
      }
    },
    [dragControls, getNearestOption, x]
  );

  const dragTransition = useMemo((): DraggableProps["dragTransition"] => {
    return {
      timeConstant: 100,
      modifyTarget: (target: number) => {
        const { option: nearestOption, offset } = getNearestOption(target, {
          withHalfWidth: true,
          isAbsolute: false,
        });

        if (!nearestOption) return target;

        if (nearestOption !== option) {
          setVisuallyActiveOption(nearestOption);
          onChange?.(nearestOption);
        }

        return offset;
      },
    };
  }, [getNearestOption, onChange, option]);

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
      onPointerDown={startDrag}
    >
      <motion.div
        ref={bgRef}
        className={cx(
          "absolute left-0 top-0 h-full w-[100px] bg-cold-blue-500",
          visuallyActiveOption && optionClassnames?.[visuallyActiveOption]
        )}
        drag="x"
        dragConstraints={containerRef}
        dragControls={dragControls}
        onDrag={detectNearestOptionOnDrag}
        dragTransition={dragTransition}
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
