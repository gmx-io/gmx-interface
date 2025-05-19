import type { Provider } from "ethers";
import { Hex, encodePacked, type Address } from "viem";

import { GMX_SIMULATION_ORIGIN } from "config/dataStore";

export const GELATO_RELAY_ADDRESS = "0xcd565435e0d2109feFde337a66491541Df0D1420";

export async function callRelayTransaction({
  calldata,
  gelatoRelayFeeToken,
  gelatoRelayFeeAmount,
  provider,
  relayRouterAddress,
}: {
  calldata: string;
  gelatoRelayFeeToken: string;
  gelatoRelayFeeAmount: bigint;
  provider: Provider;
  relayRouterAddress: string;
}) {
  try {
    return await provider.call({
      to: relayRouterAddress,
      from: GMX_SIMULATION_ORIGIN,
      data: encodePacked(
        ["bytes", "address", "address", "uint256"],
        [calldata as Hex, GELATO_RELAY_ADDRESS, gelatoRelayFeeToken as Address, gelatoRelayFeeAmount]
      ),
    });
  } catch (ex) {
    if (ex.error) {
      // this gives much more readable error in the console with a stacktrace
      throw ex.error;
    }
    throw ex;
  }
}
