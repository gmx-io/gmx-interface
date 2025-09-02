import { beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "configs/chains";
import { getTokenBySymbol, getWrappedToken } from "configs/tokens";
import { OrderType } from "types/orders";
import { parseValue, USD_DECIMALS } from "utils/numbers";
import { buildUpdateOrderPayload, UpdateOrderParams } from "utils/orderTransactions";

import { MOCK_GAS_PRICE } from "../../../test/mock";

beforeAll(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

describe("Update Order Payloads", () => {
  const CHAIN_ID = ARBITRUM;
  const ORDER_KEY = "0x1234567890123456789012345678901234567890123456789012345678901234";
  const EXECUTION_GAS_LIMIT = 1_000_000n;
  const EXECUTION_FEE_AMOUNT = EXECUTION_GAS_LIMIT * MOCK_GAS_PRICE;

  const USDC = getTokenBySymbol(CHAIN_ID, "USDC");
  const WETH = getWrappedToken(CHAIN_ID);

  describe("buildUpdateOrderPayload", () => {
    it("Update Limit Swap", () => {
      const params: UpdateOrderParams = {
        chainId: CHAIN_ID,
        orderKey: ORDER_KEY,
        orderType: OrderType.LimitSwap,
        sizeDeltaUsd: 0n,
        triggerPrice: parseValue("1", 30)!,
        acceptablePrice: 0n,
        minOutputAmount: parseValue("0.8", USDC.decimals)!,
        autoCancel: false,
        executionFeeTopUp: 0n,
        indexTokenAddress: WETH.address,
        validFromTime: 0n,
      };

      const result = buildUpdateOrderPayload(params);

      expect(result).toEqual({
        params,
        updatePayload: {
          orderKey: ORDER_KEY,
          sizeDeltaUsd: 0n,
          triggerPrice: parseValue("1", 30)!,
          acceptablePrice: 0n,
          minOutputAmount: parseValue("0.8", USDC.decimals)!,
          autoCancel: false,
          validFromTime: 0n,
          executionFeeTopUp: 0n,
        },
      });
    });

    it("Update Limit Increase with Execution Fee Top Up", () => {
      const params: UpdateOrderParams = {
        chainId: CHAIN_ID,
        orderKey: ORDER_KEY,
        orderType: OrderType.LimitIncrease,
        sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!, // $1000
        triggerPrice: parseValue("1200", USD_DECIMALS)!, // $1200
        acceptablePrice: parseValue("1194", USD_DECIMALS)!, // $1200 - 0.5% slippage
        minOutputAmount: 0n,
        autoCancel: false,
        executionFeeTopUp: EXECUTION_FEE_AMOUNT,
        indexTokenAddress: WETH.address,
        validFromTime: 0n,
      };

      const result = buildUpdateOrderPayload(params);

      expect(result).toEqual({
        params,
        updatePayload: {
          orderKey: ORDER_KEY,
          sizeDeltaUsd: parseValue("1000", USD_DECIMALS)!,
          triggerPrice: parseValue("1200", USD_DECIMALS - WETH.decimals)!, // Converted to contract price
          acceptablePrice: parseValue("1194", USD_DECIMALS - WETH.decimals)!, // Converted to contract price
          minOutputAmount: 0n,
          autoCancel: false,
          validFromTime: 0n,
          executionFeeTopUp: EXECUTION_FEE_AMOUNT,
        },
      });
    });
  });
});
