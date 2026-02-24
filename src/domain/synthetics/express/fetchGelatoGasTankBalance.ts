import { ContractsChainId } from "config/chains";
import { GELATO_API_KEYS } from "sdk/configs/express";
import { getGelatoRelayerClient } from "sdk/utils/gelatoRelay";

export async function fetchGelatoGasTankBalance(chainId: number) {
  const apiKey = GELATO_API_KEYS[chainId as ContractsChainId];
  if (!apiKey) return undefined;

  const relayer = getGelatoRelayerClient(apiKey);

  return relayer.getBalance();
}
