import { Trans } from "@lingui/macro";
import cx from "classnames";
import { createContext, useContext } from "react";

import Loader from "components/Loader/Loader";

/**
 * Data state of the Stats page.
 * - "ready": the data is shown.
 * - "loading": until every source behind the page has answered. Figures show a dash (at most 5 s, the rule for
 *   Stats figures) and charts, tables and maps show the loader.
 * - "empty": a source returned no data. Figures show a dash and charts say "No data available".
 */
export type StatsDataState = "ready" | "loading" | "empty";

const StatsDataStateContext = createContext<StatsDataState>("ready");

export const StatsDataStateProvider = StatsDataStateContext.Provider;

export function useStatsDataState() {
  return useContext(StatsDataStateContext);
}

/** Shown instead of a figure until its data is ready. */
export const NO_VALUE = "—";

/** Shown instead of a chart, table or map until its data is ready. */
export function StatsStatus({ state, className }: { state: StatsDataState; className?: string }) {
  return (
    <div
      role="status"
      className={cx("text-body-medium flex items-center justify-center text-typography-secondary", className)}
    >
      {state === "loading" ? (
        <>
          <Loader />
          <span className="sr-only">
            <Trans>Loading...</Trans>
          </span>
        </>
      ) : (
        <Trans>No data available</Trans>
      )}
    </div>
  );
}
