import { useHomePageContext } from "landing/contexts/HomePageContext";
import { REDIRECT_CHAIN_IDS, useGoToTrade } from "landing/hooks/useGoToTrade";

import { LaunchButton } from "./LaunchButton";

type Props = {
  chainId: REDIRECT_CHAIN_IDS;
};

export function LaunchButtonContainer({ chainId }: Props) {
  const { showRedirectModal } = useHomePageContext();
  const onClick = useGoToTrade({
    chainId,
    showRedirectModal,
    buttonPosition: "LaunchSection",
  });
  return <LaunchButton chainId={chainId} onClick={onClick} />;
}
