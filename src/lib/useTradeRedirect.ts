import { getIsSyntheticsSupported, getIsV1Supported } from "config/features";
import { useEffect, useMemo, useRef } from "react";
import { matchPath, useHistory, useLocation } from "react-router-dom";
import { useTradePageVersion } from "./useTradePageVersion";
import { useChainId } from "./chains";

export default function useTradeRedirect() {
  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();
  const { chainId } = useChainId();
  const location = useLocation();
  const history = useHistory();

  const canUpdateTradePath = useRef(false);

  const isActiveOnTradePage = useMemo(() => {
    return !!matchPath(location.pathname, { path: ["/v1/:tradeType?", "/trade/:tradeType?"] });
  }, [location.pathname]);

  useEffect(
    function redirectTradePage() {
      const isV1Matched = matchPath(location.pathname, { path: "/v1/:tradeType?" });
      const isV2Matched = matchPath(location.pathname, { path: "/trade/:tradeType?" });

      if (isV1Matched && getIsV1Supported(chainId)) {
        setTradePageVersion(1);
      }

      if (isV2Matched && getIsSyntheticsSupported(chainId)) {
        setTradePageVersion(2);
      }
    },
    [chainId, location.pathname, setTradePageVersion]
  );

  useEffect(() => {
    if (!isActiveOnTradePage) {
      canUpdateTradePath.current = false;
      return;
    }
    if (!canUpdateTradePath.current) {
      canUpdateTradePath.current = true;
      return;
    }
    if (tradePageVersion === 1) {
      history.replace("/v1");
    } else if (tradePageVersion === 2) {
      history.replace("/trade");
    }
  }, [tradePageVersion, isActiveOnTradePage, history]);
}
