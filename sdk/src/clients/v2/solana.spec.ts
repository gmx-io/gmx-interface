import fetch, { Response } from "cross-fetch";
import { decodeFunctionData } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import ERC20ABI from "abis/Token";
import { ARBITRUM, AVALANCHE, SOLANA_NETWORK_ID } from "configs/chains";
import { getContract } from "configs/contracts";
import { HttpClientWithFallback } from "utils/http/httpFallback";
import { parseFeeDiscount } from "utils/referrals/api";

import { GmxApiSdk } from "./index";

vi.mock("cross-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("cross-fetch")>()),
  default: vi.fn(),
}));

const address = "So11111111111111111111111111111111111111112";
const amount = "1234567890123456789012345678901";
const fee = (overrides: Record<string, unknown> = {}) => ({
  userReferralCode: "RefErRaL",
  userReferralCodeString: "MyCode",
  referralCodeForTxn: "TxCoDe",
  affiliate: address,
  attachedOnChain: true,
  tierId: 2,
  totalRebate: amount,
  totalRebateFactor: amount,
  discountShare: amount,
  discountFactor: amount,
  orderFeeDiscountFactor: amount,
  updatedAt: 123,
  ...overrides,
});
const response = (body: unknown, slot?: string) =>
  new Response(JSON.stringify(body), {
    headers: slot === undefined ? {} : { "X-Solana-Slot": slot },
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(fetch).mockReset();
});

describe("Solana API reads", () => {
  it("uses the current network for approvals through both context interfaces", () => {
    for (const options of [{ networkId: ARBITRUM }, { networkId: SOLANA_NETWORK_ID }] as const) {
      for (const update of [
        "chainId",
        "networkId",
        "legacyContext",
        "networkContext",
        "legacySpread",
        "networkSpread",
      ] as const) {
        const sdk = new GmxApiSdk(options);
        if (update === "legacyContext") {
          sdk.ctx = { chainId: AVALANCHE, api: sdk.ctx.api };
        } else if (update === "networkContext") {
          sdk.ctx = { networkId: AVALANCHE, api: sdk.ctx.api };
        } else if (update === "legacySpread") {
          sdk.ctx = { ...sdk.ctx, chainId: AVALANCHE };
        } else if (update === "networkSpread") {
          sdk.ctx = { ...sdk.ctx, networkId: AVALANCHE };
        } else {
          sdk.ctx[update] = AVALANCHE;
        }
        const params = {
          tokenAddress: "0x0000000000000000000000000000000000000001",
          spender: "router" as const,
          amount: 1n,
        };
        const transaction = sdk.buildApproveTransaction(params);
        const decoded = decodeFunctionData({ abi: ERC20ABI, data: transaction.data });
        expect(decoded.functionName).toBe("approve");
        expect(decoded.args).toEqual([getContract(AVALANCHE, "SyntheticsRouter"), 1n]);
        expect(sdk.ctx.networkId).toBe(AVALANCHE);
        expect(sdk.ctx.chainId).toBe(AVALANCHE);
        sdk.ctx.networkId = SOLANA_NETWORK_ID;
        const solanaContext = sdk.ctx;
        sdk.ctx = solanaContext;
        expect(() => sdk.buildApproveTransaction(params)).toThrow("EVM operations require an EVM chainId");
      }
    }
  });

  it("preserves referral case and fee precision, rejecting malformed required fields", async () => {
    const sdk = new GmxApiSdk({ networkId: SOLANA_NETWORK_ID });
    const fields = ["totalRebate", "totalRebateFactor", "discountShare", "discountFactor", "orderFeeDiscountFactor"];
    for (const value of [amount, 0]) {
      vi.mocked(fetch).mockResolvedValueOnce(response(fee(Object.fromEntries(fields.map((key) => [key, value])))));
      expect(await sdk.fetchFeeDiscount({ address })).toEqual({
        userReferralInfo: {
          userReferralCode: "RefErRaL",
          userReferralCodeString: "MyCode",
          referralCodeForTxn: "TxCoDe",
          affiliate: address,
          attachedOnChain: true,
          tierId: 2,
          totalRebate: BigInt(value),
          totalRebateFactor: BigInt(value),
          discountShare: BigInt(value),
          discountFactor: BigInt(value),
        },
        orderFeeDiscountFactor: BigInt(value),
        updatedAt: 123,
      });
      expect(new URL(String(vi.mocked(fetch).mock.lastCall![0])).searchParams.get("address")).toBe(address);
    }
    for (const raw of [
      null,
      [],
      {},
      fee({ attachedOnChain: "true" }),
      fee({ tierId: 1.5 }),
      ...["userReferralCode", "userReferralCodeString", "referralCodeForTxn", "affiliate"].map((key) =>
        fee({ [key]: undefined })
      ),
      ...fields.flatMap((key) =>
        [undefined, null, true, "", "-1", "1.5", "0x10", 1.5, -1, Number.MAX_SAFE_INTEGER + 1].map((value) =>
          fee({ [key]: value })
        )
      ),
    ])
      expect(() => parseFeeDiscount(raw)).toThrow("/v1/fee-discount");
  });

  it("passes slot floors and returns each response slot without changing account data", async () => {
    const sdk = new GmxApiSdk({ networkId: SOLANA_NETWORK_ID });
    const headers = [undefined, "", "-1", "1.5", "9007199254740992", "invalid", "0", "123"];
    for (const method of ["fetchOrders", "fetchPositionsInfo"] as const) {
      for (const minContextSlot of [undefined, 0, 123]) {
        for (const header of headers) {
          const slot = header === "0" ? 0 : header === "123" ? 123 : undefined;
          const includeRelatedOrders = minContextSlot === 123;
          const body = [{ account: address, positionValueInUsd: amount }];
          let metadata: unknown;
          vi.mocked(fetch).mockResolvedValueOnce(response(body, header));
          const result = await sdk[method]({
            address,
            minContextSlot,
            includeRelatedOrders,
            onResponse: (value) => (metadata = value),
          });
          expect(result).toEqual([{ account: address, positionValueInUsd: BigInt(amount) }]);
          expect(metadata).toEqual({ slot });
          const url = new URL(String(vi.mocked(fetch).mock.lastCall![0]));
          expect(url.pathname).toBe(method === "fetchOrders" ? "/v1/orders" : "/v1/positions");
          expect(Object.fromEntries(url.searchParams)).toEqual({
            address,
            ...(minContextSlot === undefined ? {} : { minContextSlot: String(minContextSlot) }),
            ...(method === "fetchPositionsInfo" && includeRelatedOrders ? { includeRelatedOrders: "true" } : {}),
          });
        }
      }
    }
  });

  it("keeps response metadata local when account reads finish out of order", async () => {
    const sdk = new GmxApiSdk({
      networkId: SOLANA_NETWORK_ID,
      api: new HttpClientWithFallback(["https://first.example", "https://second.example"]),
    });
    let resolveFirst!: (value: Response) => void;
    const slots: (number | undefined)[] = [];
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(response([{ positionValueInUsd: amount }], "202"));
    const first = sdk.fetchOrders({ address, onResponse: ({ slot }) => (slots[0] = slot) });
    const second = await sdk.fetchPositionsInfo({ address, onResponse: ({ slot }) => (slots[1] = slot) });
    expect(second).toEqual([{ positionValueInUsd: BigInt(amount) }]);
    resolveFirst(response([{ account: address }], "101"));
    expect(await first).toEqual([{ account: address }]);
    expect(slots).toEqual([101, 202]);
  });

  it("does not retry a successful read when its response callback throws", async () => {
    const api = new HttpClientWithFallback(["https://first.example", "https://second.example"]);
    const error = new Error("Consumer failed");
    vi.mocked(fetch).mockResolvedValue(response({ account: address }, "123"));
    await expect(
      api.fetchJson("/v1/orders", {
        onResponse: () => {
          throw error;
        },
      })
    ).rejects.toBe(error);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});
