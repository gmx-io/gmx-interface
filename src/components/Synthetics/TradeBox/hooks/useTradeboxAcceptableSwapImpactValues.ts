import { useEffect } from "react";

import {
  selectTradeboxDefaultAcceptableSwapImpactBps,
  selectTradeboxFees,
  selectTradeboxSelectedAcceptableSwapImpactBps,
  selectTradeboxSetDefaultAcceptableSwapImpactBps,
  selectTradeboxSetSelectedAcceptableSwapImpactBps,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { bigMath } from "lib/bigmath";
import { useTradeboxChanges } from "./useTradeboxChanges";
import { DEFAULT_ACCEPTABLE_SWAP_IMPACT_BPS } from "config/factors";

export function useTradeboxAcceptableSwapImpactValues() {
  const fees = useSelector(selectTradeboxFees);
  const defaultAcceptableSwapImpactBps = useSelector(selectTradeboxDefaultAcceptableSwapImpactBps);
  const selectedAcceptableSwapImpactBps = useSelector(selectTradeboxSelectedAcceptableSwapImpactBps);

  const tradeFlags = useSelector(selectTradeboxTradeFlags);

  const { isLimit } = tradeFlags;

  const setDefaultAcceptableSwapImpactBps = useSelector(selectTradeboxSetDefaultAcceptableSwapImpactBps);
  const setSelectedAcceptableSwapImpactBps = useSelector(selectTradeboxSetSelectedAcceptableSwapImpactBps);

  const tradeboxChanges = useTradeboxChanges();

  const isAnyValueChanged = Object.values(tradeboxChanges).some(Boolean);

  /**
   * Drop selected acceptable swap impact when user changes market/pool/trade type/limit price
   */
  useEffect(() => {
    if (isAnyValueChanged) {
      setDefaultAcceptableSwapImpactBps(undefined);
      setSelectedAcceptableSwapImpactBps(undefined);
    }
  }, [isAnyValueChanged, setDefaultAcceptableSwapImpactBps, setSelectedAcceptableSwapImpactBps]);

  /**
   * Set initial value
   */
  useEffect(() => {
    if (isLimit && defaultAcceptableSwapImpactBps === undefined && selectedAcceptableSwapImpactBps === undefined) {
      let swapPriceImpact = fees?.swapPriceImpact?.bps ?? 0n;

      const swapFees = fees?.swapFees ?? [];

      const swapFeesBps =
        swapPriceImpact +
        (swapFees.length
          ? swapFees.reduce((acc, fee) => {
              return acc + (fee.bps ?? 0n);
            }, 0n)
          : 0n);

      let defaultSwapImpactBuffer =
        DEFAULT_ACCEPTABLE_SWAP_IMPACT_BPS + (swapFeesBps >= 0n ? 0n : bigMath.abs(swapFeesBps));

      setSelectedAcceptableSwapImpactBps(bigMath.abs(defaultSwapImpactBuffer));
      setDefaultAcceptableSwapImpactBps(bigMath.abs(defaultSwapImpactBuffer));
    }
  }, [
    defaultAcceptableSwapImpactBps,
    isLimit,
    fees?.swapPriceImpact?.bps,
    fees?.swapFees,
    selectedAcceptableSwapImpactBps,
    setDefaultAcceptableSwapImpactBps,
    setSelectedAcceptableSwapImpactBps,
  ]);
}
