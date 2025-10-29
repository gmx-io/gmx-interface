import { encodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import { getProvider } from "lib/rpc";
import { simulateCallDataWithTenderly, TenderlyConfig } from "lib/tenderly";
import { ERC20Address } from "sdk/types/tokens";

import {
  EstimateMultichainDepositNetworkComposeGasParameters,
  getEstimateMultichainDepositNetworkComposeGasParameters,
} from "./estimateMultichainDepositNetworkComposeGas";

type TenderlyTraceResponse = {
  transaction: {
    call_trace: { error?: string }[];
  };
};

function hasExecutionRevertedError(json: TenderlyTraceResponse) {
  return json.transaction.call_trace.some((call: { error?: string }) => call.error?.includes("execution reverted"));
}

const tenderlyConfig = {
  accessKey: import.meta.env.TENDERLY_ACCESS_KEY,
  accountSlug: import.meta.env.TENDERLY_ACCOUNT,
  projectSlug: import.meta.env.TENDERLY_PROJECT,
  enabled: true,
};

const MOCK_VALID_DATA: EstimateMultichainDepositNetworkComposeGasParameters = {
  action: {
    actionType: 1,
    actionData: {
      relayParams: {
        oracleParams: {
          tokens: ["0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73"],
          providers: ["0xa76BF7f977E80ac0bff49BDC98a27b7b070a937d", "0xa76BF7f977E80ac0bff49BDC98a27b7b070a937d"],
          data: ["0x", "0x"],
        },
        tokenPermits: [],
        externalCalls: {
          sendTokens: [],
          sendAmounts: [],
          externalCallTargets: [],
          externalCallDataList: [],
          refundReceivers: [],
          refundTokens: [],
        },
        fee: {
          feeToken: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
          feeAmount: 2436711n,
          feeSwapPath: ["0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc"],
        },
        desChainId: 421614n,
        userNonce: 1760446679n,
        deadline: 1760450279n,
      },
      transferRequests: {
        tokens: ["0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773"],
        receivers: ["0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A"],
        amounts: [1000000n],
      },
      params: {
        addresses: {
          receiver: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
          callbackContract: "0x0000000000000000000000000000000000000000",
          uiFeeReceiver: "0xff00000000000000000000000000000000000001",
          market: "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc",
          initialLongToken: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73" as ERC20Address,
          initialShortToken: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773" as ERC20Address,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
        },
        minMarketTokens: 917474877705194438n,
        shouldUnwrapNativeToken: false,
        executionFee: 490769400000000n,
        callbackGasLimit: 0n,
        dataList: [
          "0x1e00e1bfa18454bf880ac17012d43b7b87f2a386d674ef67395563b8fb6c5a5e",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          "0x0000000000000000000000000000000000000000000000000000000000000040",
          "0x00000000000000000000000000000000000000000000000000000000000000e0",
          "0x0000000000000000000000000000000000000000000000000000000000066eee",
          "0x0000000000000000000000000000000000000000000000000000000068ee56e6",
          "0x000000000000000000000000e4ebcac4a2e6cbee385ee407f7d5e278bc07e11e",
          "0x00000000000000000000000000000000000000000000000000000000000000a0",
          "0x0000000000000000000000000000000000000000000000000cbb868a4ff68bc6",
          "0x0000000000000000000000000000000000000000000000000000000000000020",
          "0x0000000000000000000000000000000000000000000000000000000000009ce1",
        ],
      },
      signature:
        "0x2ea8caa02ce5e873a03e9cadb481b8a02e3e1dd819582437706efa11ae80c53172744a1431803e590a5fc9afd60b017e2a33b188b4ede8cf46d4beb19040c88e1c",
    },
  },
  chainId: 421614,
  account: "0x9f3DDD654A2bdB2650DCAFdF02392dabf7eCe0Fb",
  srcChainId: 11155111,
  tokenAddress: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
};

const MOCK_INVALID_DATA: EstimateMultichainDepositNetworkComposeGasParameters = {
  action: {
    actionType: 1,
    actionData: {
      relayParams: {
        oracleParams: {
          tokens: ["0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73"],
          providers: ["0xa76BF7f977E80ac0bff49BDC98a27b7b070a937d", "0xa76BF7f977E80ac0bff49BDC98a27b7b070a937d"],
          data: ["0x", "0x"],
        },
        tokenPermits: [],
        externalCalls: {
          sendTokens: [],
          sendAmounts: [],
          externalCallTargets: [],
          externalCallDataList: [],
          refundReceivers: [],
          refundTokens: [],
        },
        fee: {
          feeToken: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
          // Notice huge inadequate fee amount
          feeAmount: 2436711_000000000000000000n,
          feeSwapPath: ["0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc"],
        },
        desChainId: 421614n,
        userNonce: 1760446679n,
        deadline: 1760450279n,
      },
      transferRequests: {
        tokens: ["0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773"],
        receivers: ["0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A"],
        amounts: [1000000n],
      },
      params: {
        addresses: {
          receiver: "0x414dA6C7c50eADFBD4c67C902c7DAf59F58d32c7",
          callbackContract: "0x0000000000000000000000000000000000000000",
          uiFeeReceiver: "0xff00000000000000000000000000000000000001",
          market: "0xb6fC4C9eB02C35A134044526C62bb15014Ac0Bcc",
          initialLongToken: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73" as ERC20Address,
          initialShortToken: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773" as ERC20Address,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
        },
        minMarketTokens: 917474877705194438n,
        shouldUnwrapNativeToken: false,
        executionFee: 490769400000000n,
        callbackGasLimit: 0n,
        dataList: [
          "0x1e00e1bfa18454bf880ac17012d43b7b87f2a386d674ef67395563b8fb6c5a5e",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          "0x0000000000000000000000000000000000000000000000000000000000000040",
          "0x00000000000000000000000000000000000000000000000000000000000000e0",
          "0x0000000000000000000000000000000000000000000000000000000000066eee",
          "0x0000000000000000000000000000000000000000000000000000000068ee56e6",
          "0x000000000000000000000000e4ebcac4a2e6cbee385ee407f7d5e278bc07e11e",
          "0x00000000000000000000000000000000000000000000000000000000000000a0",
          "0x0000000000000000000000000000000000000000000000000cbb868a4ff68bc6",
          "0x0000000000000000000000000000000000000000000000000000000000000020",
          "0x0000000000000000000000000000000000000000000000000000000000009ce1",
        ],
      },
      signature:
        "0x2ea8caa02ce5e873a03e9cadb481b8a02e3e1dd819582437706efa11ae80c53172744a1431803e590a5fc9afd60b017e2a33b188b4ede8cf46d4beb19040c88e1c",
    },
  },
  chainId: 421614,
  account: "0x9f3DDD654A2bdB2650DCAFdF02392dabf7eCe0Fb",
  srcChainId: 11155111,
  tokenAddress: "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773",
};

describe.skipIf(import.meta.env.TENDERLY_TEST !== "true")(
  "estimateMultichainDepositNetworkComposeGas",
  { timeout: 60_000 },
  () => {
    it("should estimate the compose gas", async () => {
      const input = structuredClone(MOCK_VALID_DATA);

      const parameters = getEstimateMultichainDepositNetworkComposeGasParameters(input);
      const { success, raw } = await simulateCallDataWithTenderly({
        chainId: 421614,
        tenderlyConfig,
        provider: getProvider(undefined, 421614),
        to: parameters.address,
        data: encodeFunctionData(parameters),
        from: parameters.account as string,
        value: 0n,
        blockNumber: 204541897,
        gasPriceData: {
          gasPrice: 0n,
        },
        gasLimit: 8000000n,
        comment: undefined,
        stateOverride: parameters.stateOverride,
      });

      expect(success).toBe(true);

      const hasError = hasExecutionRevertedError(raw);

      expect(hasError).toBe(false);
    });

    it("should contain execution reverted error in the trace", async () => {
      const input = structuredClone(MOCK_INVALID_DATA);

      const parameters = getEstimateMultichainDepositNetworkComposeGasParameters(input);
      const { success, raw } = await simulateCallDataWithTenderly({
        chainId: 421614,
        tenderlyConfig,
        provider: getProvider(undefined, 421614),
        to: parameters.address,
        data: encodeFunctionData(parameters),
        from: parameters.account as string,
        value: 0n,
        blockNumber: 204541897,
        gasPriceData: {
          gasPrice: 0n,
        },
        gasLimit: 8000000n,
        comment: undefined,
        stateOverride: parameters.stateOverride,
      });

      expect(success).toBe(true);

      const hasError = hasExecutionRevertedError(raw);

      expect(hasError).toBe(true);
    });

    it("fetch failed", async () => {
      const simulationId = "92d67a97-8950-488e-b64c-c9fab435b25b";

      const json = await fetchTenderlySimulation(tenderlyConfig, simulationId);

      const hasError = hasExecutionRevertedError(json);

      expect(hasError).toBe(true);
    });

    it("fetch succeeded", async () => {
      const simulationId = "14df1b38-9b31-4932-bcb9-83c9a2abbe25";

      const json = await fetchTenderlySimulation(tenderlyConfig, simulationId);

      const hasError = hasExecutionRevertedError(json);

      expect(hasError).toBe(false);
    });
  }
);

async function fetchTenderlySimulation(
  tenderlyConfig: TenderlyConfig,
  simulationId: string
): Promise<TenderlyTraceResponse> {
  return fetch(
    `https://api.tenderly.co/api/v1/account/${tenderlyConfig.accountSlug}/project/${tenderlyConfig.projectSlug}/simulations/${simulationId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": tenderlyConfig.accessKey,
      },
      method: "POST",
    }
  ).then((res) => res.json() as Promise<TenderlyTraceResponse>);
}
