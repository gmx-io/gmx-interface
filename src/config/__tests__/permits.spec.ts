import { createPublicClient, http, zeroAddress } from "viem";
import { describe, it } from "vitest";

import { getChainName, getViemChain, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getTokenPermitParamsCalls } from "domain/tokens/permitUtils";
import { getV2Tokens } from "sdk/configs/tokens";

describe("UI token permit configs", () => {
  SUPPORTED_CHAIN_IDS.forEach(async (chainId) => {
    const publicClient = createPublicClient({
      chain: getViemChain(chainId) as any,
      transport: http(),
    });

    it.skip(`tokens isPermitSupported should be consistent with contracts for ${getChainName(chainId)}`, async () => {
      const tokens = getV2Tokens(chainId).filter((token) => !token.isNative && !token.isSynthetic);

      const calls = tokens.flatMap((token) =>
        Object.values(getTokenPermitParamsCalls(token.address, zeroAddress))
      ) as any;
      const checksCount = Object.values(getTokenPermitParamsCalls(zeroAddress, zeroAddress)).length;

      const results = await publicClient.multicall({
        contracts: calls,
        allowFailure: true,
      });

      const errors: string[] = [];

      tokens.forEach((token, index) => {
        const tokenResults = results.slice(index * checksCount, (index + 1) * checksCount);

        const supportsPerm = tokenResults.every((result) => !result.error);

        if (supportsPerm !== Boolean(token.isPermitSupported)) {
          errors.push(
            `Exprected ${getChainName(chainId)} token ${token.address} ${token.symbol} isPermitSupported is ${supportsPerm} but got ${token.isPermitSupported} ${tokenResults}`
          );
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join("\n"));
      }
    });
  });
});
