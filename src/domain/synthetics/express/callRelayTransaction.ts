import type { Provider } from "ethers";

import { GMX_SIMULATION_ORIGIN } from "config/dataStore";

export async function callRelayTransaction({
  calldata,
  provider,
  relayRouterAddress,
}: {
  calldata: string;
  provider: Provider;
  relayRouterAddress: string;
}) {
  try {
    return await provider.call({
      to: relayRouterAddress,
      from: GMX_SIMULATION_ORIGIN,
      data: calldata,
    });
  } catch (ex) {
    if (ex.error) {
      // this gives much more readable error in the console with a stacktrace
      throw ex.error;
    }
    throw ex;
  }
}
