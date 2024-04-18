import { useGlobalContext } from "context/GlobalContext/GlobalContextProvider";

export function usePendingTxns() {
  const { setPendingTxns, pendingTxns } = useGlobalContext();
  return [pendingTxns, setPendingTxns] as const;
}
