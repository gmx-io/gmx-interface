import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useMemo } from "react";

import { MULTI_CHAIN_PLATFORM_TOKENS_MAP } from "config/multichain";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import {
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
  selectMultichainMarketTokensBalancesResult,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getPlatformTokenBalanceAfterThreshold } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import type { SettlementChainId } from "sdk/configs/chains";

import Loader from "components/Loader/Loader";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import EarnPageLayout from "../../pages/Earn/EarnPageLayout";

export function EarnRedirect() {
  const { account, status } = useWallet();
  const { ready: isPrivyReady } = usePrivy();
  const { ready: isWalletsReady, wallets } = useWallets();
  const { chainId } = useChainId();
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const depositMarketTokensData = useSelector(selectDepositMarketTokensData);
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);
  const multichainMarketTokensBalancesResult = useSelector(selectMultichainMarketTokensBalancesResult);
  const { data: processedData } = useStakingProcessedData();

  const hasGmxAssets = (processedData?.gmxBalance ?? 0n) > 0n || (processedData?.gmxInStakedGmx ?? 0n) > 0n;

  const hasGmGlvAssets = useMemo(() => {
    if (!marketsInfoData) {
      return false;
    }

    return Object.values(marketsInfoData).some((info) => {
      const tokenAddress = isGlvInfo(info) ? info.glvTokenAddress : info.marketTokenAddress;
      const balance = getByKey(multichainMarketTokensBalances, tokenAddress)?.totalBalance;
      const balanceUsd = getByKey(multichainMarketTokensBalances, tokenAddress)?.totalBalanceUsd;

      const filteredBalanceUsd = getPlatformTokenBalanceAfterThreshold(balanceUsd);
      return filteredBalanceUsd !== 0n && balance !== undefined && balance > 0n;
    });
  }, [marketsInfoData, multichainMarketTokensBalances]);

  const hasAnyEarnHoldings = hasGmxAssets || hasGmGlvAssets;

  const platformTokens = MULTI_CHAIN_PLATFORM_TOKENS_MAP[chainId as SettlementChainId] as string[] | undefined;

  const isWalletInitializing =
    !isPrivyReady ||
    !isWalletsReady ||
    (wallets.length > 0 && !account) ||
    status === "connecting" ||
    status === "reconnecting";

  const processedDataReady = processedData !== undefined;
  const marketsInfoReady = marketsInfoData !== undefined;
  const marketTokensReady =
    (depositMarketTokensData !== undefined &&
      Object.values(depositMarketTokensData).every((token) => token.walletBalance !== undefined)) ||
    Object.keys(marketsInfoData ?? {}).length === 0;
  const sourceChainBalancesReady = !platformTokens?.length || !multichainMarketTokensBalancesResult.isLoading;

  const isBalancesReady =
    !isWalletInitializing &&
    (!account || (processedDataReady && marketsInfoReady && marketTokensReady && sourceChainBalancesReady));

  const target = account && hasAnyEarnHoldings ? "/earn/portfolio" : "/earn/discover";

  return (
    <EarnPageLayout>
      <Loader />
      {isBalancesReady && <RedirectWithQuery to={target} />}
    </EarnPageLayout>
  );
}
