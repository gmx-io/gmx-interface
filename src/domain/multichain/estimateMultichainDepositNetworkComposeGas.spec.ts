import { encodeFunctionData, maxUint256 } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { simulateCallDataWithTenderly, TenderlyConfig } from "lib/tenderly";
import { ISigner } from "lib/transactions/iSigner";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import type { ERC20Address } from "sdk/types/tokens";

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
          tokens: ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
          providers: ["0x38B8dB61b724b51e42A88Cb8eC564CD685a0f53B", "0x38B8dB61b724b51e42A88Cb8eC564CD685a0f53B"],
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
          feeToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
          feeAmount: 1508772n,
          feeSwapPath: ["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"],
        },
        desChainId: 42161n,
        userNonce: 1764082828n,
        deadline: 1764086428n,
      },
      transferRequests: {
        tokens: ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831"],
        receivers: ["0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55"],
        amounts: [5000000n],
      },
      params: {
        addresses: {
          receiver: "0x8918F029ce357837294D71B2270eD403aac0eEc8",
          callbackContract: "0x0000000000000000000000000000000000000000",
          uiFeeReceiver: "0xff00000000000000000000000000000000000001",
          market: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
          initialLongToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as ERC20Address,
          initialShortToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as ERC20Address,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
        },
        minMarketTokens: 2661358281426942384n,
        shouldUnwrapNativeToken: false,
        callbackGasLimit: 0n,
        dataList: [
          "0x1e00e1bfa18454bf880ac17012d43b7b87f2a386d674ef67395563b8fb6c5a5e",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          "0x0000000000000000000000000000000000000000000000000000000000000040",
          "0x00000000000000000000000000000000000000000000000000000000000000e0",
          "0x000000000000000000000000000000000000000000000000000000000000a4b1",
          "0x000000000000000000000000000000000000000000000000000000006925d29a",
          "0x000000000000000000000000fcff5015627b8ce9ceaa7f5b38a6679f65fe39a7",
          "0x00000000000000000000000000000000000000000000000000000000000000a0",
          "0x00000000000000000000000000000000000000000000000024ef0b41a87f39b0",
          "0x0000000000000000000000000000000000000000000000000000000000000020",
          "0x00000000000000000000000000000000000000000000000000000000000075e8",
        ],
        executionFee: 489411485752000n,
      },
      signature:
        "0x8bb4dc64ece788006498902ab4bc905e75fd87cbdc2b3966c8edc888740d730c744f0db6ab807159d4b13de863668e7c0aa617e1bbf8a5f793c5cb3b89c01bc01c",
    },
  },
  chainId: 42161,
  account: "0x82960569BcDd69bad3554cc87DE8d9A7f385E708",
  srcChainId: 8453,
  tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

const MOCK_INVALID_DATA: EstimateMultichainDepositNetworkComposeGasParameters = {
  action: {
    actionType: 1,
    actionData: {
      relayParams: {
        oracleParams: {
          tokens: ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
          providers: ["0x38B8dB61b724b51e42A88Cb8eC564CD685a0f53B", "0x38B8dB61b724b51e42A88Cb8eC564CD685a0f53B"],
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
          feeToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
          // Note huge inadequate fee amount
          feeAmount: maxUint256 / 2n,
          feeSwapPath: ["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"],
        },
        desChainId: 42161n,
        userNonce: 1764082828n,
        deadline: 1764086428n,
      },
      transferRequests: {
        tokens: ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831"],
        receivers: ["0xF89e77e8Dc11691C9e8757e84aaFbCD8A67d7A55"],
        amounts: [5000000n],
      },
      params: {
        addresses: {
          receiver: "0x8918F029ce357837294D71B2270eD403aac0eEc8",
          callbackContract: "0x0000000000000000000000000000000000000000",
          uiFeeReceiver: "0xff00000000000000000000000000000000000001",
          market: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
          initialLongToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as ERC20Address,
          initialShortToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as ERC20Address,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
        },
        minMarketTokens: 2661358281426942384n,
        shouldUnwrapNativeToken: false,
        callbackGasLimit: 0n,
        dataList: [
          "0x1e00e1bfa18454bf880ac17012d43b7b87f2a386d674ef67395563b8fb6c5a5e",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
          "0x0000000000000000000000000000000000000000000000000000000000000040",
          "0x00000000000000000000000000000000000000000000000000000000000000e0",
          "0x000000000000000000000000000000000000000000000000000000000000a4b1",
          "0x000000000000000000000000000000000000000000000000000000006925d29a",
          "0x000000000000000000000000fcff5015627b8ce9ceaa7f5b38a6679f65fe39a7",
          "0x00000000000000000000000000000000000000000000000000000000000000a0",
          "0x00000000000000000000000000000000000000000000000024ef0b41a87f39b0",
          "0x0000000000000000000000000000000000000000000000000000000000000020",
          "0x00000000000000000000000000000000000000000000000000000000000075e8",
        ],
        executionFee: 489411485752000n,
      },
      signature:
        "0x8bb4dc64ece788006498902ab4bc905e75fd87cbdc2b3966c8edc888740d730c744f0db6ab807159d4b13de863668e7c0aa617e1bbf8a5f793c5cb3b89c01bc01c",
    },
  },
  chainId: 42161,
  account: "0x82960569BcDd69bad3554cc87DE8d9A7f385E708",
  srcChainId: 8453,
  tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

describe
  .skipIf(import.meta.env.TENDERLY_TEST !== "true")
  .concurrent("estimateMultichainDepositNetworkComposeGas", { timeout: 60_000 }, () => {
    it("should estimate the compose gas", async () => {
      const input = structuredClone(MOCK_VALID_DATA);

      const parameters = getEstimateMultichainDepositNetworkComposeGasParameters(input);
      const { success, raw } = await simulateCallDataWithTenderly({
        chainId: ARBITRUM,
        tenderlyConfig,
        provider: await ISigner.from({ viemPublicClient: getPublicClientWithRpc(ARBITRUM) }),
        to: parameters.address,
        data: encodeFunctionData(parameters),
        from: parameters.account as string,
        value: 0n,
        blockNumber: 404004261,
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
        chainId: ARBITRUM,
        tenderlyConfig,
        provider: await ISigner.from({ viemPublicClient: getPublicClientWithRpc(ARBITRUM) }),
        to: parameters.address,
        data: encodeFunctionData(parameters),
        from: parameters.account as string,
        value: 0n,
        blockNumber: 404004261,
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
  });

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
