import cx from "classnames";
import { ReactNode, useCallback, useRef } from "react";

type Props = {
  leftHeadline: ReactNode;
  leftContent: ReactNode;
  rightHeadline?: ReactNode;
  rightContent?: ReactNode;
  bottomContent?: ReactNode;
  hideDivider?: boolean;
  className?: string;
  qa?: string;
  isDisabled?: boolean;
};

export function TradeInputBox({
  leftHeadline,
  leftContent,
  rightHeadline,
  rightContent,
  bottomContent,
  hideDivider,
  className,
  qa,
  isDisabled,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleBoxClick = useCallback((e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest("[data-toggle-selector]") ||
      (e.target as HTMLElement).closest("[data-token-selector]")
    ) {
      return;
    }
    const input = containerRef.current?.querySelector("input");
    input?.focus();
  }, []);

  return (
    <div data-qa={qa}>
      <div
        ref={containerRef}
        className={cx(
          "flex cursor-text rounded-8 border border-slate-800 bg-slate-800",
          {
            "bg-slate-900": isDisabled,
            "focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300": !isDisabled,
          },
          className
        )}
        onClick={handleBoxClick}
      >
        <div className="flex min-w-0 grow flex-col gap-2 pb-8 pl-12 pt-10">
          <div className="text-body-small pr-12 text-typography-secondary">{leftHeadline}</div>
          <div className={cx("flex items-center gap-4 pr-12", { "border-r-1/2 border-r-slate-600": !hideDivider })}>
            {leftContent}
          </div>
          {bottomContent}
        </div>

        {(rightHeadline || rightContent) && (
          <div className="flex w-[124px] shrink-0 flex-col justify-end gap-4 px-12 pb-8 pt-10">
            {rightHeadline && (
              <div className="text-body-small flex items-center justify-end text-typography-secondary">
                {rightHeadline}
              </div>
            )}
            {rightContent && <div className="flex min-h-20 items-center justify-end">{rightContent}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
