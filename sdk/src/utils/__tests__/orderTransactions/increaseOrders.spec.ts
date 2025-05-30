import { zeroAddress, zeroHash } from "viem";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "configs/chains";
import { getContract } from "configs/contracts";
import { MARKETS } from "configs/markets";
import { getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { MaxUint256, parseValue, USD_DECIMALS } from "utils/numbers";
import {
  buildIncreaseOrderPayload,
  buildTwapOrdersPayloads,
  CreateOrderPayload,
  getIsTwapOrderPayload,
  IncreasePositionOrderParams,
} from "utils/orderTransactions";
import { decodeTwapUiFeeReceiver } from "utils/twap/uiFeeReceiver";

import { MOCK_GAS_PRICE, mockExternalSwap } from "../../../test/mock";

beforeAll(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

describe("Increase Order Payloads", () => {
  const CHAIN_ID = ARBITRUM;
  const RECEIVER = "0x1234567890123456789012345678901234567890";
  const UI_FEE_RECEIVER = "0x0987654321098765432109876543210987654321";
  const EXECUTION_GAS_LIMIT = 1_000_000n;
  const EXECUTION_FEE_AMOUNT = EXECUTION_GAS_LIMIT * MOCK_GAS_PRICE;
  const REFERRAL_CODE = "0xf2742351cc0eca941ff90bf489789ee6169cbeacfdd38eba60012218fac1b7e5";

  const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
  const WETH = getWrappedToken(CHAIN_ID);
  const ETH_MARKET = MARKETS[CHAIN_ID]["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"];
  const SLIPPAGE = 50; // 0.5%
  const ORDER_VAULT_ADDRESS = getContract(CHAIN_ID, "OrderVault");
  const EXTERNAL_HANDLER_ADDRESS = getContract(CHAIN_ID, "ExternalHandler");

  const commonParams = {
    chainId: CHAIN_ID,
    receiver: RECEIVER,
    uiFeeReceiver: UI_FEE_RECEIVER,
    executionFeeAmount: EXECUTION_FEE_AMOUNT,
    executionGasLimit: EXECUTION_GAS_LIMIT,
    referralCode: REFERRAL_CODE,
    validFromTime: 0n,
    autoCancel: false,
    marketAddress: ETH_MARKET.marketTokenAddress,
    indexTokenAddress: WETH.address,
    isLong: true,
    sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!, // $1000
    sizeDeltaInTokens: parseValue("1", WETH.decimals)!, // 1 ETH
    collateralTokenAddress: WETH.address,
    collateralDeltaAmount: parseValue("1", WETH.decimals)!, // 1 ETH
    swapPath: [ETH_MARKET.marketTokenAddress],
    orderType: OrderType.MarketIncrease as const,
    allowedSlippage: SLIPPAGE,
    acceptablePrice: parseValue("1200", USD_DECIMALS)!, // $1200 base price
    triggerPrice: 0n,
    externalSwapQuote: undefined,
  } satisfies Partial<IncreasePositionOrderParams>;

  describe("buildIncreaseOrderPayload", () => {
    it("Market Increase Long Pay with Native Token", () => {
      const params = {
        ...commonParams,
        isLong: true,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!, // $1200 + 0.5% slippage
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
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
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: undefined,
        },
      });
    });

    it("Market Increase Short Pay with Native Token", () => {
      const params = {
        ...commonParams,
        isLong: false,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1194", USD_DECIMALS - WETH.decimals)!, // $1200 - 0.5% slippage
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
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
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: undefined,
        },
      });
    });

    it("Market Increase Pay with ERC20", () => {
      const params = {
        ...commonParams,
        payTokenAddress: USDC.address,
        payTokenAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: USDC.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
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
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      });
    });

    it("Market Increase with Internal Swap", () => {
      const params = {
        ...commonParams,
        payTokenAddress: USDC.address,
        payTokenAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        collateralTokenAddress: WETH.address,
        collateralDeltaAmount: parseValue("0.5", WETH.decimals)!, // 0.5 ETH
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: USDC.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1000", USDC.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
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
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      });
    });

    it("Market Increase with External Swap, Pay With Native Token", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        collateralTokenAddress: USDC.address,
        collateralDeltaAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        externalSwapQuote: mockExternalSwap({
          inToken: WETH,
          outToken: USDC,
          amountIn: parseValue("1", WETH.decimals)!,
          amountOut: parseValue("1000", USDC.decimals)!,
          priceIn: parseValue("1000", USD_DECIMALS)!, // $1000 per ETH
          priceOut: parseValue("1", USD_DECIMALS)!, // $1 per USDC
        }),
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: USDC.address,
            swapPath: [],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: 0n,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: true,
          isNativeReceive: false,
          initialCollateralTokenAddress: USDC.address,
          initialCollateralDeltaAmount: 0n,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
            {
              amount: parseValue("1", WETH.decimals)!,
              destination: EXTERNAL_HANDLER_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: parseValue("1", WETH.decimals)!,
          minOutputAmount: 0n,
          swapPath: [],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: {
            externalCallDataList: ["0x1"],
            externalCallTargets: ["0x6352a56caadC4F1E25CD6c75970Fa768A3304e64"],
            refundReceivers: [RECEIVER, RECEIVER],
            refundTokens: [WETH.address, USDC.address],
            sendAmounts: [parseValue("1", WETH.decimals)!],
            sendTokens: [WETH.address],
          },
        },
      });
    });

    it("Market Increase with External Swap, Pay With ERC20", () => {
      const params = {
        ...commonParams,
        payTokenAddress: USDC.address,
        payTokenAmount: parseValue("1000", USDC.decimals)!, // 1000 USDC
        collateralTokenAddress: WETH.address,
        collateralDeltaAmount: parseValue("0.5", WETH.decimals)!, // 0.5 ETH
        externalSwapQuote: mockExternalSwap({
          inToken: USDC,
          outToken: WETH,
          amountIn: parseValue("1000", USDC.decimals)!,
          amountOut: parseValue("0.5", WETH.decimals)!,
          priceIn: parseValue("1", USD_DECIMALS)!, // $1 per USDC
          priceOut: parseValue("2000", USD_DECIMALS)!, // $2000 per ETH
        }),
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address,
            swapPath: [],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: 0n,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
          shouldUnwrapNativeToken: false,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: false,
          initialCollateralTokenAddress: WETH.address,
          initialCollateralDeltaAmount: 0n,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },

            {
              amount: parseValue("1000", USDC.decimals)!,
              destination: EXTERNAL_HANDLER_ADDRESS,
              tokenAddress: USDC.address,
            },
          ],
          payTokenAddress: USDC.address,
          payTokenAmount: parseValue("1000", USDC.decimals)!,
          minOutputAmount: 0n,
          swapPath: [],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: {
            externalCallDataList: ["0x1"],
            externalCallTargets: ["0x6352a56caadC4F1E25CD6c75970Fa768A3304e64"],
            refundReceivers: [RECEIVER, RECEIVER],
            refundTokens: [USDC.address, WETH.address],
            sendAmounts: [parseValue("1000", USDC.decimals)!],
            sendTokens: [USDC.address],
          },
        },
      });
    });

    it("Limit Increase", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        orderType: OrderType.LimitIncrease as const,
        triggerPrice: parseValue("1200", USD_DECIMALS)!, // $1200
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: parseValue("1200", USD_DECIMALS - WETH.decimals)!,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.LimitIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
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
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: undefined,
        },
      });
    });

    it("TWAP Increase Long Pay with Native Token", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        orderType: OrderType.MarketIncrease as const,
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
              market: params.marketAddress,
              initialCollateralToken: WETH.address,
              swapPath: [ETH_MARKET.marketTokenAddress],
            },
            numbers: {
              sizeDeltaUsd: parseValue("250", USD_DECIMALS)!, // 1000/4
              initialCollateralDeltaAmount: params.payTokenAmount / 4n, // 1/4
              triggerPrice: MaxUint256,
              acceptablePrice: MaxUint256,
              executionFee: EXECUTION_FEE_AMOUNT / 4n,
              callbackGasLimit: 0n,
              minOutputAmount: 0n,
              validFromTime,
            },
            orderType: OrderType.LimitIncrease,
            decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
            isLong: true,
            shouldUnwrapNativeToken: true,
            autoCancel: false,
            referralCode: REFERRAL_CODE,
          },
          params: {
            ...params,
            acceptablePrice: MaxUint256,
            triggerPrice: MaxUint256,
            payTokenAmount: params.payTokenAmount / 4n,
            collateralDeltaAmount: params.collateralDeltaAmount / 4n,
            executionFeeAmount: params.executionFeeAmount / 4n,
            sizeDeltaUsd: params.sizeDeltaUsd / 4n,
            sizeDeltaInTokens: params.sizeDeltaInTokens / 4n,
            orderType: OrderType.LimitIncrease,
            allowedSlippage: 0,
            uiFeeReceiver,
            validFromTime,
          },
          tokenTransfersParams: {
            isNativePayment: true,
            isNativeReceive: false,
            initialCollateralTokenAddress: WETH.address,
            initialCollateralDeltaAmount: parseValue("0.25", WETH.decimals)!,
            tokenTransfers: [
              {
                amount: EXECUTION_FEE_AMOUNT / 4n + parseValue("0.25", WETH.decimals)!,
                destination: ORDER_VAULT_ADDRESS,
                tokenAddress: NATIVE_TOKEN_ADDRESS,
              },
            ],
            payTokenAddress: NATIVE_TOKEN_ADDRESS,
            payTokenAmount: parseValue("0.25", WETH.decimals)!,
            minOutputAmount: 0n,
            swapPath: [ETH_MARKET.marketTokenAddress],
            value: EXECUTION_FEE_AMOUNT / 4n + parseValue("0.25", WETH.decimals)!,
            externalCalls: undefined,
          },
        };
      });

      expect(result).toEqual(expectedOrders);
      expect(expectedOrders.every((co) => getIsTwapOrderPayload(co.orderPayload as CreateOrderPayload))).toBe(true);
    });

    it("TWAP Increase Short Pay with Native Token", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        orderType: OrderType.MarketIncrease as const,
        isLong: false,
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
              market: params.marketAddress,
              initialCollateralToken: WETH.address,
              swapPath: [ETH_MARKET.marketTokenAddress],
            },
            numbers: {
              sizeDeltaUsd: parseValue("250", USD_DECIMALS)!, // 1000/4
              initialCollateralDeltaAmount: params.payTokenAmount / 4n, // 1/4
              triggerPrice: 0n,
              acceptablePrice: 0n,
              executionFee: EXECUTION_FEE_AMOUNT / 4n,
              callbackGasLimit: 0n,
              minOutputAmount: 0n,
              validFromTime,
            },
            orderType: OrderType.LimitIncrease,
            decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
            isLong: false,
            shouldUnwrapNativeToken: true,
            autoCancel: false,
            referralCode: REFERRAL_CODE,
          },
          params: {
            ...params,
            acceptablePrice: 0n,
            triggerPrice: 0n,
            payTokenAmount: params.payTokenAmount / 4n,
            collateralDeltaAmount: params.collateralDeltaAmount / 4n,
            executionFeeAmount: params.executionFeeAmount / 4n,
            sizeDeltaUsd: params.sizeDeltaUsd / 4n,
            sizeDeltaInTokens: params.sizeDeltaInTokens / 4n,
            orderType: OrderType.LimitIncrease,
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

    it("Market Increase with Undefined Optional Parameters", () => {
      const params = {
        ...commonParams,
        payTokenAddress: NATIVE_TOKEN_ADDRESS,
        payTokenAmount: parseValue("1", WETH.decimals)!, // 1 ETH
        orderType: OrderType.MarketIncrease as const,
        uiFeeReceiver: undefined,
        referralCode: undefined,
        validFromTime: undefined,
      };

      const result = buildIncreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: params.marketAddress,
            initialCollateralToken: WETH.address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)!,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketIncrease,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: true,
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
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT + parseValue("1", WETH.decimals)!,
          externalCalls: undefined,
        },
      });
    });
  });
});
