import { useCallback, useState } from "react";

import { AB_HIGH_LEVERAGE_WARNING_GROUP, AB_HIGH_LEVERAGE_WARNING_PROBABILITY } from "config/ab";
import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxToTokenAddress } from "context/SyntheticsStateContext/selectors/shared/baseSelectors";
import { selectTradeboxLeverage } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useIsFreshAccountForHighLeverageTrading } from "domain/synthetics/accountStats/useIsFreshAccountForHighLeverageTrading";
import { useIsAddressInGroup } from "lib/userAnalytics/getIsAddressInGroup";
import { getToken } from "sdk/configs/tokens";

const IS_MAJOR_TOKEN_MAP: Record<number, string[]> = {
  [ARBITRUM]: ["BTC", "ETH", "SOL"],
  [AVALANCHE]: ["AVAX", "ETH", "BTC"],
  [BOTANIX]: ["BTC"],
};

const MAX_MAJOR_TOKEN_LEVERAGE = 15n * BASIS_POINTS_DIVISOR_BIGINT;
const MAX_ALTCOIN_LEVERAGE = 10n * BASIS_POINTS_DIVISOR_BIGINT;

export function useShowHighLeverageWarning(): {
  showHighLeverageWarning: boolean;
  dismissHighLeverageWarning: () => void;
} {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const isFreshAccount = useIsFreshAccountForHighLeverageTrading();

  const isInGroup = useIsAddressInGroup({
    address: account,
    experimentGroupProbability: AB_HIGH_LEVERAGE_WARNING_PROBABILITY,
    grouping: AB_HIGH_LEVERAGE_WARNING_GROUP,
  });

  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const toTokenSymbol = toTokenAddress ? getToken(chainId, toTokenAddress).symbol : undefined;
  const isMajorToken = toTokenSymbol ? IS_MAJOR_TOKEN_MAP[chainId].includes(toTokenSymbol) : false;
  const leverage = useSelector(selectTradeboxLeverage);

  const [isDismissed, setIsDismissed] = useState(false);

  const isHighLeverage = isMajorToken ? leverage > MAX_MAJOR_TOKEN_LEVERAGE : leverage >= MAX_ALTCOIN_LEVERAGE;

  const dismissHighLeverageWarning = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return {
    showHighLeverageWarning: isFreshAccount && isInGroup && isHighLeverage && !isDismissed,
    dismissHighLeverageWarning,
  };
}
