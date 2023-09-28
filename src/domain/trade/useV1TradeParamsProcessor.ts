import { getTokenBySymbolSafe } from "config/tokens";
import { TradeSearchParams } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { LEVERAGE_ORDER_OPTIONS, SWAP, SWAP_OPTIONS, SWAP_ORDER_OPTIONS } from "lib/legacy";
import { getMatchingValueFromObject } from "lib/objects";
import useSearchParams from "lib/useSearchParams";
import { useEffect, useMemo, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import { isMatch, pickBy } from "lodash";

type TradeOptions = {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  tradeType?: string;
  tradeMode?: string;
  collateralTokenAddress?: string;
};

type Props = {
  updateTradeOptions?: (options: TradeOptions) => void;
  swapOption?: string;
};

export default function useV1TradeParamsProcessor({ updateTradeOptions, swapOption }: Props) {
  const { chainId } = useChainId();
  const params = useParams<{ tradeType?: string }>();
  const searchParams = useSearchParams<TradeSearchParams>();
  const history = useHistory();
  const prevTradeOptions = useRef<TradeOptions>({});

  const options = useMemo(() => {
    const { tradeType } = params;
    const { from: fromToken, to: toToken, collateral: collateralToken, mode: tradeMode } = searchParams;

    const tradeOptions: TradeOptions = {
      tradeType: swapOption,
    };

    if (tradeType) {
      const validTradeType = getMatchingValueFromObject(SWAP_OPTIONS, tradeType);
      if (validTradeType) {
        tradeOptions.tradeType = validTradeType;
      }
    }

    if (tradeMode) {
      const finalTradeMode = tradeMode.toLowerCase() === "trigger" ? "stop" : tradeMode;
      const opderOptions = tradeOptions.tradeType === SWAP ? SWAP_ORDER_OPTIONS : LEVERAGE_ORDER_OPTIONS;
      const validTradeMode = getMatchingValueFromObject(opderOptions, finalTradeMode);
      if (validTradeMode) {
        tradeOptions.tradeMode = validTradeMode;
      }
    }

    if (fromToken) {
      const fromTokenInfo = getTokenBySymbolSafe(chainId, fromToken, {
        version: "v1",
      });
      if (fromTokenInfo) {
        tradeOptions.fromTokenAddress = fromTokenInfo.address;
      }
    }

    if (toToken) {
      const toTokenInfo = getTokenBySymbolSafe(chainId, toToken, {
        version: "v1",
      });
      if (toTokenInfo) {
        tradeOptions.toTokenAddress = toTokenInfo.address;
      }
    }

    if (collateralToken) {
      const collateralTokenInfo = getTokenBySymbolSafe(chainId, collateralToken, {
        version: "v1",
      });
      if (collateralTokenInfo) {
        tradeOptions.collateralTokenAddress = collateralTokenInfo.address;
      }
    }

    if (history.location.search) {
      setTimeout(() => {
        history.replace({ search: "" });
      }, 2000); // Delays the execution by 2 seconds
    }

    return pickBy(tradeOptions, Boolean) as TradeOptions;
  }, [history, params, chainId, searchParams, swapOption]);

  useEffect(() => {
    if (options && updateTradeOptions && !isMatch(prevTradeOptions.current, options)) {
      updateTradeOptions(options);
      prevTradeOptions.current = options;
    }
  }, [options, updateTradeOptions]);
}
