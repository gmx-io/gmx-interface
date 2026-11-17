import { USD_DECIMALS } from "config/factors";
import {
  DEBUG_PAXOS_TRANSIT_FORCE_STANDARD_KEY,
  DEBUG_PAXOS_TRANSIT_IGNORE_WHITELIST_KEY,
  DEBUG_PAXOS_TRANSIT_MOCK_KEY,
  DEBUG_PAXOS_TRANSIT_THRESHOLD_USD_KEY,
} from "config/localStorage";
import { selectShowDebugValues } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { parseValue } from "lib/numbers";

export function usePaxosTransitDebugSettings() {
  const showDebugValues = useSelector(selectShowDebugValues);
  const [isWhitelistIgnoredSetting] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_IGNORE_WHITELIST_KEY, false);
  const [isMockedSetting] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_MOCK_KEY, false);
  const [thresholdUsdInput] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_THRESHOLD_USD_KEY, "");
  const [isStandardForcedSetting] = useLocalStorageSerializeKey(DEBUG_PAXOS_TRANSIT_FORCE_STANDARD_KEY, false);

  return {
    isWhitelistIgnored: showDebugValues && Boolean(isWhitelistIgnoredSetting),
    isStandardForced: showDebugValues && Boolean(isStandardForcedSetting),
    isMocked: showDebugValues && Boolean(isMockedSetting),
    thresholdUsdOverride:
      showDebugValues && thresholdUsdInput ? parseValue(thresholdUsdInput, USD_DECIMALS) : undefined,
  };
}
