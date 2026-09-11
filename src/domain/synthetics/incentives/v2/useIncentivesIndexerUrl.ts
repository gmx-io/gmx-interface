import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { getIncentivesIndexerUrl } from "./client";

export function useIncentivesIndexerUrl(chainId: number) {
  const { incentivesTestSquid } = useSettings();

  return getIncentivesIndexerUrl(chainId, incentivesTestSquid);
}
