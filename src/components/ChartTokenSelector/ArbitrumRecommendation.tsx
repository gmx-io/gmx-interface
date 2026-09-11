import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useAccount } from "wagmi";

import { ARBITRUM, AVALANCHE, MEGAETH, getChainName, type ContractsChainId } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { extendError } from "lib/errors";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { switchNetwork } from "lib/wallets";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { getSmartWalletChainUnavailableToastContent } from "components/Errors/errorToasts";

const ARBITRUM_RECOMMENDED_CHAIN_IDS: ContractsChainId[] = [AVALANCHE, MEGAETH];

export function ArbitrumRecommendation() {
  const chainId = useSelector(selectChainId);
  const { isConnected } = useAccount();

  const handleSwitchToArbitrum = useCallback(() => {
    switchNetwork(ARBITRUM, isConnected).catch((error) => {
      if (error?.message === SMART_WALLET_CHAIN_UNAVAILABLE_ERROR) {
        helperToast.error(getSmartWalletChainUnavailableToastContent(ARBITRUM));
      }

      metrics.pushError(extendError(error, { data: { chainId: ARBITRUM } }), "chartTokenSelector.switchToArbitrum");
    });
  }, [isConnected]);

  if (!ARBITRUM_RECOMMENDED_CHAIN_IDS.includes(chainId)) {
    return null;
  }

  return (
    <AlertInfoCard type="info" className="mx-12 mt-12" hideClose>
      <Trans>For deeper liquidity and the most complete GMX trading experience, use Arbitrum.</Trans>
      <ColorfulButtonLink onClick={handleSwitchToArbitrum}>
        <Trans>Switch to {getChainName(ARBITRUM)}</Trans>
      </ColorfulButtonLink>
    </AlertInfoCard>
  );
}
