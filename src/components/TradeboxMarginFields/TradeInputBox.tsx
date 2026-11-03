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
          "flex cursor-text flex-col gap-2 overflow-hidden rounded-8 border border-fill-surfaceElevated bg-fill-surfaceElevated pb-8 pt-10",
          {
            "bg-fill-surfaceBase": isDisabled,
            "focus-within:border-blue-strong hover:bg-fill-surfaceHover active:border-blue-strong": !isDisabled,
          },
          className
        )}
        onClick={handleBoxClick}
      >
        {(leftHeadline || rightHeadline) && (
          <div className="text-body-small flex items-center justify-between gap-8 px-12 text-textIcon-secondary">
            <div className="min-w-0 truncate">{leftHeadline}</div>
            {rightHeadline && <div className="flex shrink-0 items-center">{rightHeadline}</div>}
          </div>
        )}

        <div className="flex">
          <div className="flex min-w-0 grow flex-col gap-2 pl-12">
            <div
              className={cx("flex items-center gap-4 pr-12", { "border-r-1/2 border-r-stroke-primary": !hideDivider })}
            >
              {leftContent}
            </div>
            {bottomContent}
          </div>

          {rightContent && (
            <div className="flex min-h-20 w-[124px] shrink-0 items-center justify-end px-12">{rightContent}</div>
          )}
        </div>
      </div>
    </div>
  );
}
