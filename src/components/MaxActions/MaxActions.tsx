import { Trans } from "@lingui/macro";
import cx from "classnames";
import { MouseEvent, ReactNode, useCallback } from "react";

import type { MaxActionsState } from "domain/tokens/useMaxAvailableAmount";
import { userAnalytics } from "lib/userAnalytics";
import type { MaxActionClickEvent } from "lib/userAnalytics/types";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type Props = {
  state: MaxActionsState;
  onMax: () => void;
  onKeepGas?: () => void;
  qa?: string;
  className?: string;
};

export function getIsMaxActionDisabled(state: MaxActionsState): boolean {
  return state.isLoading || state.isFeeUnavailable || state.isInsufficientForFee;
}

export function MaxActions({ state, onMax, onKeepGas, qa = "input", className }: Props) {
  const handleMax = useCallback(() => {
    userAnalytics.pushEvent<MaxActionClickEvent>({ event: "MaxAction", data: { action: "MaxClick" } });
    onMax();
  }, [onMax]);

  const handleKeepGas = useCallback(() => {
    userAnalytics.pushEvent<MaxActionClickEvent>({ event: "MaxAction", data: { action: "KeepGasClick" } });
    onKeepGas?.();
  }, [onKeepGas]);

  return (
    <div className={cx("flex shrink-0 items-center gap-4", className)}>
      {state.showKeepGas && (
        <MaxActionPill
          qa={qa + "-keep-gas"}
          isSelected={state.selected === "keepGas"}
          isDisabled={state.isLoading}
          isLoading={state.isLoading}
          tooltip={state.keepGasTooltip}
          onClick={handleKeepGas}
        >
          <Trans>Keep gas</Trans>
        </MaxActionPill>
      )}
      <MaxActionPill
        qa={qa + "-max"}
        isSelected={state.selected === "max"}
        isDisabled={getIsMaxActionDisabled(state)}
        isLoading={state.isLoading}
        tooltip={state.maxTooltip}
        onClick={handleMax}
      >
        <Trans>Max</Trans>
      </MaxActionPill>
    </div>
  );
}

function MaxActionPill({
  qa,
  isSelected,
  isDisabled,
  isLoading,
  tooltip,
  onClick,
  children,
}: {
  qa: string;
  isSelected: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  tooltip: string | undefined;
  onClick: () => void;
  children: ReactNode;
}) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!isDisabled) {
        onClick();
      }
    },
    [isDisabled, onClick]
  );

  return (
    <TooltipWithPortal
      content={tooltip}
      disabled={tooltip === undefined}
      isHandlerDisabled={isDisabled}
      handleClassName={isDisabled ? "!cursor-not-allowed" : undefined}
      shouldPreventDefault={false}
      variant="none"
      position="bottom"
    >
      <button
        type="button"
        data-qa={qa}
        aria-pressed={isSelected}
        aria-busy={isLoading || undefined}
        disabled={isDisabled}
        onClick={handleClick}
        className={cx("whitespace-nowrap rounded-full px-8 py-2 text-12 font-medium transition-colors", {
          "bg-button-secondary text-typography-primary": isSelected,
          "bg-slate-600 text-typography-secondary hover:bg-slate-500 hover:text-typography-primary": !isSelected,
          "cursor-not-allowed opacity-50": isDisabled,
        })}
      >
        {children}
      </button>
    </TooltipWithPortal>
  );
}

export function MaxActionsHint({ hint }: { hint: string | undefined }) {
  if (hint === undefined) {
    return null;
  }

  return <div className="text-12 text-typography-secondary">{hint}</div>;
}
