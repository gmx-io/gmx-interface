import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import getBridgingOptionsForToken from "config/bridging";
import { getChainName } from "config/chains";

export default function getBridgingInfo(chainId: number, tokenSymbol?: string) {
  const chainName = getChainName(chainId);
  if (!tokenSymbol) return;
  const bridgingOptions = getBridgingOptionsForToken(tokenSymbol);
  return {
    label: "Bridging instructions",
    tooltip: bridgingOptions && (
      <>
        <Trans>
          Bridge {tokenSymbol} to {chainName} using any of the options below:
        </Trans>
        <br />
        <br />
        {bridgingOptions?.map((option) => {
          const bridgeLink = option.generateLink(chainId);
          return <ExternalLink href={bridgeLink}>{option.name}</ExternalLink>;
        })}
      </>
    ),
  };
}
