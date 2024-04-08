import { useGlobalContext } from "context/GlobalContext/GlobalContextProvider";

export function useTradePageVersion() {
  const { setTradePageVersion, tradePageVersion } = useGlobalContext();
  return [tradePageVersion, setTradePageVersion] as const;
}
