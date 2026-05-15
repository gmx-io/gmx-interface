import { describe, expect, it, vi } from "vitest";

import { SOURCE_BASE_MAINNET } from "configs/chains";
import type { IHttp } from "utils/http/types";
import {
  executeCrossChainWithdraw,
  getCrossChainWithdrawStatus,
  prepareCrossChainDeposit,
  prepareCrossChainWithdraw,
  signCrossChainWithdrawPrepared,
  submitCrossChainWithdraw,
} from "utils/multichainTransferApi/api";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const TOKEN = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const STARGATE = "0x27a16dc786820B16E5c9028b75B99F6f604b5d26";
const RELAYER_FEE_TOKEN = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const ROUTER = "0x2222222222222222222222222222222222222222";

function makeHttp(response: unknown): IHttp & { postJson: ReturnType<typeof vi.fn> } {
  return {
    url: "http://api.test",
    fetchJson: vi.fn(),
    postJson: vi
      .fn()
      .mockImplementation(async (_path, _body, opts) => (opts?.transform ? opts.transform(response) : response)),
  } as any;
}

describe("multichainTransferApi: prepareCrossChainDeposit", () => {
  it("posts to /deposit/cross-chain/prepare and parses bigints back", async () => {
    const http = makeHttp({
      payloadType: "transaction",
      payload: { to: STARGATE, data: "0xabcd", value: "12345" },
      composeGas: "300000",
      nativeFee: "12345",
      expiresAt: 1730000000,
    });

    const result = await prepareCrossChainDeposit(
      { api: http },
      {
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        tokenAddress: TOKEN,
        sourceStargatePoolAddress: STARGATE,
        isNativeOnSource: false,
        amount: 1_000_000n,
        nativeFee: 12_345n,
      }
    );

    expect(http.postJson).toHaveBeenCalledOnce();
    const [path, body] = http.postJson.mock.calls[0];
    expect(path).toBe("/multichain-transfer/deposit/cross-chain/prepare");
    // Bigints are forwarded as-is; HttpClient.postJson serializes them via bigIntReplacer at fetch time.
    expect(body).toMatchObject({
      account: ACCOUNT,
      amount: 1_000_000n,
      nativeFee: 12_345n,
      isNativeOnSource: false,
    });

    expect(result.payload.value).toBe(12_345n);
    expect(result.composeGas).toBe(300_000n);
    expect(result.nativeFee).toBe(12_345n);
  });
});

describe("multichainTransferApi: prepareCrossChainWithdraw", () => {
  it("posts to /withdraw/cross-chain/prepare and parses gasPaymentParams bigints", async () => {
    const http = makeHttp({
      payloadType: "typed-data",
      requestId: "req-abc",
      payload: {
        typedData: {
          domain: { chainId: 1, name: "GmxBaseGelatoRelayRouter" },
          types: { BridgeOut: [{ name: "token", type: "address" }] },
          primaryType: "BridgeOut",
          message: { token: TOKEN, amount: "1000000" },
        },
        relayParams: { deadline: "1730000000" },
        relayRouterAddress: ROUTER,
        gasPaymentParams: {
          relayerFeeTokenAddress: RELAYER_FEE_TOKEN,
          relayerFeeAmount: "5000",
          gasPaymentTokenAddress: RELAYER_FEE_TOKEN,
          gasPaymentTokenAmount: "5000",
        },
      },
      expiresAt: 1730000000,
    });

    const result = await prepareCrossChainWithdraw(
      { api: http },
      {
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        bridgeOutParams: {
          token: TOKEN,
          amount: 1_000_000n,
          minAmountOut: 995_000n,
          provider: STARGATE,
          data: "0x",
        },
      }
    );

    expect(http.postJson.mock.calls[0][0]).toBe("/multichain-transfer/withdraw/cross-chain/prepare");
    expect(result.requestId).toBe("req-abc");
    expect(result.payload.gasPaymentParams.relayerFeeAmount).toBe(5_000n);
    expect(result.payload.gasPaymentParams.gasPaymentTokenAmount).toBe(5_000n);
    expect(result.payload.typedData.primaryType).toBe("BridgeOut");
  });
});

describe("multichainTransferApi: getCrossChainWithdrawStatus", () => {
  it("posts to /withdraw/cross-chain/status with requestId", async () => {
    const http = makeHttp({
      requestId: "req-abc",
      status: "relay_submitted",
      taskId: "task-xyz",
      txHash: "0xhash",
      gelatoStatusCode: 2,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:05.000Z",
    });

    const result = await getCrossChainWithdrawStatus({ api: http }, "req-abc");

    expect(http.postJson.mock.calls[0][0]).toBe("/multichain-transfer/withdraw/cross-chain/status");
    expect(http.postJson.mock.calls[0][1]).toEqual({ requestId: "req-abc" });
    expect(result.status).toBe("relay_submitted");
    expect(result.taskId).toBe("task-xyz");
    expect(result.txHash).toBe("0xhash");
  });
});

describe("multichainTransferApi: submit + execute", () => {
  it("submitCrossChainWithdraw posts signature + requestId to /submit", async () => {
    const http = makeHttp({ requestId: "req-abc", status: "relay_accepted", taskId: "task-xyz" });

    const result = await submitCrossChainWithdraw(
      { api: http },
      {
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        signature: "0xdeadbeef",
        bridgeOutParams: {
          token: TOKEN,
          amount: 1_000_000n,
          minAmountOut: 995_000n,
          provider: STARGATE,
          data: "0x",
        },
        relayParamsPayload: { deadline: 1730000000n, fee: { feeAmount: 5_000n } },
        relayerFeeTokenAddress: RELAYER_FEE_TOKEN,
        relayerFeeAmount: 5_000n,
        requestId: "req-abc",
      }
    );

    expect(http.postJson.mock.calls[0][0]).toBe("/multichain-transfer/withdraw/cross-chain/submit");
    // Bigints are forwarded as-is; HttpClient.postJson serializes them via bigIntReplacer at fetch time.
    expect(http.postJson.mock.calls[0][1]).toMatchObject({
      signature: "0xdeadbeef",
      relayerFeeAmount: 5_000n,
      relayParamsPayload: { deadline: 1_730_000_000n, fee: { feeAmount: 5_000n } },
      requestId: "req-abc",
    });
    expect(result.requestId).toBe("req-abc");
    expect(result.taskId).toBe("task-xyz");
  });

  it("signCrossChainWithdrawPrepared calls signer.signTypedData with prepared typedData", async () => {
    const signer = {
      address: ACCOUNT,
      signTypedData: vi.fn().mockResolvedValue("0xsig"),
    } as any;

    const prepared = {
      payloadType: "typed-data" as const,
      requestId: "req-abc",
      payload: {
        typedData: {
          domain: { chainId: 1 },
          types: { BridgeOut: [{ name: "token", type: "address" }] },
          primaryType: "BridgeOut" as const,
          message: { token: TOKEN },
        },
        relayParams: {},
        relayRouterAddress: ROUTER,
        gasPaymentParams: {
          relayerFeeTokenAddress: RELAYER_FEE_TOKEN,
          relayerFeeAmount: 5_000n,
          gasPaymentTokenAddress: RELAYER_FEE_TOKEN,
          gasPaymentTokenAmount: 5_000n,
        },
      },
      expiresAt: 1730000000,
    };

    const sig = await signCrossChainWithdrawPrepared(prepared, signer);

    expect(sig).toBe("0xsig");
    expect(signer.signTypedData).toHaveBeenCalledWith(
      prepared.payload.typedData.domain,
      prepared.payload.typedData.types,
      prepared.payload.typedData.message
    );
  });

  it("executeCrossChainWithdraw chains prepare → sign → submit", async () => {
    const calls: string[] = [];
    const http: IHttp = {
      url: "http://api.test",
      fetchJson: vi.fn(),
      postJson: vi.fn().mockImplementation(async (path, _body, opts) => {
        calls.push(path);
        if (path.endsWith("/prepare")) {
          const raw = {
            payloadType: "typed-data",
            requestId: "req-1",
            payload: {
              typedData: {
                domain: { chainId: 1 },
                types: { BridgeOut: [{ name: "token", type: "address" }] },
                primaryType: "BridgeOut",
                message: { token: TOKEN },
              },
              relayParams: { deadline: "1730000000" },
              relayRouterAddress: ROUTER,
              gasPaymentParams: {
                relayerFeeTokenAddress: RELAYER_FEE_TOKEN,
                relayerFeeAmount: "5000",
                gasPaymentTokenAddress: RELAYER_FEE_TOKEN,
                gasPaymentTokenAmount: "5000",
              },
            },
            expiresAt: 1730000000,
          };
          return opts!.transform!(raw);
        }
        return { requestId: "req-1", status: "relay_accepted", taskId: "task-1" };
      }),
    };

    const signer = {
      address: ACCOUNT,
      signTypedData: vi.fn().mockResolvedValue("0xsig"),
    } as any;

    const result = await executeCrossChainWithdraw(
      { api: http },
      {
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        bridgeOutParams: {
          token: TOKEN,
          amount: 1n,
          minAmountOut: 1n,
          provider: STARGATE,
          data: "0x",
        },
      },
      signer
    );

    expect(calls).toEqual([
      "/multichain-transfer/withdraw/cross-chain/prepare",
      "/multichain-transfer/withdraw/cross-chain/submit",
    ]);
    expect(signer.signTypedData).toHaveBeenCalledOnce();
    expect(result.taskId).toBe("task-1");
    expect(result.requestId).toBe("req-1");

    const submitCall = (http.postJson as any).mock.calls.find((c: any[]) => c[0].endsWith("/submit"));
    expect(submitCall![1]).toMatchObject({ requestId: "req-1" });
  });
});
