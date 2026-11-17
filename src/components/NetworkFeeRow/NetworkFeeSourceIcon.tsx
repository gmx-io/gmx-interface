import type { ContractsChainId } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { getNetworkFeeSourceLabel, type NetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";
import { TokenBalanceType } from "domain/tokens";
import { useChainId } from "lib/chains";

import gmxRoundedIcon from "img/ic_gmx_rounded.svg";

function getNetworkFeeSourceIconSrc(source: NetworkFeeSource, chainId: ContractsChainId): string {
  switch (source.balanceType) {
    case TokenBalanceType.GmxAccount:
      return gmxRoundedIcon;
    case TokenBalanceType.Wallet:
      return CHAIN_ID_TO_NETWORK_ICON[chainId];
    case TokenBalanceType.SourceChain:
      return CHAIN_ID_TO_NETWORK_ICON[source.chainId];
  }
}

export function NetworkFeeSourceIcon({
  source,
  isDecorative = false,
}: {
  source: NetworkFeeSource;
  isDecorative?: boolean;
}) {
  const { chainId } = useChainId();

  return (
    <img
      src={getNetworkFeeSourceIconSrc(source, chainId)}
      alt={isDecorative ? "" : getNetworkFeeSourceLabel(source)}
      className="size-16 shrink-0"
    />
  );
}
