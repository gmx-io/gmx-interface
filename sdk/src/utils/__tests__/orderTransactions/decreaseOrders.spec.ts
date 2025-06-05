import { zeroAddress, zeroHash } from "viem";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "configs/chains";
import { getContract } from "configs/contracts";
import { MARKETS } from "configs/markets";
import { getTokenBySymbol, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { ContractPrice, ERC20Address } from "types/tokens";
import { MaxUint256, parseValue, USD_DECIMALS } from "utils/numbers";
import {
  buildDecreaseOrderPayload,
  buildTwapOrdersPayloads,
  CreateOrderPayload,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  getIsTwapOrderPayload,
} from "utils/orderTransactions";
import { decodeTwapUiFeeReceiver } from "utils/twap/uiFeeReceiver";

import { MOCK_GAS_PRICE } from "../../../test/mock";

beforeAll(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

describe("Decrease Order Payloads", () => {
  const CHAIN_ID = ARBITRUM;
  const RECEIVER = "0x1234567890123456789012345678901234567890";
  const UI_FEE_RECEIVER = "0x0987654321098765432109876543210987654321";
  const EXECUTION_GAS_LIMIT = 1_000_000n;
  const EXECUTION_FEE_AMOUNT = EXECUTION_GAS_LIMIT * MOCK_GAS_PRICE;
  const REFERRAL_CODE = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";

  const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
  const WETH = getWrappedToken(CHAIN_ID);
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
    marketAddress: ETH_MARKET.marketTokenAddress,
    indexTokenAddress: WETH.address,
    isLong: true,
    sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!, // $1000
    sizeDeltaInTokens: parseValue("1", WETH.decimals)!, // 1 ETH
    collateralTokenAddress: WETH.address,
    collateralDeltaAmount: parseValue("1", WETH.decimals)!, // 1 ETH
    swapPath: [ETH_MARKET.marketTokenAddress],
    orderType: OrderType.MarketDecrease as const,
    allowedSlippage: SLIPPAGE,
    acceptablePrice: parseValue("1200", USD_DECIMALS)!, // $1200 base price
    triggerPrice: 0n,
    externalSwapQuote: undefined,
    minOutputUsd: 0n,
  } satisfies Partial<DecreasePositionOrderParams>;

  describe("buildDecreaseOrderPayload", () => {
    it("Market Decrease Long with Native Receive", () => {
      const params = {
        ...commonParams,
        isLong: true,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
      };

      const result = buildDecreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address as ERC20Address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n as ContractPrice,
            acceptablePrice: parseValue("1194", USD_DECIMALS - WETH.decimals)! as ContractPrice, // $1200 - 0.5% slippage
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketDecrease,
          decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          isLong: true,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
          dataList: [],
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: true,
          initialCollateralTokenAddress: WETH.address as ERC20Address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: 0n,
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>);
    });

    it("Market Decrease Short with Native Receive", () => {
      const params = {
        ...commonParams,
        isLong: false,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
      };

      const result = buildDecreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address as ERC20Address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)! as ContractPrice, // $1200 + 0.5% slippage
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketDecrease,
          decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          isLong: false,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
          dataList: [],
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: true,
          initialCollateralTokenAddress: WETH.address as ERC20Address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: 0n,
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>);
    });

    it("Market Decrease with ERC20 Receive", () => {
      const params = {
        ...commonParams,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: USDC.address,
      };

      const result = buildDecreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address as ERC20Address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1194", USD_DECIMALS - WETH.decimals)! as ContractPrice,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketDecrease,
          decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          isLong: true,
          shouldUnwrapNativeToken: false,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
          dataList: [],
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: false,
          initialCollateralTokenAddress: WETH.address as ERC20Address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: 0n,
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>);
    });

    it("TP/SL Long", () => {
      const params = {
        ...commonParams,
        orderType: OrderType.LimitDecrease as const,
        triggerPrice: parseValue("1200", USD_DECIMALS)!,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
      };

      const result = buildDecreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address as ERC20Address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: parseValue("1200", USD_DECIMALS - WETH.decimals)! as ContractPrice,
            acceptablePrice: parseValue("1194", USD_DECIMALS - WETH.decimals)! as ContractPrice,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.LimitDecrease,
          decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          isLong: true,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: REFERRAL_CODE,
          dataList: [],
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: true,
          initialCollateralTokenAddress: WETH.address as ERC20Address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: 0n,
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>);
    });

    it("Auto cancel TP/SL Short", () => {
      const params = {
        ...commonParams,
        isLong: false,
        orderType: OrderType.LimitDecrease as const,
        triggerPrice: parseValue("1200", USD_DECIMALS)!,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
        autoCancel: true,
      };

      const result = buildDecreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER,
            market: params.marketAddress,
            initialCollateralToken: WETH.address as ERC20Address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: parseValue("1200", USD_DECIMALS - WETH.decimals)! as ContractPrice,
            acceptablePrice: parseValue("1206", USD_DECIMALS - WETH.decimals)! as ContractPrice,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.LimitDecrease,
          decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          isLong: false,
          shouldUnwrapNativeToken: true,
          autoCancel: true,
          referralCode: REFERRAL_CODE,
          dataList: [],
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: true,
          initialCollateralTokenAddress: WETH.address as ERC20Address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: 0n,
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>);
    });

    it("TWAP Decrease Long", () => {
      const params = {
        ...commonParams,
        orderType: OrderType.MarketDecrease as const,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
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
              initialCollateralToken: WETH.address as ERC20Address,
              swapPath: [ETH_MARKET.marketTokenAddress],
            },
            numbers: {
              sizeDeltaUsd: parseValue("250", USD_DECIMALS)!, // 1000/4
              initialCollateralDeltaAmount: params.collateralDeltaAmount / 4n, // 1/4
              triggerPrice: 0n,
              acceptablePrice: 0n,
              executionFee: EXECUTION_FEE_AMOUNT / 4n,
              callbackGasLimit: 0n,
              minOutputAmount: 0n,
              validFromTime,
            },
            orderType: OrderType.LimitDecrease,
            decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
            isLong: true,
            shouldUnwrapNativeToken: true,
            autoCancel: false,
            referralCode: REFERRAL_CODE,
            dataList: [],
          },
          params: {
            ...params,
            acceptablePrice: 0n,
            triggerPrice: 0n,
            collateralDeltaAmount: params.collateralDeltaAmount / 4n,
            executionFeeAmount: params.executionFeeAmount / 4n,
            sizeDeltaUsd: params.sizeDeltaUsd / 4n,
            sizeDeltaInTokens: params.sizeDeltaInTokens / 4n,
            orderType: OrderType.LimitDecrease,
            allowedSlippage: 0,
            uiFeeReceiver,
            validFromTime,
            referralCode: REFERRAL_CODE,
          },
          tokenTransfersParams: {
            isNativePayment: false,
            isNativeReceive: true,
            initialCollateralTokenAddress: WETH.address as ERC20Address,
            initialCollateralDeltaAmount: params.collateralDeltaAmount / 4n,
            tokenTransfers: [
              {
                amount: EXECUTION_FEE_AMOUNT / 4n,
                destination: ORDER_VAULT_ADDRESS,
                tokenAddress: NATIVE_TOKEN_ADDRESS,
              },
            ],
            payTokenAddress: NATIVE_TOKEN_ADDRESS,
            payTokenAmount: 0n,
            minOutputAmount: 0n,
            swapPath: [ETH_MARKET.marketTokenAddress],
            value: EXECUTION_FEE_AMOUNT / 4n,
            externalCalls: undefined,
          },
        } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>;
      });

      expect(result).toEqual(expectedOrders);
      expect(expectedOrders.every((co) => getIsTwapOrderPayload(co.orderPayload as CreateOrderPayload))).toBe(true);
    });

    it("TWAP Decrease Short", () => {
      const params = {
        ...commonParams,
        isLong: false,
        orderType: OrderType.MarketDecrease as const,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
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
              initialCollateralToken: WETH.address as ERC20Address,
              swapPath: [ETH_MARKET.marketTokenAddress],
            },
            numbers: {
              sizeDeltaUsd: parseValue("250", USD_DECIMALS)!, // 1000/4
              initialCollateralDeltaAmount: params.collateralDeltaAmount / 4n, // 1/4
              triggerPrice: MaxUint256 as ContractPrice,
              acceptablePrice: MaxUint256 as ContractPrice,
              executionFee: EXECUTION_FEE_AMOUNT / 4n,
              callbackGasLimit: 0n,
              minOutputAmount: 0n,
              validFromTime,
            },
            orderType: OrderType.LimitDecrease,
            decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
            isLong: false,
            shouldUnwrapNativeToken: true,
            autoCancel: false,
            referralCode: REFERRAL_CODE,
            dataList: [],
          },
          params: {
            ...params,
            acceptablePrice: MaxUint256,
            triggerPrice: MaxUint256,
            collateralDeltaAmount: params.collateralDeltaAmount / 4n,
            executionFeeAmount: params.executionFeeAmount / 4n,
            sizeDeltaUsd: params.sizeDeltaUsd / 4n,
            sizeDeltaInTokens: params.sizeDeltaInTokens / 4n,
            orderType: OrderType.LimitDecrease,
            allowedSlippage: 0,
            uiFeeReceiver,
            validFromTime,
          },
          tokenTransfersParams: {
            isNativePayment: false,
            isNativeReceive: true,
            initialCollateralTokenAddress: WETH.address as ERC20Address,
            initialCollateralDeltaAmount: params.collateralDeltaAmount / 4n,
            tokenTransfers: [
              {
                amount: EXECUTION_FEE_AMOUNT / 4n,
                destination: ORDER_VAULT_ADDRESS,
                tokenAddress: NATIVE_TOKEN_ADDRESS,
              },
            ],
            payTokenAddress: NATIVE_TOKEN_ADDRESS,
            payTokenAmount: 0n,
            minOutputAmount: 0n,
            swapPath: [ETH_MARKET.marketTokenAddress],
            value: EXECUTION_FEE_AMOUNT / 4n,
            externalCalls: undefined,
          },
        } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>;
      });

      expect(result).toEqual(expectedOrders);
      expect(expectedOrders.every((co) => getIsTwapOrderPayload(co.orderPayload as CreateOrderPayload))).toBe(true);
    });

    it("Market Decrease with Undefined Optional Parameters", () => {
      const params = {
        ...commonParams,
        orderType: OrderType.MarketDecrease as const,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        receiveTokenAddress: NATIVE_TOKEN_ADDRESS,
        uiFeeReceiver: undefined,
        referralCode: undefined,
        validFromTime: undefined,
      };

      const result = buildDecreaseOrderPayload(params);

      expect(result).toEqual({
        orderPayload: {
          addresses: {
            receiver: RECEIVER,
            cancellationReceiver: zeroAddress,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: params.marketAddress,
            initialCollateralToken: WETH.address as ERC20Address,
            swapPath: [ETH_MARKET.marketTokenAddress],
          },
          numbers: {
            sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
            initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
            triggerPrice: 0n,
            acceptablePrice: parseValue("1194", USD_DECIMALS - WETH.decimals)! as ContractPrice,
            executionFee: EXECUTION_FEE_AMOUNT,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: OrderType.MarketDecrease,
          decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
          isLong: true,
          shouldUnwrapNativeToken: true,
          autoCancel: false,
          referralCode: zeroHash,
          dataList: [],
        },
        params,
        tokenTransfersParams: {
          isNativePayment: false,
          isNativeReceive: true,
          initialCollateralTokenAddress: WETH.address as ERC20Address,
          initialCollateralDeltaAmount: parseValue("1", WETH.decimals)!,
          tokenTransfers: [
            {
              amount: EXECUTION_FEE_AMOUNT,
              destination: ORDER_VAULT_ADDRESS,
              tokenAddress: NATIVE_TOKEN_ADDRESS,
            },
          ],
          payTokenAddress: NATIVE_TOKEN_ADDRESS,
          payTokenAmount: 0n,
          minOutputAmount: 0n,
          swapPath: [ETH_MARKET.marketTokenAddress],
          value: EXECUTION_FEE_AMOUNT,
          externalCalls: undefined,
        },
      } satisfies CreateOrderTxnParams<DecreasePositionOrderParams>);
    });
  });
});
