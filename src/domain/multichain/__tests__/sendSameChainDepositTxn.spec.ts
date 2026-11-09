import { BaseError, RawContractError, encodeErrorResult, getAddress, parseAbi } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import type { TokenPermitsCheckResult } from "domain/tokens/checkTokenPermits";
import { getTokenPermitIssueType } from "domain/tokens/useTokenPermitTxnHandlers";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { sendSameChainDepositTxn } from "../sendSameChainDepositTxn";

const mocks = vi.hoisted(() => ({
  checkTokenPermits: vi.fn(),
  estimateGas: vi.fn(),
  sendWalletTransaction: vi.fn(),
}));

vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({ estimateGas: mocks.estimateGas }) }));
vi.mock("domain/tokens/checkTokenPermits", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkTokenPermits: mocks.checkTokenPermits,
}));
vi.mock("lib/transactions/sendWalletTransaction", () => ({ sendWalletTransaction: mocks.sendWalletTransaction }));

const OWNER = "0x0000000000000000000000000000000000000001";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const usdcPermit: SignedTokenPermit = {
  token: USDC,
  owner: OWNER,
  spender: getContract(ARBITRUM, "SyntheticsRouter"),
  value: 2n ** 256n - 1n,
  deadline: 2000000000n,
  v: 27,
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  onchainParams: { name: "USD Coin", version: "2", nonce: 0n },
};

function deposit(tokenPermits: SignedTokenPermit[], callback = vi.fn()) {
  return sendSameChainDepositTxn({
    chainId: ARBITRUM,
    signer: { address: OWNER } as WalletSigner,
    tokenAddress: USDC,
    amount: 10_000_000n,
    account: OWNER,
    callback,
    walletTxnTokenPermits: {
      tokenPermits,
      removeTokenPermits: vi.fn(),
      forgetSentTokenPermits: vi.fn(),
      getTokenPermitsExecutedHandler: vi.fn(() => vi.fn()),
      handleTokenPermitsError: vi.fn(),
    },
  });
}

function mockCheck(result: Partial<TokenPermitsCheckResult>) {
  mocks.checkTokenPermits.mockResolvedValue({ validPermits: [], stalePermits: [], failedPermits: [], ...result });
}

describe("sendSameChainDepositTxn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.estimateGas.mockResolvedValue(300_000n);
    mocks.sendWalletTransaction.mockResolvedValue({
      transactionHash: "0xhash",
      wait: async () => ({ status: "success" }),
    });
  });

  it.each<{
    name: string;
    stored: SignedTokenPermit[];
    check: Partial<TokenPermitsCheckResult>;
    to: "ExchangeRouter" | "MultichainTransferRouter";
  }>([
    { name: "a checked permit", stored: [usdcPermit], check: { validPermits: [usdcPermit] }, to: "ExchangeRouter" },
    {
      name: "a permit the allowance already covers",
      stored: [usdcPermit],
      check: { stalePermits: [usdcPermit] },
      to: "MultichainTransferRouter",
    },
    { name: "no stored permit", stored: [], check: {}, to: "MultichainTransferRouter" },
  ])("deposits with $name through $to", async ({ stored, check, to }) => {
    mockCheck(check);

    await deposit(stored);

    const sent = mocks.sendWalletTransaction.mock.calls[0][0];
    expect(getAddress(sent.to)).toBe(getAddress(getContract(ARBITRUM, to)));
    // only the permit deposit is estimated before the wallet, to catch a bad permit
    expect(sent.gasLimit !== undefined).toBe(to === "ExchangeRouter");
  });

  it("stops before the wallet when the permit reverts, and reports the error with the permit it carried", async () => {
    mockCheck({ validPermits: [usdcPermit] });
    const permitError = encodeErrorResult({
      abi: parseAbi(["error Error(string)"]),
      errorName: "Error",
      args: ["EIP2612: invalid signature"],
    });
    const revertData = encodeErrorResult({
      abi: abis.CustomErrors,
      errorName: "ExternalCallFailed",
      args: [permitError],
    });
    mocks.estimateGas.mockRejectedValue(
      new BaseError("reverted", { cause: new RawContractError({ data: revertData }) })
    );
    const callback = vi.fn();

    await expect(deposit([usdcPermit], callback)).rejects.toBeInstanceOf(BaseError);

    expect(mocks.sendWalletTransaction).not.toHaveBeenCalled();
    const { event, data } = callback.mock.calls[0][0];
    expect(event).toBe("Error");
    expect(getTokenPermitIssueType(data.error, data.tokenPermits, { isAnyContext: true })).toBe("invalidSignature");
  });
});
