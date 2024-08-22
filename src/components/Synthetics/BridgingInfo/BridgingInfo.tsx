import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Tooltip from "components/Tooltip/Tooltip";
import { getBridgingOptionsForToken } from "config/bridging";
import { getChainName } from "config/chains";

type Props = {
  chainId: number;
  tokenSymbol?: string;
};

export default function BridgingInfoG(props: Props) {
  const { chainId, tokenSymbol } = props;
  const chainName = getChainName(chainId);
  const bridgingOptions = getBridgingOptionsForToken(tokenSymbol);

  if (!tokenSymbol || !bridgingOptions) return null;

  return (
    <Tooltip
      handle="Bridging instructions"
      position="bottom-end"
      renderContent={() => (
        <>
          <Trans>
            Bridge {tokenSymbol} to {chainName} using any of the options below:
          </Trans>
          <br />
          <br />
          {bridgingOptions.map((option, i) => {
            const bridgeLink = option.generateLink(chainId);
            return (
              <ExternalLink key={i} href={bridgeLink}>
                {option?.name}
              </ExternalLink>
            );
          })}
        </>
      )}
    />
  );
}

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
