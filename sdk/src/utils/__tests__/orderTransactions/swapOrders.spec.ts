import { zeroAddress, zeroHash } from "viem";
import { describe, expect, it, vi, beforeAll } from "vitest";

import { ARBITRUM } from "configs/chains";
import { getContract } from "configs/contracts";
import { MARKETS } from "configs/markets";
import { getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { parseValue } from "utils/numbers";
import {
  buildSwapOrderPayload,
  buildTwapOrdersPayloads,
  CreateOrderPayload,
  getIsTwapOrderPayload,
} from "utils/orderTransactions";
import { decodeTwapUiFeeReceiver } from "utils/twap/uiFeeReceiver";

import { MOCK_GAS_PRICE } from "../../../test/mock";

beforeAll(() => {
  // Mock Math.random to return a consistent value
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

describe("Swap Order Payloads", () => {
  const CHAIN_ID = ARBITRUM;
  const RECEIVER = "0x1234567890123456789012345678901234567890";
  const UI_FEE_RECEIVER = "0x0987654321098765432109876543210987654321";
  const EXECUTION_GAS_LIMIT = 1_000_000n;
  const EXECUTION_FEE_AMOUNT = EXECUTION_GAS_LIMIT * MOCK_GAS_PRICE;
  const REFERRAL_CODE = "0xf2742351cc0eca941ff90bf489789ee6169cbeacfdd38eba60012218fac1b7e5";

  const ETH_MARKET = MARKETS[CHAIN_ID]["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"];
  const SLIPPAGE = 50; // 0.5%
  const ORDER_VAULT_ADDRESS = getContract(CHAIN_ID, "OrderVault");

  const commonParams = {
    chainId: CHAIN_ID,
    receiver: RECEIVER,
    uiFeeReceiver: UI_FEE_RECEIVER,
    executionFeeAmount: EXECUTION_FEE_AMOUNT,
    executionGasLimit: EXECUTION_GAS_LIMIT,
    referralCode: REFERRAL_CODE,
    validFromTime: 0n,
    autoCancel: false,
    externalSwapQuote: undefined,
    triggerRatio: undefined,
  };

  const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
  const WETH = getWrappedToken(CHAIN_ID);
  const BTC = getTokenBySymbol(CHAIN_ID, "BTC");

  describe("buildSwapOrderPayload", () => {
    it("Swap Native Token to ERC20", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        receiveTokenAddress: USDC.address,
        swapPath: [ETH_MARKET.marketTokenAddress],
        minOutputAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        orderType: OrderType.MarketSwap as const,
        allowedSlippage: SLIPPAGE,
      };

      const result = buildSwapOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: zeroAddress,
            initialCollateralToken: WETH.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: 0n,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: 0n,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: parseValue("995", USDC.decimals)!,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketSwap,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: true,
          isNativeReceive: false,
          initialCollateralTokenAddress: WETH.address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: parseValue("1", WETH.decimals)!,
          minOutputAmount: parseValue("1000", USDC.decimals)!,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: undefined,
        },
      });
    });

    it("Swap ERC20 to Native Token", () => {
      const params = {
        ...commonParams,
        payTokenAddress: USDC.address,
        payTokenAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
        swapPath: [ETH_MARKET.marketTokenAddress],
        minOutputAmount: parseValue("0.5", WETH.decimals)!, // 0.5 ETH
        orderType: OrderType.MarketSwap as const,
        allowedSlippage: SLIPPAGE,
      };

      const result = buildSwapOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: zeroAddress,
            initialCollateralToken: USDC.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: 0n,
            initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: 0n,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: parseValue("0.4975", WETH.decimals)!,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketSwap,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: true,
          initialCollateralTokenAddress: USDC.address,
          initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
            {
              amount: parseValue("1000", USDC.decimals)!,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: USDC.address,
            },
          ],
          payTokenAddress: USDC.address,
          payTokenAmount: parseValue("1000", USDC.decimals)!,
          minOutputAmount: parseValue("0.5", WETH.decimals)!,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      });
    });

    it("swap ERC20 to ERC20", () => {
      const params = {
        ...commonParams,
        payTokenAddress: USDC.address,
        payTokenAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        receiveTokenAddress: BTC.address,
        swapPath: [ETH_MARKET.marketTokenAddress],
        minOutputAmount: parseValue("0.001", BTC.decimals)!, // 0.01 BTC
        orderType: OrderType.MarketSwap as const,
        allowedSlippage: SLIPPAGE,
      };

      const result = buildSwapOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: zeroAddress,
            initialCollateralToken: USDC.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: 0n,
            initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: 0n,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: parseValue("0.000995", BTC.decimals)!,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketSwap,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: false,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: false,
          initialCollateralTokenAddress: USDC.address,
          initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
            {
              amount: parseValue("1000", USDC.decimals)!,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: USDC.address,
            },
          ],
          payTokenAddress: USDC.address,
          payTokenAmount: parseValue("1000", USDC.decimals)!,
          minOutputAmount: parseValue("0.001", BTC.decimals)!,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      });
    });

    it("limit swap with trigger ratio", () => {
      const params = {
        ...commonParams,
        payTokenAddress: USDC.address,
        payTokenAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        receiveTokenAddress: WETH.address,
        swapPath: [ETH_MARKET.marketTokenAddress],
        minOutputAmount: parseValue("0.5", WETH.decimals)!,
        orderType: OrderType.LimitSwap as const,
        allowedSlippage: SLIPPAGE,
        triggerRatio: parseValue("1", 30)!, // 1:1 ratio
      };

      const result = buildSwapOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: zeroAddress,
            initialCollateralToken: USDC.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: 0n,
            initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
            triggerPrice: parseValue("1", 30)!,
            acceptablePrice: 0n,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: parseValue("0.4975", WETH.decimals)!,
            validFromTime: 0n,
          },
          orderType: OrderType.LimitSwap,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: false,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: false,
          initialCollateralTokenAddress: USDC.address,
          initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
            {
              amount: parseValue("1000", USDC.decimals)!,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: USDC.address,
            },
          ],
          payTokenAddress: USDC.address,
          payTokenAmount: parseValue("1000", USDC.decimals)!,
          minOutputAmount: parseValue("0.5", WETH.decimals)!,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      });
    });

    it("TWAP Swap Native Token to ERC20", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        orderType: OrderType.MarketSwap as const,
        triggerRatio: parseValue("1", 30)!,
        allowedSlippage: SLIPPAGE,
        receiveTokenAddress: USDC.address,
        swapPath: [ETH_MARKET.marketTokenAddress],
        externalSwapQuote: undefined,
        minOutputAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
      };

      const twapParams = {
        duration: {
          hours: 1,
          minutes: 0,
        },
        numberOfParts: 4,
      };

      const result = buildTwapOrdersPayloads(params, twapParams);

      // Calculate time intervals for each part
      const totalDurationInSeconds = twapParams.duration.hours * 3600 + twapParams.duration.minutes * 60;
      const startTime = Math.ceil(Date.now() / 1000);
      const intervalInSeconds = totalDurationInSeconds / (twapParams.numberOfParts - 1);

      const expectedOrders = Array.from({ length: twapParams.numberOfParts }, (_, i) => {
        const validFromTime = BigInt(Math.floor(startTime + intervalInSeconds * i));
        const uiFeeReceiver = `0xff00000000000000000000000000000004800001`;

        const decoded = decodeTwapUiFeeReceiver(uiFeeReceiver);

        expect(decoded).toEqual({
          twapId: "8000",
          numberOfParts: twapParams.numberOfParts,
        });

        return {
          orderPayload: {
            addresses: {
              receiver: RECEIVER,
              cancellationReceiver: zeroAddress,
              callbackContract: zeroAddress,
              uiFeeReceiver,
              market: zeroAddress,
              initialCollateralToken: WETH.address,
              swapPath: [ETH_MARKET.marketTokenAddress],
            },
            numbers: {
              sizeDeltaUsd: 0n,
              initialCollateralDeltaAmount: params.payTokenAmount / 4n,
              triggerPrice: parseValue("1", 30)!,
              acceptablePrice: 0n,
              executionFee: EXECUTION_FEE_AMOUNT / 4n,
              callbackGasLimit: 0n,
              minOutputAmount: 0n,
              validFromTime,
            },
            orderType: OrderType.LimitSwap,
            decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
            isLong: false,
            shouldUnwrapNativeToken: true,
            autoCancel: false,
            referralCode: REFERRAL_CODE,
          },
          params: {
            ...params,
            payTokenAmount: params.payTokenAmount / 4n,
            executionFeeAmount: EXECUTION_FEE_AMOUNT / 4n,
            minOutputAmount: 0n,
            orderType: OrderType.LimitSwap,
            allowedSlippage: 0,
            uiFeeReceiver,
            validFromTime,
          },
          tokenTransfersParams: {
            isNativePayment: true,
            isNativeReceive: false,
            initialCollateralTokenAddress: WETH.address,
            initialCollateralDeltaAmount: params.payTokenAmount / 4n,
            tokenTransfers: [
              {
                amount: EXECUTION_FEE_AMOUNT / 4n + params.payTokenAmount / 4n,
                destination: ORDER_VAULT_ADDRESS,
                tokenAddress: NATIVE_TOKEN_ADDRESS,
              },
            ],
            payTokenAddress: NATIVE_TOKEN_ADDRESS,
            payTokenAmount: params.payTokenAmount / 4n,
            minOutputAmount: 0n,
            swapPath: [ETH_MARKET.marketTokenAddress],
            value: EXECUTION_FEE_AMOUNT / 4n + params.payTokenAmount / 4n,
            externalCalls: undefined,
          },
        };
      });

      expect(result).toEqual(expectedOrders);
      expect(expectedOrders.every((co) => getIsTwapOrderPayload(co.orderPayload as CreateOrderPayload))).toBe(true);
    });

    it("Market Swap with Undefined Optional Parameters", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        receiveTokenAddress: USDC.address,
        swapPath: [ETH_MARKET.marketTokenAddress],
        minOutputAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        orderType: OrderType.MarketSwap as const,
        allowedSlippage: SLIPPAGE,
        uiFeeReceiver: undefined,
        referralCode: undefined,
        validFromTime: undefined,
      };

      const result = buildSwapOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: zeroAddress,
            initialCollateralToken: WETH.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: 0n,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: 0n,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: parseValue("995", USDC.decimals)!,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketSwap,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: zeroHash,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: true,
          isNativeReceive: false,
          initialCollateralTokenAddress: WETH.address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: parseValue("1", WETH.decimals)!,
          minOutputAmount: parseValue("1000", USDC.decimals)!,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: undefined,
        },
      });
    });
  });
});
