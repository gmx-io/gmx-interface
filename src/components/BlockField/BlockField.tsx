import cx from "classnames";
import {
  ReactNode,
  useCallback,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  type MutableRefObject,
} from "react";

type Props = {
  label: ReactNode;
  content: ReactNode;
  className?: string;
  labelClassName?: string;
  contentClassName?: string;
  containerRef?: Ref<HTMLDivElement>;
  forwardClickToSelector?: boolean;
  disabled?: boolean;
};

export function BlockField({
  label,
  content,
  className,
  labelClassName,
  contentClassName,
  containerRef,
  forwardClickToSelector,
  disabled,
}: Props) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const wasOpenOnPointerDown = useRef(false);

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (!containerRef) {
        return;
      }
      if (typeof containerRef === "function") {
        containerRef(node);
      } else {
        (containerRef as MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [containerRef]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!forwardClickToSelector) {
        return;
      }
      const button = localRef.current?.querySelector<HTMLElement>(".SelectorBase-button");
      const target = event.target as Node | null;

      if (!button || (target && button.contains(target))) {
        wasOpenOnPointerDown.current = false;
        return;
      }

      const rootState = button.closest("[data-headlessui-state]")?.getAttribute("data-headlessui-state") ?? "";
      const buttonState = button.getAttribute("data-headlessui-state") ?? "";
      wasOpenOnPointerDown.current =
        button.getAttribute("aria-expanded") === "true" || rootState.includes("open") || buttonState.includes("open");
    },
    [forwardClickToSelector]
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!forwardClickToSelector || disabled) {
        return;
      }
      const button = localRef.current?.querySelector<HTMLElement>(".SelectorBase-button");
      const target = event.target as Node | null;

      if (!button || button.classList.contains("SelectorBase-button-disabled") || (target && button.contains(target))) {
        wasOpenOnPointerDown.current = false;
        return;
      }

      if (wasOpenOnPointerDown.current) {
        wasOpenOnPointerDown.current = false;
        return;
      }

      button.click();
      wasOpenOnPointerDown.current = false;
    },
    [forwardClickToSelector, disabled]
  );

  return (
    <div
      ref={setContainerRef}
      className={cx(
        "flex items-center justify-between gap-10 rounded-4 bg-slate-800 px-8 py-[2px]",
        disabled ? "cursor-default opacity-50" : "cursor-pointer",
        className
      )}
      onPointerDown={disabled ? undefined : handlePointerDown}
      onClick={disabled ? undefined : handleClick}
    >
      <div className={cx("select-none text-13 text-typography-secondary", labelClassName)}>{label}</div>
      <div className={cx("flex min-w-0 flex-1 justify-end", contentClassName)}>{content}</div>
    </div>
  );
}
