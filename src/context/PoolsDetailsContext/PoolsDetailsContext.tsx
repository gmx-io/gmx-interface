import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Redirect } from "react-router-dom";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import useRouteQuery from "lib/useRouteQuery";

import { getGmSwapBoxAvailableModes } from "components/Synthetics/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { Mode, Operation, isMode, isOperation } from "components/Synthetics/GmSwap/GmSwapBox/types";

export type PoolsDetailsQueryParams = {
  market: string;
};

export type PoolsDetailsContext = {
  market: string;
  operation: Operation;
  mode: Mode;
  marketInfo: MarketInfo | GlvInfo | undefined;
  setOperation: (operation: Operation) => void;
  setMode: (mode: Mode) => void;
  setMarket: (market: string) => void;
};

const PoolsDetailsContext = createContext<PoolsDetailsContext | undefined>(undefined);

export function usePoolsDetailsContext() {
  const context = useContext(PoolsDetailsContext);
  if (!context) {
    throw new Error("usePoolsDetailsContext must be used within a PoolsDetailsContextProvider");
  }
  return context;
}

export function PoolsDetailsContextProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useRouteQuery();

  const marketFromQueryParams = searchParams.get("market");

  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  const [mode, setMode] = useState<Mode>(Mode.Single);
  const [market, setMarket] = useState(marketFromQueryParams);

  useEffect(() => {
    const operationFromQueryParams = searchParams.get("operation");
    if (operationFromQueryParams && isOperation(operationFromQueryParams)) {
      setOperation(operationFromQueryParams);
    }

    const modeFromQueryParams = searchParams.get("mode");
    if (modeFromQueryParams && isMode(modeFromQueryParams)) {
      setMode(modeFromQueryParams);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!market) {
      return;
    }

    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, market));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [market, marketsInfoData, mode, operation]);

  const marketInfo = market ? getByKey(marketsInfoData, market) : undefined;

  const value = useMemo(
    () => ({
      market,
      operation,
      mode,
      marketInfo,
      setOperation,
      setMode,
      setMarket,
    }),
    [market, operation, mode, marketInfo]
  );

  if (!value.market) {
    return <Redirect to="/pools" />;
  }

  return <PoolsDetailsContext.Provider value={value as PoolsDetailsContext}>{children}</PoolsDetailsContext.Provider>;
}
