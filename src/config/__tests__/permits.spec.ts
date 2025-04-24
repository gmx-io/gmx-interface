import { getTokenPermitParamsCalls } from "domain/synthetics/gassless/txns/tokenPermitUtils";
import { Contract } from "ethers";
import { zeroAddress } from "viem";
import { describe, it } from "vitest";

import { getChainName, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getContract } from "config/contracts";
import { getProvider } from "lib/rpc";
import { abis } from "sdk/abis";
import { getV2Tokens } from "sdk/configs/tokens";
import { ZERO_DATA } from "sdk/utils/hash";


describe("UI token permit configs", () => {
  SUPPORTED_CHAIN_IDS.forEach(async (chainId) => {
    it(`tokens isPermitSupported should be consistent with contracts for ${getChainName(chainId)}`, async () => {
      const provider = getProvider(undefined, chainId);
      const multicall = new Contract(getContract(chainId, "Multicall"), abis.Multicall, provider);
      const tokens = getV2Tokens(chainId).filter((token) => !token.isNative && !token.isSynthetic);

      const calls = tokens.flatMap((token) => Object.values(getTokenPermitParamsCalls(token.address, zeroAddress)));
      const checksCount = Object.values(getTokenPermitParamsCalls(zeroAddress, zeroAddress)).length;

      const results: [boolean, any][] = await multicall.tryAggregate.staticCall(false, calls);

      const errors: string[] = [];

      tokens.forEach((token, index) => {
        const tokenResults = results.slice(index * checksCount, (index + 1) * checksCount);
        const supportsPerm = tokenResults.every((result) => Boolean(result[0]) && result[1] !== ZERO_DATA);

        if (supportsPerm !== Boolean(token.isPermitSupported)) {
          errors.push(
            `Exprected ${getChainName(chainId)} token ${token.address} ${token.symbol} isPermitSupported is ${supportsPerm} but got ${token.isPermitSupported}`
          );
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join("\n"));
      }
    });
  });
});
