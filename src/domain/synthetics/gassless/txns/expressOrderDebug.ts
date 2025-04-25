import { Hex, decodeFunctionData, encodePacked, etherUnits, type Address, type PublicClient } from "viem";

import { multichainOrderRouterAbi } from "wagmi-generated";

const GELATO_RELAY_ADDRESS = "0xcd565435e0d2109feFde337a66491541Df0D1420";

export async function callRelayTransaction({
  calldata,
  gelatoRelayFeeToken,
  gelatoRelayFeeAmount,
  client,
  relayRouterAddress,
}: {
  calldata: string;
  gelatoRelayFeeToken: string;
  gelatoRelayFeeAmount: bigint;
  client: PublicClient;
  relayRouterAddress: Address;
}) {
  try {
    return await client.call({
      account: GELATO_RELAY_ADDRESS,
      to: relayRouterAddress,
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
