import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import type { TokensData } from "domain/tokens";
import { ARBITRUM, MEGAETH, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";

import {
  estimateWithOtherFeeBalanceFallback,
  getFeeBalanceDecision,
  getIsPositionActionGmxAccount,
  getOrdersActionFeeBalance,
} from "../feeBalance";
import type { ExpressTxnParams } from "../types";

type Balance = "gmxAccount" | "wallet";

const ONE_ETH = 10n ** 18n;
const RELAYER_FEE = ONE_ETH / 10_000n;

function makeExpressParams({
  isGmxAccount,
  canPay,
  isBalanceLoaded = true,
}: {
  isGmxAccount: boolean;
  canPay: boolean;
  isBalanceLoaded?: boolean;
}) {
  return {
    isGmxAccount,
    gasPaymentParams: { totalRelayerFeeTokenAmount: RELAYER_FEE },
    gasPaymentValidations: {
      isValid: canPay,
      isOutGasTokenBalance: !canPay,
      needGasPaymentTokenApproval: false,
      isGasPaymentTokenBalanceLoaded: isBalanceLoaded,
    },
  } as unknown as ExpressTxnParams;
}

function makeTokensData(walletEth: bigint | undefined): TokensData {
  return (walletEth === undefined ? {} : { [zeroAddress]: { walletBalance: walletEth } }) as unknown as TokensData;
}

describe("fee balance of position and order actions TRD-44", () => {
  it.each([
    { srcChainId: undefined, isExpressEnabled: true, positionLastSrcChainId: BigInt(ARBITRUM), expected: true },
    {
      srcChainId: undefined,
      isExpressEnabled: true,
      positionLastSrcChainId: BigInt(SOURCE_BASE_MAINNET),
      expected: true,
    },
    { srcChainId: undefined, isExpressEnabled: true, positionLastSrcChainId: 0n, expected: false },
    { srcChainId: undefined, isExpressEnabled: true, positionLastSrcChainId: undefined, expected: false },
    { srcChainId: undefined, isExpressEnabled: false, positionLastSrcChainId: BigInt(ARBITRUM), expected: false },
    { srcChainId: SOURCE_BASE_MAINNET, isExpressEnabled: true, positionLastSrcChainId: 0n, expected: true },
  ])(
    "a TP/SL for a position last sent from $positionLastSrcChainId pays from the GMX Account: $expected (wallet chain $srcChainId, Express $isExpressEnabled)",
    ({ srcChainId, isExpressEnabled, positionLastSrcChainId, expected }) => {
      expect(getIsPositionActionGmxAccount({ srcChainId, isExpressEnabled, positionLastSrcChainId })).toBe(expected);
    }
  );

  it.each([
    {
      srcChainId: undefined,
      isExpressEnabled: true,
      orderSrcChainIds: [BigInt(ARBITRUM)],
      isGmxAccount: true,
      canUseOtherBalance: true,
    },
    {
      srcChainId: undefined,
      isExpressEnabled: true,
      orderSrcChainIds: [0n],
      isGmxAccount: false,
      canUseOtherBalance: true,
    },
    {
      srcChainId: undefined,
      isExpressEnabled: true,
      orderSrcChainIds: [0n, BigInt(ARBITRUM)],
      isGmxAccount: true,
      canUseOtherBalance: true,
    },
    {
      srcChainId: undefined,
      isExpressEnabled: false,
      orderSrcChainIds: [BigInt(ARBITRUM)],
      isGmxAccount: false,
      canUseOtherBalance: false,
    },
    {
      srcChainId: SOURCE_BASE_MAINNET,
      isExpressEnabled: true,
      orderSrcChainIds: [0n],
      isGmxAccount: true,
      canUseOtherBalance: false,
    },
    {
      chainId: MEGAETH,
      srcChainId: undefined,
      isExpressEnabled: true,
      orderSrcChainIds: [0n],
      isGmxAccount: false,
      canUseOtherBalance: false,
    },
  ])(
    "an edit or a cancel of orders from $orderSrcChainIds tries the GMX Account first: $isGmxAccount, may use the other balance: $canUseOtherBalance (chain $chainId, wallet chain $srcChainId, Express $isExpressEnabled)",
    ({ chainId = ARBITRUM, srcChainId, isExpressEnabled, orderSrcChainIds, isGmxAccount, canUseOtherBalance }) => {
      const orders = orderSrcChainIds.map((orderSrcChainId) => ({ srcChainId: orderSrcChainId }));

      expect(getOrdersActionFeeBalance({ chainId, srcChainId, isExpressEnabled, orders })).toEqual({
        isGmxAccount,
        canUseOtherBalance,
      });
    }
  );

  const SETTLED_CAN = { canPay: true, isSettled: true };
  const SETTLED_CANNOT = { canPay: false, isSettled: true };
  const PENDING = { canPay: false, isSettled: false };
  const MISSING = { canPay: undefined, isSettled: true };
  const NOT_LOADED = { canPay: false, isSettled: true, isBalanceLoaded: false };

  it.each([
    { own: "gmxAccount", gmx: SETTLED_CAN, wallet: SETTLED_CAN, walletEth: 0n, canUseOther: true, payer: "own" },
    { own: "gmxAccount", gmx: SETTLED_CANNOT, wallet: SETTLED_CAN, walletEth: 0n, canUseOther: true, payer: "other" },
    {
      own: "gmxAccount",
      gmx: SETTLED_CANNOT,
      wallet: SETTLED_CANNOT,
      walletEth: ONE_ETH,
      canUseOther: true,
      payer: "other",
    },
    { own: "gmxAccount", gmx: SETTLED_CANNOT, wallet: SETTLED_CANNOT, walletEth: 0n, canUseOther: true, payer: "own" },
    { own: "gmxAccount", gmx: SETTLED_CANNOT, wallet: MISSING, walletEth: 0n, canUseOther: true, payer: "own" },
    { own: "gmxAccount", gmx: SETTLED_CANNOT, wallet: MISSING, walletEth: ONE_ETH, canUseOther: true, payer: "other" },
    { own: "gmxAccount", gmx: SETTLED_CANNOT, wallet: SETTLED_CAN, walletEth: 0n, canUseOther: false, payer: "own" },
    { own: "gmxAccount", gmx: SETTLED_CANNOT, wallet: PENDING, walletEth: 0n, canUseOther: true, payer: undefined },
    { own: "gmxAccount", gmx: PENDING, wallet: SETTLED_CAN, walletEth: 0n, canUseOther: true, payer: undefined },
    {
      own: "gmxAccount",
      gmx: NOT_LOADED,
      wallet: SETTLED_CAN,
      walletEth: ONE_ETH,
      canUseOther: true,
      payer: undefined,
    },
    {
      own: "gmxAccount",
      gmx: SETTLED_CANNOT,
      wallet: NOT_LOADED,
      walletEth: ONE_ETH,
      canUseOther: true,
      payer: undefined,
    },
    { own: "wallet", gmx: SETTLED_CAN, wallet: SETTLED_CANNOT, walletEth: ONE_ETH, canUseOther: true, payer: "own" },
    {
      own: "wallet",
      gmx: SETTLED_CAN,
      wallet: SETTLED_CANNOT,
      walletEth: RELAYER_FEE,
      canUseOther: true,
      payer: "own",
    },
    { own: "wallet", gmx: SETTLED_CAN, wallet: SETTLED_CANNOT, walletEth: 1n, canUseOther: true, payer: "other" },
    {
      own: "wallet",
      gmx: SETTLED_CAN,
      wallet: SETTLED_CANNOT,
      walletEth: undefined,
      canUseOther: true,
      payer: undefined,
    },
    { own: "wallet", gmx: SETTLED_CAN, wallet: SETTLED_CANNOT, walletEth: 0n, canUseOther: true, payer: "other" },
    { own: "wallet", gmx: SETTLED_CAN, wallet: MISSING, walletEth: 0n, canUseOther: true, payer: "other" },
    { own: "wallet", gmx: SETTLED_CANNOT, wallet: SETTLED_CANNOT, walletEth: 0n, canUseOther: true, payer: "own" },
  ])(
    "the $own balance pays its own action and the other balance only when it cannot: payer $payer (GMX Account $gmx.canPay, wallet Express $wallet.canPay, wallet ETH $walletEth)",
    ({ own, gmx, wallet, walletEth, canUseOther, payer }) => {
      const isGmxAccount = own === "gmxAccount";
      const toEstimate = (
        estimate: { canPay: boolean | undefined; isSettled: boolean; isBalanceLoaded?: boolean },
        isGmxAccountEstimate: boolean
      ) => ({
        isSettled: estimate.isSettled,
        expressParams:
          estimate.canPay === undefined
            ? undefined
            : makeExpressParams({
                isGmxAccount: isGmxAccountEstimate,
                canPay: estimate.canPay,
                isBalanceLoaded: estimate.isBalanceLoaded,
              }),
      });

      const decision = getFeeBalanceDecision({
        isGmxAccount,
        canUseOtherBalance: canUseOther,
        own: toEstimate(isGmxAccount ? gmx : wallet, isGmxAccount),
        other: toEstimate(isGmxAccount ? wallet : gmx, !isGmxAccount),
        tokensData: makeTokensData(walletEth),
      });

      expect(decision.payer).toBe(payer);
    }
  );

  it.each<{
    own: Balance;
    gmxCanPay: boolean;
    gmxBalanceLoaded?: boolean;
    walletCanPay: boolean;
    canUseOther: boolean;
    payer: Balance;
    estimated: Balance[];
  }>([
    {
      own: "gmxAccount",
      gmxCanPay: true,
      walletCanPay: true,
      canUseOther: true,
      payer: "gmxAccount",
      estimated: ["gmxAccount"],
    },
    {
      own: "gmxAccount",
      gmxCanPay: false,
      walletCanPay: true,
      canUseOther: true,
      payer: "wallet",
      estimated: ["gmxAccount", "wallet"],
    },
    {
      own: "gmxAccount",
      gmxCanPay: false,
      walletCanPay: false,
      canUseOther: true,
      payer: "gmxAccount",
      estimated: ["gmxAccount", "wallet"],
    },
    {
      own: "gmxAccount",
      gmxCanPay: false,
      walletCanPay: true,
      canUseOther: false,
      payer: "gmxAccount",
      estimated: ["gmxAccount"],
    },
    {
      own: "wallet",
      gmxCanPay: true,
      walletCanPay: false,
      canUseOther: true,
      payer: "gmxAccount",
      estimated: ["wallet", "gmxAccount"],
    },
    {
      own: "gmxAccount",
      gmxCanPay: false,
      gmxBalanceLoaded: false,
      walletCanPay: true,
      canUseOther: true,
      payer: "gmxAccount",
      estimated: ["gmxAccount"],
    },
  ])(
    "a cancel of $own orders is paid by $payer (GMX Account can pay $gmxCanPay, wallet can pay $walletCanPay, other balance allowed $canUseOther)",
    async ({ own, gmxCanPay, gmxBalanceLoaded, walletCanPay, canUseOther, payer, estimated }) => {
      const paramsByBalance: Record<Balance, ExpressTxnParams> = {
        gmxAccount: makeExpressParams({ isGmxAccount: true, canPay: gmxCanPay, isBalanceLoaded: gmxBalanceLoaded }),
        wallet: makeExpressParams({ isGmxAccount: false, canPay: walletCanPay }),
      };
      const estimatedBalances: Balance[] = [];

      const result = await estimateWithOtherFeeBalanceFallback({
        isGmxAccount: own === "gmxAccount",
        canUseOtherBalance: canUseOther,
        tokensData: makeTokensData(0n),
        estimate: async (isGmxAccount) => {
          const balance = isGmxAccount ? "gmxAccount" : "wallet";
          estimatedBalances.push(balance);
          return paramsByBalance[balance];
        },
      });

      expect(result.isGmxAccount).toBe(payer === "gmxAccount");
      expect(result.expressParams).toBe(paramsByBalance[payer]);
      expect(estimatedBalances).toEqual(estimated);
    }
  );
});
