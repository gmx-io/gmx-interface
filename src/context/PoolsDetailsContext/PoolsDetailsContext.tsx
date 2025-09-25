import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Redirect } from "react-router-dom";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvOrMarketInfo } from "domain/synthetics/markets";
import { getByKey } from "lib/objects";
import useRouteQuery from "lib/useRouteQuery";

import { getGmSwapBoxAvailableModes } from "components/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { Mode, Operation, isMode, isOperation } from "components/GmSwap/GmSwapBox/types";

export type PoolsDetailsQueryParams = {
  market: string;
};

export type PoolsDetailsContext = {
  glvOrMarketAddress: string;
  operation: Operation;
  mode: Mode;
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
  setOperation: (operation: Operation) => void;
  setMode: (mode: Mode) => void;
  setGlvOrMarketAddress: (glvOrMarketAddress: string) => void;
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
  const [glvOrMarketAddress, setGlvOrMarketAddress] = useState(marketFromQueryParams);

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
    if (!glvOrMarketAddress) {
      return;
    }

    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, glvOrMarketAddress));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [glvOrMarketAddress, marketsInfoData, mode, operation]);

  const glvOrMarketInfo = glvOrMarketAddress ? getByKey(marketsInfoData, glvOrMarketAddress) : undefined;

  const value = useMemo(
    () => ({
      glvOrMarketAddress,
      operation,
      mode,
      glvOrMarketInfo,
      setOperation,
      setMode,
      setGlvOrMarketAddress,
    }),
    [glvOrMarketAddress, operation, mode, glvOrMarketInfo]
  );

  if (!value.glvOrMarketAddress) {
    return <Redirect to="/pools" />;
  }

  return <PoolsDetailsContext.Provider value={value as PoolsDetailsContext}>{children}</PoolsDetailsContext.Provider>;
}
