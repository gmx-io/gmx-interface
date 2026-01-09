import type { Provider } from "ethers";
import { encodePacked } from "viem";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";

export async function callRelayTransaction({
  chainId,
  calldata,
  gelatoRelayFeeToken,
  gelatoRelayFeeAmount,
  provider,
  relayRouterAddress,
}: {
  chainId: ContractsChainId;
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
        [calldata, getContract(chainId, "GelatoRelayAddress"), gelatoRelayFeeToken, gelatoRelayFeeAmount]
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
