import { useChainContext } from "context/ChainContext/ChainContext";

export function useChainId() {
  return useChainContext();
}
