import type { WhaleWindow } from "domain/synthetics/whales/period";
import { useLocalStorageSerializeKey } from "lib/localStorage";

// Persisted (localStorage) so the selected window survives navigation between
// the whale pages and reloads.
export function useWhaleWindow(): [WhaleWindow, (next: WhaleWindow) => void] {
  const [window, setWindow] = useLocalStorageSerializeKey<WhaleWindow>("whaleMonitorWindow", "30d");
  return [window ?? "30d", setWindow];
}
