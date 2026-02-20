import { Trans } from "@lingui/macro";

import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";

type Props = {
  type: "trader" | "lp";
  onButtonClick?: () => void;
};

export function InterviewToast({ type, onButtonClick }: Props) {
  if (type === "trader") {
    return (
      <div>
        <Trans>Join an anonymous one-on-one chat to share your experience</Trans>
        <br />
        <br />
        <ColorfulButtonLink color="blue" onClick={onButtonClick}>
          <Trans>Share GMX feedback</Trans>
        </ColorfulButtonLink>
        <br />
        <Trans>
          Reward:{" "}
          <span className="font-400 text-green-500">
            100 <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("USDC")} />
          </span>
        </Trans>
      </div>
    );
  }

  if (type === "lp") {
    return (
      <div>
        <Trans>Join an anonymous one-on-one chat to share your GMX liquidity provider experience</Trans>
        <br />
        <br />
        <Trans>
          Reward:{" "}
          <span className="font-400 text-green-500">
            100 <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("USDC")} />
          </span>
        </Trans>
        <br />
        <br />
        <ColorfulButtonLink color="blue" onClick={onButtonClick}>
          <Trans>Share GMX feedback</Trans>
        </ColorfulButtonLink>
      </div>
    );
  }
}
