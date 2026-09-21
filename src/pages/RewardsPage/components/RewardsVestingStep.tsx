import { Trans } from "@lingui/macro";
import cx from "classnames";

import CheckIcon from "img/ic_check.svg?react";
import SpinnerBlueIcon from "img/ic_spinner_blue.svg?react";

export function RewardsVestingStep({
  index,
  status,
  label,
  completedLabel,
  showConnector,
}: {
  index: number;
  status: "pending" | "loading" | "completed";
  label: React.ReactNode;
  completedLabel: React.ReactNode;
  showConnector: boolean;
}) {
  return (
    <div className="flex min-h-20 gap-10">
      <div className="relative z-10 flex w-20 shrink-0 justify-center self-stretch pt-1">
        {showConnector ? (
          <span className="absolute -bottom-13 left-1/2 top-21 z-0 w-2 -translate-x-1/2 bg-slate-600" />
        ) : null}
        <span
          className={cx(
            "relative z-10 flex size-20 shrink-0 items-center justify-center rounded-full text-12 font-medium normal-nums",
            status === "loading"
              ? "bg-blue-300/20 text-blue-300"
              : status === "completed"
                ? "bg-green-500/20 text-green-500"
                : "bg-blue-300/20 text-blue-300"
          )}
        >
          {status === "completed" ? (
            <CheckIcon className="size-16" />
          ) : status === "loading" ? (
            <SpinnerBlueIcon className="size-16 animate-spin" />
          ) : (
            index
          )}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-8">
        <span
          className={cx(
            "text-13 font-medium",
            status === "pending" ? "text-typography-secondary" : "text-typography-primary"
          )}
        >
          {status === "completed" ? completedLabel : label}
        </span>
        <span
          className={cx(
            "w-72 shrink-0 rounded-full px-7 py-2 text-center text-11 font-medium",
            status === "loading"
              ? "bg-blue-300/10 text-blue-300"
              : status === "completed"
                ? "bg-green-500/10 text-green-500"
                : "invisible"
          )}
        >
          {status === "completed" ? <Trans>Completed</Trans> : <Trans>In progress</Trans>}
        </span>
      </div>
    </div>
  );
}
