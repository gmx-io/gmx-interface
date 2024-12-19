import { useEffect } from "react";

import {
  selectTradeboxDefaultAllowedSwapSlippageBps,
  selectTradeboxSelectedAllowedSwapSlippageBps,
  selectTradeboxSetDefaultAllowedSwapSlippageBps,
  selectTradeboxSetSelectedAllowedSwapSlippageBps,
  selectTradeboxTotalSwapImpactBps,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS } from "config/factors";
import { bigMath } from "lib/bigmath";
import { useTradeboxChanges } from "./useTradeboxChanges";

export function useTradeboxAllowedSwapSlippageValues() {
  const defaultAllowedSwapSlippageBps = useSelector(selectTradeboxDefaultAllowedSwapSlippageBps);
  const selectedAllowedSwapSlippageBps = useSelector(selectTradeboxSelectedAllowedSwapSlippageBps);
  const swapImpactBps = useSelector(selectTradeboxTotalSwapImpactBps);

  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const { isLimit } = tradeFlags;

  const setDefaultAllowedSwapSlippageBps = useSelector(selectTradeboxSetDefaultAllowedSwapSlippageBps);
  const setSelectedAllowedSwapSlippageBps = useSelector(selectTradeboxSetSelectedAllowedSwapSlippageBps);

  const tradeboxChanges = useTradeboxChanges();

  useEffect(() => {
    if (
      tradeboxChanges.fromTokenAddress ||
      tradeboxChanges.toTokenAddress ||
      tradeboxChanges.isLimit ||
      tradeboxChanges.market
    ) {
      setDefaultAllowedSwapSlippageBps(undefined);
      setSelectedAllowedSwapSlippageBps(undefined);
    }
  }, [
    setDefaultAllowedSwapSlippageBps,
    setSelectedAllowedSwapSlippageBps,
    tradeboxChanges.fromTokenAddress,
    tradeboxChanges.isLimit,
    tradeboxChanges.market,
    tradeboxChanges.toTokenAddress,
  ]);

  /**
   * Set initial value
   */
  useEffect(() => {
    if (isLimit && defaultAllowedSwapSlippageBps === undefined && selectedAllowedSwapSlippageBps === undefined) {
      const totalSwapImpactBps = swapImpactBps >= 0n ? 0n : bigMath.abs(swapImpactBps);
      let defaultSwapImpactBuffer = DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS + totalSwapImpactBps;

      setSelectedAllowedSwapSlippageBps(bigMath.abs(defaultSwapImpactBuffer));
      setDefaultAllowedSwapSlippageBps(bigMath.abs(defaultSwapImpactBuffer));
    }
  }, [
    defaultAllowedSwapSlippageBps,
    isLimit,
    swapImpactBps,
    selectedAllowedSwapSlippageBps,
    setDefaultAllowedSwapSlippageBps,
    setSelectedAllowedSwapSlippageBps,
  ]);
}
