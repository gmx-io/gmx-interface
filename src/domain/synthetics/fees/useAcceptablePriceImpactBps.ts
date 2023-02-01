import { useWeb3React } from "@web3-react/core";
import { SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY } from "config/localStorage";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/synthetics";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify } from "lib/numbers";

export function useAcceptablePriceImpactBps() {
  const { chainId } = useWeb3React();

  const [acceptbalePriceImpactBps, setAcceptablePriceImpactBps] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY],
    DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS
  );

  return {
    acceptbalePriceImpactBps: bigNumberify(acceptbalePriceImpactBps!),
    setAcceptablePriceImpactBps,
  };
}
