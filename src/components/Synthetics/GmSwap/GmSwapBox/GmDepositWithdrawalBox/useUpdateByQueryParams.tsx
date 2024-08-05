import { Trans } from "@lingui/macro";
import { isAddress } from "ethers";
import { values } from "lodash";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { convertTokenAddress, getTokenBySymbolSafe } from "config/tokens";
import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { helperToast } from "lib/helperToast";
import { getMatchingValueFromObject } from "lib/objects";
import useSearchParams from "lib/useSearchParams";

import { Mode, Operation } from "../types";

type SearchParams = {
  market?: string;
  operation?: string;
  mode?: string;
  from?: string;
  pool?: string;
  scroll?: string;
};

export function useUpdateByQueryParams({
  setOperation,
  setMode,
  setFirstTokenAddress,
  setIndexName,
  onSelectMarket,
}: {
  setOperation: (operation: Operation) => void;
  setMode: (mode: Mode) => void;
  setFirstTokenAddress: (address: string | undefined) => void;
  setIndexName: (indexName: string | undefined) => void;
  onSelectMarket: (marketAddress: string) => void;
}) {
  const history = useHistory();
  const searchParams = useSearchParams<SearchParams>();

  const chainId = useSelector(selectChainId);
  const markets = values(useSelector(selectMarketsInfoData));

  useEffect(
    function updateByQueryParams() {
      const { market: marketRaw, operation, mode, from: fromToken, pool, scroll } = searchParams;
      const marketAddress = marketRaw?.toLowerCase();

      if (operation) {
        let finalOperation;

        if (operation.toLowerCase() === "buy") {
          finalOperation = Operation.Deposit;
        } else if (operation.toLowerCase() === "sell") {
          finalOperation = Operation.Withdrawal;
        }

        if (finalOperation) {
          setOperation(finalOperation as Operation);
        }
      }

      if (mode) {
        const validMode = getMatchingValueFromObject(Mode, mode);
        if (validMode) {
          setMode(validMode as Mode);
        }
      }

      if (fromToken) {
        const fromTokenInfo = getTokenBySymbolSafe(chainId, fromToken, {
          version: "v2",
        });
        if (fromTokenInfo) {
          setFirstTokenAddress(convertTokenAddress(chainId, fromTokenInfo.address, "wrapped"));
        }
      }

      if (scroll === "1") {
        window.scrollTo({ top: 0, left: 0 });
      }

      if ((marketAddress || pool) && markets.length > 0) {
        if (marketAddress && isAddress(marketAddress)) {
          const marketInfo = markets.find((market) => market.marketTokenAddress.toLowerCase() === marketAddress);
          if (marketInfo) {
            setIndexName(getMarketIndexName(marketInfo));
            onSelectMarket(marketInfo.marketTokenAddress);
            const indexName = getMarketIndexName(marketInfo);
            const poolName = getMarketPoolName(marketInfo);
            helperToast.success(
              <Trans>
                <div className="inline-flex">
                  GM:&nbsp;<span>{indexName}</span>
                  <span className="subtext gm-toast leading-1">[{poolName}]</span>
                </div>{" "}
                <span>selected in order form</span>
              </Trans>
            );
          }
        }

        if (history.location.search) {
          history.replace({ search: "" });
        }
      }

      if (!marketAddress && !pool) {
        if (history.location.search) {
          history.replace({ search: "" });
        }
      }
    },
    [
      //
      history,
      onSelectMarket,
      searchParams,
      setIndexName,
      setOperation,
      setMode,
      setFirstTokenAddress,
      chainId,
      markets,
    ]
  );
}
