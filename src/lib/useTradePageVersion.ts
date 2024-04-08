import { getIsSyntheticsSupported } from "config/features";
import { useChainId } from "./chains";
import { useLocalStorageSerializeKey } from "./localStorage";
import { TRADE_LINK_KEY } from "config/localStorage";

export function useTradePageVersion() {
  const { chainId } = useChainId();
  const defaultVersion = getIsSyntheticsSupported(chainId) ? 2 : 1;
  const [tradePageVersionRaw, setTradePageVersion] = useLocalStorageSerializeKey(
    [chainId, TRADE_LINK_KEY],
    defaultVersion
  );
  const tradePageVersion = tradePageVersionRaw ?? defaultVersion;

  return [tradePageVersion, setTradePageVersion] as const;
}
