import { act, cleanup, render } from "@testing-library/react";
import { maxUint256 } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET, SOURCE_ETHEREUM_MAINNET, type SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { getTokenBySymbol } from "sdk/configs/tokens";

const mocks = vi.hoisted(() => ({
  selectorValues: new Map<string, unknown>(),
  sourceChainAllowance: 0n,
  allowanceRequests: [] as { chainId: number | undefined; spenderAddress: string; tokenAddresses: string[] }[],
  approveTokens: vi.fn(),
}));

vi.mock("context/PoolsDetailsContext/selectors", () => ({
  selectPoolsDetailsFirstTokenAddress: "firstTokenAddress",
  selectPoolsDetailsFirstTokenAmount: "firstTokenAmount",
  selectPoolsDetailsFlags: "flags",
  selectPoolsDetailsGlvOrMarketAddress: "glvOrMarketAddress",
  selectPoolsDetailsIsMarketTokenDeposit: "isMarketTokenDeposit",
  selectPoolsDetailsMarketOrGlvTokenAmount: "marketOrGlvTokenAmount",
  selectPoolsDetailsPaySource: "paySource",
  selectPoolsDetailsSecondTokenAddress: "secondTokenAddress",
  selectPoolsDetailsSecondTokenAmount: "secondTokenAmount",
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectChainId: "chainId",
  selectSrcChainId: "srcChainId",
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSelector: (key: string) => mocks.selectorValues.get(key),
}));

vi.mock("context/SyntheticsEvents/useMultichainEvents", () => ({
  useMultichainApprovalsActiveListener: vi.fn(),
}));

vi.mock("domain/synthetics/tokens", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTokensAllowanceData: (
    chainId: number | undefined,
    { spenderAddress, tokenAddresses, skip }: { spenderAddress?: string; tokenAddresses: string[]; skip?: boolean }
  ) => {
    if (skip || spenderAddress === undefined) {
      return { tokensAllowanceData: undefined, isLoading: false, isLoaded: false };
    }

    mocks.allowanceRequests.push({ chainId, spenderAddress, tokenAddresses });

    return {
      tokensAllowanceData: Object.fromEntries(tokenAddresses.map((address) => [address, mocks.sourceChainAllowance])),
      isLoading: false,
      isLoaded: true,
    };
  },
}));

vi.mock("domain/tokens/approveTokens", () => ({ approveTokens: mocks.approveTokens }));

vi.mock("domain/tokens/insufficientApproval", () => ({ getInsufficientApprovalToastContent: vi.fn() }));

vi.mock("lib/helperToast", () => ({
  helperToast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({
    // keeps the submitted approval pending, mining is out of scope here
    waitForTransactionReceipt: () => new Promise(() => undefined),
    readContract: vi.fn(),
  }),
}));

vi.mock("context/TokenPermitsContext/TokenPermitsContextProvider", () => ({
  useTokenPermitsContext: () => ({
    tokenPermits: [],
    addTokenPermit: vi.fn(),
    isPermitsDisabled: true,
    setIsPermitsDisabled: vi.fn(),
  }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountSettlementChainId: () => [undefined, vi.fn()],
}));

vi.mock("components/GmxAccountModal/wrapChainAction", () => ({
  wrapChainAction: (_chainId: number, _setChainId: unknown, action: (signer: unknown) => Promise<void>) => action({}),
}));

import { useTokensToApprove } from "./useTokensToApprove";

const GM_ETH_USDC = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const GLV_ETH_USDC = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const ETHEREUM_USDC = getMappedTokenId(ARBITRUM, USDC, SOURCE_ETHEREUM_MAINNET)!;

const ONE_GM = 10n ** 18n;
const HUNDRED_USDC = 100_000_000n;

type PayParams = {
  srcChainId: SourceChainId;
  isDeposit: boolean;
  glvOrMarketAddress: string;
  firstTokenAddress?: string;
  isMarketTokenDeposit?: boolean;
  amount: bigint;
};

let latestResult: ReturnType<typeof useTokensToApprove> | undefined;

function TestComponent() {
  latestResult = useTokensToApprove();
  return null;
}

function renderSourceChainPay({
  srcChainId,
  isDeposit,
  glvOrMarketAddress,
  firstTokenAddress,
  isMarketTokenDeposit = false,
  amount,
}: PayParams) {
  mocks.selectorValues.set("chainId", ARBITRUM);
  mocks.selectorValues.set("srcChainId", srcChainId);
  mocks.selectorValues.set("paySource", "sourceChain");
  mocks.selectorValues.set("flags", { isDeposit, isWithdrawal: !isDeposit });
  mocks.selectorValues.set("glvOrMarketAddress", glvOrMarketAddress);
  mocks.selectorValues.set("firstTokenAddress", firstTokenAddress);
  mocks.selectorValues.set("isMarketTokenDeposit", isMarketTokenDeposit);
  mocks.selectorValues.set("firstTokenAmount", isDeposit ? amount : 0n);
  mocks.selectorValues.set("marketOrGlvTokenAmount", isDeposit ? 0n : amount);
  mocks.selectorValues.set("secondTokenAddress", undefined);
  mocks.selectorValues.set("secondTokenAmount", 0n);

  render(<TestComponent />);

  return latestResult!;
}

function buyGmWithEthereumUsdc(amount: bigint) {
  return renderSourceChainPay({
    srcChainId: SOURCE_ETHEREUM_MAINNET,
    isDeposit: true,
    glvOrMarketAddress: GM_ETH_USDC,
    firstTokenAddress: USDC,
    amount,
  });
}

describe("useTokensToApprove from a source chain", () => {
  beforeEach(() => {
    mocks.sourceChainAllowance = 0n;
    mocks.allowanceRequests.length = 0;
    mocks.approveTokens.mockResolvedValue({ hash: "0xabc" });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.selectorValues.clear();
    latestResult = undefined;
  });

  it("asks for no approval to sell GM held on another chain", () => {
    const result = renderSourceChainPay({
      srcChainId: SOURCE_ETHEREUM_MAINNET,
      isDeposit: false,
      glvOrMarketAddress: GM_ETH_USDC,
      amount: ONE_GM,
    });

    expect(result.tokensToApproveSymbols).toEqual([]);
    expect(result.isAllowanceLoading).toBe(false);
    expect(mocks.allowanceRequests).toEqual([]);
  });

  it("asks for no approval to buy GLV with GM held on another chain", () => {
    const result = renderSourceChainPay({
      srcChainId: SOURCE_BASE_MAINNET,
      isDeposit: true,
      glvOrMarketAddress: GLV_ETH_USDC,
      firstTokenAddress: GM_ETH_USDC,
      isMarketTokenDeposit: true,
      amount: ONE_GM,
    });

    expect(result.tokensToApproveSymbols).toEqual([]);
    expect(result.isAllowanceLoading).toBe(false);
    expect(mocks.allowanceRequests).toEqual([]);
  });

  it("approves the Stargate pool without capping the amount to buy GM with USDC from another chain", async () => {
    const result = buyGmWithEthereumUsdc(HUNDRED_USDC);

    expect(result.tokensToApproveSymbols).toEqual(["USDC"]);
    expect(mocks.allowanceRequests).toContainEqual({
      chainId: SOURCE_ETHEREUM_MAINNET,
      spenderAddress: ETHEREUM_USDC.stargate,
      tokenAddresses: [ETHEREUM_USDC.address],
    });

    await act(async () => {
      result.approve();
    });

    expect(mocks.approveTokens).toHaveBeenCalledTimes(1);
    // approveTokens approves maxUint256 when no amount is given
    expect(mocks.approveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: SOURCE_ETHEREUM_MAINNET,
        tokenAddress: ETHEREUM_USDC.address,
        spender: ETHEREUM_USDC.stargate,
        approveAmount: undefined,
      })
    );
  });

  it("asks for no approval on the next buy once the allowance is unlimited", () => {
    mocks.sourceChainAllowance = maxUint256;

    expect(buyGmWithEthereumUsdc(HUNDRED_USDC * 5n).tokensToApproveSymbols).toEqual([]);
  });

  it("asks for a new approval when the allowance left is lower than the amount", () => {
    mocks.sourceChainAllowance = HUNDRED_USDC - 1n;

    expect(buyGmWithEthereumUsdc(HUNDRED_USDC).tokensToApproveSymbols).toEqual(["USDC"]);
  });
});
