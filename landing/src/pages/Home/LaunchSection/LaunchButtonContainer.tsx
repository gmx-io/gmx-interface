import { RedirectChainIds, useGoToTrade } from "landing/pages/Home/hooks/useGoToTrade";

import { LaunchButton } from "./LaunchButton";

type Props = {
  chainId: RedirectChainIds;
};

export function LaunchButtonContainer({ chainId }: Props) {
  const onClick = useGoToTrade({
    chainId,
    buttonPosition: "LaunchSection",
  });
  return <LaunchButton chainId={chainId} onClick={onClick} />;
}
