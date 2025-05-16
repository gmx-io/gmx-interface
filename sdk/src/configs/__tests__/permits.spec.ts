import { createPublicClient, http, zeroAddress } from "viem";
import { describe, it } from "vitest";

import { abis } from "abis";
import { getChainName, getViemChain, SUPPORTED_CHAIN_IDS } from "configs/chains";
import { getV2Tokens } from "configs/tokens";

const validPermitErrorParts = ["ERC20Permit", "permit-expired", "permit is expired"];

describe("UI token permit configs", () => {
  SUPPORTED_CHAIN_IDS.forEach(async (chainId) => {
    const publicClient = createPublicClient({
      chain: getViemChain(chainId) as any,
      transport: http(),
    });

    it(`tokens isPermitSupported should be consistent with contracts for ${getChainName(chainId)}`, async () => {
      const tokens = getV2Tokens(chainId).filter((token) => !token.isNative && !token.isSynthetic);

      const calls = tokens.map((token) => ({
        address: token.address as `0x${string}`,
        abi: abis.ERC20PermitInterface,
        functionName: "permit" as const,
        args: [
          zeroAddress,
          zeroAddress,
          0n,
          0n,
          0,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ] as const,
      }));

      const results = await publicClient.multicall({
        contracts: calls,
        allowFailure: true,
      });

      const errors: string[] = [];

      tokens.forEach((token, index) => {
        const result = results[index];
        const supportsPermit = Boolean(
          result.error && validPermitErrorParts.some((part) => result.error.message.includes(part))
        );

        if (supportsPermit !== Boolean(token.isPermitSupported)) {
          errors.push(
            `${getChainName(chainId)} ${token.symbol} isPermitSupported should be ${supportsPermit}, address: ${token.address}, error: ${result.error?.message.slice(0, 100) || "none"}`
          );
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join("\n"));
      }
    });

    it(`tokens with permit support should have required methods for ${getChainName(chainId)}`, async () => {
      const tokens = getV2Tokens(chainId).filter(
        (token) => !token.isNative && !token.isSynthetic && token.isPermitSupported
      );

      const requiredMethodsAbi = [
        {
          name: "name",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [],
          outputs: [{ type: "string" }],
        },
        {
          name: "version",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [],
          outputs: [{ type: "string" }],
        },
        {
          name: "nonces",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ type: "uint256" }],
          args: [zeroAddress],
        },
      ] as const;

      const methodsCount = requiredMethodsAbi.length;

      const calls = tokens.flatMap((token) =>
        requiredMethodsAbi.map((method) => ({
          address: token.address as `0x${string}`,
          abi: [method],
          functionName: method.name,
          args: method.name === "nonces" ? [zeroAddress] : [],
        }))
      );

      const results = await publicClient.multicall({
        contracts: calls,
        allowFailure: true,
      });

      const errors: string[] = [];

      tokens.forEach((token, tokenIndex) => {
        const tokenResults = results.slice(tokenIndex * methodsCount, (tokenIndex + 1) * methodsCount);
        const hasName = !tokenResults[0].error;
        const hasVersion = !tokenResults[1].error;
        const hasNonces = !tokenResults[2].error;

        const missingMethods: string[] = [];

        if (!hasName && !token.name) {
          missingMethods.push("name");
        }

        if (!hasVersion && !token.contractVersion) {
          missingMethods.push("version");
        }

        if (!hasNonces) {
          missingMethods.push("nonces");
        }

        if (missingMethods.length > 0) {
          errors.push(
            `${getChainName(chainId)} ${token.symbol} (${token.address}) is marked as permit supported but missing methods: ${missingMethods.join(", ")}`
          );
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join("\n"));
      }
    });
  });
});
