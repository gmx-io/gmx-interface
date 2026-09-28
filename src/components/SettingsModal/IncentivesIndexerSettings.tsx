import { t, Trans } from "@lingui/macro";
import { useCallback, type ChangeEvent } from "react";

import { INCENTIVES_TEST_SQUIDS, type IncentivesTestSquid } from "config/indexers";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

export function IncentivesIndexerSettings() {
  const { incentivesTestSquid, setIncentivesTestSquid } = useSettings();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setIncentivesTestSquid(event.target.value as IncentivesTestSquid);
    },
    [setIncentivesTestSquid]
  );

  return (
    <div className="flex items-center justify-between gap-8">
      <label htmlFor="incentives-test-squid">
        <Trans>Incentives test squid</Trans>
      </label>
      <select
        id="incentives-test-squid"
        aria-label={t`Incentives test squid`}
        value={incentivesTestSquid}
        onChange={handleChange}
        className="rounded-4 border-1/2 border-slate-600 bg-slate-800 px-8 py-6 text-12 text-typography-primary"
      >
        {INCENTIVES_TEST_SQUIDS.map((squid) => (
          <option key={squid} value={squid}>
            {squid}
          </option>
        ))}
      </select>
    </div>
  );
}
