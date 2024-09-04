import { Trans } from "@lingui/macro";

import { getBridgingOptionsForToken } from "config/bridging";
import { getChainName } from "config/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";

type Props = {
  chainId: number;
  tokenSymbol?: string;
};

export function BridgingInfo(props: Props) {
  const { chainId, tokenSymbol } = props;
  const chainName = getChainName(chainId);
  const bridgingOptions = getBridgingOptionsForToken(tokenSymbol);

  if (!tokenSymbol || !bridgingOptions) return null;

  return (
    <p className="opacity-70">
      <Trans>
        Bridge {tokenSymbol} to {chainName} with
      </Trans>{" "}
      {bridgingOptions.map((option, i) => {
        const bridgeLink = option.generateLink(chainId);
        return (
          <ExternalLink key={i} href={bridgeLink}>
            {option?.name}
          </ExternalLink>
        );
      })}
    </p>
  );
}
