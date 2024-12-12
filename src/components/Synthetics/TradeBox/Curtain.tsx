import cx from "classnames";
import { AnimationProps, DragHandlers, DraggableProps, PanInfo, motion, useDragControls } from "framer-motion";
import { PropsWithChildren, useCallback, useMemo, useRef } from "react";
import { useMedia } from "react-use";

const HEADER_HEIGHT = 86;

const DRAG_TRANSITION: DraggableProps["dragTransition"] = {
  power: 1,
  timeConstant: 100,
  modifyTarget: (target) => {
    const half = (-window.innerHeight + HEADER_HEIGHT) / 2;

    return target > half ? -HEADER_HEIGHT : -window.innerHeight + HEADER_HEIGHT;
  },
};

const DRAG_CONSTRAINTS: DraggableProps["dragConstraints"] = {
  bottom: -HEADER_HEIGHT,
  top: -window.innerHeight + HEADER_HEIGHT,
};
const CURTAIN_DRAG_ELASTIC: DraggableProps["dragElastic"] = { bottom: 0.5, top: 0 };
const INNER_DRAG_ELASTIC: DraggableProps["dragElastic"] = { bottom: 0, top: 0.5 };

const INITIAL: AnimationProps["initial"] = { y: -HEADER_HEIGHT };

export function Curtain({
  children,
  header,
  dataQa,
  // headerHeight = HEADER_HEIGHT,
}: PropsWithChildren<{
  header: React.ReactNode;
  dataQa?: string;
  // headerHeight?: number;
}>) {
  const curtainRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMedia("(max-width: 1100px)");

  const curtainDragControls = useDragControls();
  const isDraggingCurtain = useRef(false);

  const handleCurtainPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (innerContainerRef.current?.contains(event.target as HTMLElement)) {
        return;
      }

      curtainDragControls.start(event);
    },
    [curtainDragControls]
  );

  const handleInnerDragEnd = useCallback(() => {
    isDraggingCurtain.current = false;
  }, []);

  const handleInnerDrag: DragHandlers["onDrag"] = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!innerRef.current || !innerContainerRef.current) return;

      const { y: containerY } = innerContainerRef.current.getBoundingClientRect();
      const { y: innerY } = innerRef.current.getBoundingClientRect();

      const isAtTop = innerY >= containerY;
      const isMovingDown = info.delta.y >= 0;

      if (isAtTop && isMovingDown && !isDraggingCurtain.current) {
        isDraggingCurtain.current = true;

        curtainDragControls.start(event as any);
      }
    },
    [curtainDragControls, isDraggingCurtain]
  );

  const curtainStyle = useMemo(() => {
    return {
      maxHeight: `calc(100dvh - ${HEADER_HEIGHT}px)`,
    };
  }, []);

  return (
    <motion.div
      data-qa={dataQa}
      drag="y"
      dragConstraints={DRAG_CONSTRAINTS}
      initial={INITIAL}
      dragControls={curtainDragControls}
      dragMomentum={true}
      dragListener={false}
      dragElastic={CURTAIN_DRAG_ELASTIC}
      dragTransition={DRAG_TRANSITION}
      ref={curtainRef}
      dragPropagation
      onPointerDown={handleCurtainPointerDown}
      className={cx(
        isMobile
          ? "text-body-medium fixed left-0 right-0 top-[100dvh] z-[1000] flex touch-none flex-col rounded-t-4 border-x border-b border-t border-gray-800 bg-slate-800 shadow-[0px_-24px_48px_-8px_rgba(0,0,0,0.35)] will-change-transform"
          : "App-box SwapBox"
      )}
      style={curtainStyle}
    >
      {header}

      <motion.div ref={innerContainerRef} className="touch-none overflow-hidden">
        <motion.div
          ref={innerRef}
          drag="y"
          onDragEnd={handleInnerDragEnd}
          onDrag={handleInnerDrag}
          dragConstraints={innerContainerRef}
          dragElastic={INNER_DRAG_ELASTIC}
          className={cx(isMobile ? "touch-none px-15 pb-10 will-change-transform" : "")}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
