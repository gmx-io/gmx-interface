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

  return bridgingOptions.map((option, i) => {
    if (option.render) {
      return (
        <p key={i} className="text-gray-300">
          {option.render()}
        </p>
      );
    }

    if (!option.generateLink) {
      return null;
    }

    const bridgeLink = option.generateLink(chainId);
    return (
      <p key={i} className="text-gray-300">
        <Trans>
          Bridge {tokenSymbol} to {chainName} with
        </Trans>{" "}
        <ExternalLink key={i} href={bridgeLink}>
          {option?.name}
        </ExternalLink>
      </p>
    );
  });
}
