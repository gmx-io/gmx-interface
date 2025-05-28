import { encodeFunctionData, erc20Abi } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "configs/chains";
import { getTokenBySymbol, getWrappedToken } from "configs/tokens";
import { ERC20Address } from "types/tokens";
import { expandDecimals, MaxUint256, parseValue, USD_DECIMALS } from "utils/numbers";
import { combineExternalCalls, getExternalCallsPayload } from "utils/orderTransactions";

import { mockExternalSwap } from "../../../test/mock";

describe("External Calls", () => {
  const CHAIN_ID = ARBITRUM;
  const ACCOUNT = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  const WETH = getWrappedToken(CHAIN_ID);
  const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
  const USDT = getTokenBySymbol(CHAIN_ID, "USDT");

  const TARGET_ADDRESS = "0x1111111111111111111111111111111111111111" as `0x${string}`;
  const TARGET_ADDRESS_2 = "0x2222222222222222222222222222222222222222" as `0x${string}`;

  describe("combineExternalCalls", () => {
    it("combines multiple external calls with repeated tokens", () => {
      const externalCalls = [
        {
          sendTokens: [WETH.address, USDC.address] as ERC20Address[],
          sendAmounts: [parseValue("1", WETH.decimals)!, parseValue("1000", USDC.decimals)!],
          externalCallTargets: [TARGET_ADDRESS],
          externalCallDataList: ["0x1111" as `0x${string}`],
          refundTokens: [WETH.address, USDC.address] as ERC20Address[],
          refundReceivers: [ACCOUNT, ACCOUNT],
        },
        {
          sendTokens: [WETH.address, USDT.address] as ERC20Address[],
          sendAmounts: [parseValue("2", WETH.decimals)!, parseValue("2000", USDT.decimals)!],
          externalCallTargets: [TARGET_ADDRESS],
          externalCallDataList: ["0x2222" as `0x${string}`],
          refundTokens: [USDT.address, WETH.address] as ERC20Address[],
          refundReceivers: [ACCOUNT, ACCOUNT],
        },
        {
          sendTokens: [WETH.address] as ERC20Address[],
          sendAmounts: [parseValue("3", WETH.decimals)!],
          externalCallTargets: [TARGET_ADDRESS_2],
          externalCallDataList: ["0x3333" as `0x${string}`],
          refundTokens: [WETH.address] as ERC20Address[],
          refundReceivers: [ACCOUNT],
        },
      ];

      const result = combineExternalCalls(externalCalls);

      expect(result).toEqual({
        sendTokens: [WETH.address, USDC.address, USDT.address] as ERC20Address[],
        sendAmounts: [
          parseValue("6", WETH.decimals)!, // 1 + 2 + 3 WETH
          parseValue("1000", USDC.decimals)!, // 1000 USDC
          parseValue("2000", USDT.decimals)!, // 2000 USDT
        ],
        externalCallTargets: [TARGET_ADDRESS, TARGET_ADDRESS, TARGET_ADDRESS_2],
        externalCallDataList: ["0x1111", "0x2222", "0x3333"],
        refundTokens: [WETH.address, USDC.address, USDT.address] as ERC20Address[],
        refundReceivers: [ACCOUNT, ACCOUNT, ACCOUNT],
      });
    });
  });

  describe("getExternalCallsPayload", () => {
    it("creates payload without spender approval", () => {
      const quote = mockExternalSwap({
        inToken: WETH,
        outToken: USDC,
        amountIn: parseValue("1", WETH.decimals)!,
        amountOut: parseValue("1000", USDC.decimals)!,
        priceIn: expandDecimals(1000, USD_DECIMALS),
        priceOut: expandDecimals(1, USD_DECIMALS),
        data: "0x1111" as `0x${string}`,
        to: "0x1111111111111111111111111111111111111111" as `0x${string}`,
      });

      const result = getExternalCallsPayload({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        quote,
      });

      expect(result).toEqual({
        sendTokens: [WETH.address] as ERC20Address[],
        sendAmounts: [parseValue("1", WETH.decimals)!],
        externalCallTargets: [quote.txnData.to],
        externalCallDataList: [quote.txnData.data],
        refundTokens: [WETH.address, USDC.address] as ERC20Address[],
        refundReceivers: [ACCOUNT, ACCOUNT],
      });
    });

    it("creates payload with spender approval", () => {
      const quote = mockExternalSwap({
        inToken: WETH,
        outToken: USDC,
        amountIn: parseValue("1", WETH.decimals)!,
        amountOut: parseValue("1000", USDC.decimals)!,
        priceIn: expandDecimals(1000, USD_DECIMALS),
        priceOut: expandDecimals(1, USD_DECIMALS),
        data: "0x1111" as `0x${string}`,
        to: "0x1111111111111111111111111111111111111111" as `0x${string}`,
      });

      const result = getExternalCallsPayload({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        quote: { ...quote, needSpenderApproval: true },
      });

      const expectedApproveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [quote.txnData.to as `0x${string}`, MaxUint256],
      });

      expect(result).toEqual({
        sendTokens: [WETH.address] as ERC20Address[],
        sendAmounts: [parseValue("1", WETH.decimals)!],
        externalCallTargets: [WETH.address, quote.txnData.to],
        externalCallDataList: [expectedApproveData, quote.txnData.data],
        refundTokens: [WETH.address, USDC.address] as ERC20Address[],
        refundReceivers: [ACCOUNT, ACCOUNT],
      });
    });
  });
});
