import { Trans } from "@lingui/macro";

import { getBridgingOptionsForToken } from "config/bridging";
import { getChainName } from "config/chains";
import { isMegaEthChain, JUMPER_EXCHANGE_URL } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";

type Props = {
  chainId: number;
  tokenSymbol?: string;
  textOpaque?: boolean;
};

export function BridgingInfo(props: Props) {
  const { chainId, tokenSymbol, textOpaque } = props;
  const chainName = getChainName(chainId);
  const isMegaEth = isMegaEthChain(chainId);
  const bridgingOptions = getBridgingOptionsForToken(tokenSymbol);

  if (!tokenSymbol || !bridgingOptions) return null;

  return bridgingOptions.map((option, i) => {
    if (option.render) {
      return (
        <p key={i} className={textOpaque ? undefined : "text-typography-secondary"}>
          {option.render()}
        </p>
      );
    }

    if (!option.generateLink) {
      return null;
    }

    const bridgeLink = isMegaEth ? JUMPER_EXCHANGE_URL : option.generateLink(chainId);
    const optionName = isMegaEth ? "Jumper" : option.name;
    return (
      <p key={i} className={textOpaque ? undefined : "text-typography-secondary"}>
        <Trans>
          Bridge {tokenSymbol} to {chainName} with
        </Trans>{" "}
        <ExternalLink key={i} href={bridgeLink}>
          {optionName}
        </ExternalLink>
      </p>
    );
  });
}
