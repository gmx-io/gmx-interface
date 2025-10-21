import { useMemo } from "react";

import { ContractsChainId } from "config/chains";
import { LAST_EARN_TAB_KEY } from "config/localStorage";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { TokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";

import Loader from "components/Loader/Loader";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import EarnPageLayout, { EARN_TABS, EarnTab } from "../../pages/Earn/EarnPageLayout";

function isEarnTab(value: string | null): value is EarnTab {
  return typeof value === "string" && (EARN_TABS as ReadonlyArray<string>).includes(value);
}

function hasGmxTokenBalance(chainId: ContractsChainId, tokensData: TokensData | undefined) {
  if (!tokensData) {
    return false;
  }

  const tokenAddress = getTokenBySymbolSafe(chainId, "GMX")?.address;
  if (!tokenAddress) {
    return false;
  }

  const token = getByKey(tokensData, tokenAddress);
  if (!token) {
    return false;
  }

  return token.balance !== undefined && token.balance > 0n;
}

export function EarnRedirect() {
  const [lastEarnTab] = useLocalStorageSerializeKey<EarnTab | undefined>(LAST_EARN_TAB_KEY, undefined);

  if (lastEarnTab && isEarnTab(lastEarnTab)) {
    return <RedirectWithQuery to={`/earn/${lastEarnTab}`} />;
  }

  return <EarnFirstVisitRedirect />;
}

export function EarnFirstVisitRedirect() {
  const { account } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });
  const { data: processedData } = useStakingProcessedData();

  const tokensData = useTokensData();
  const hasEarnTokenHoldings = useMemo(() => hasGmxTokenBalance(chainId, tokensData), [chainId, tokensData]);

  const hasStakedGmx = (processedData?.gmxInStakedGmx ?? 0n) > 0n;

  const hasGmGlvAssets = useMemo(() => {
    if (!marketsInfoData || !marketTokensData) {
      return false;
    }

    return Object.values(marketsInfoData).some((info) => {
      const tokenAddress = isGlvInfo(info) ? info.glvTokenAddress : info.marketTokenAddress;
      const balance = getByKey(marketTokensData, tokenAddress)?.balance;
      return balance !== undefined && balance > 0n;
    });
  }, [marketTokensData, marketsInfoData]);

  const hasAnyEarnHoldings = hasEarnTokenHoldings || hasStakedGmx || hasGmGlvAssets;

  const tokenBalancesReady = tokensData !== undefined;
  const processedDataReady = !account || processedData !== undefined;
  const marketsInfoReady = marketsInfoData !== undefined;
  const marketTokensReady =
    !account || marketTokensData !== undefined || Object.keys(marketsInfoData ?? {}).length === 0;

  const isBalancesReady =
    !account || (tokenBalancesReady && processedDataReady && marketsInfoReady && marketTokensReady);

  const target = account && hasAnyEarnHoldings ? "/earn/portfolio" : "/earn/discovery";

  return (
    <EarnPageLayout>
      <Loader />
      {isBalancesReady && <RedirectWithQuery to={target} />}
    </EarnPageLayout>
  );
}
