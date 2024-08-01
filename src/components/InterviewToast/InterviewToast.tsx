import { Trans } from "@lingui/macro";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";
import { getNormalizedTokenSymbol } from "config/tokens";

type Props = {
  onButtonClick?: () => void;
};

export function InterviewToast({ onButtonClick }: Props) {
  return (
    <div>
      <Trans>
        We value your experience and insights and invite you to participate in an anonymous one-on-one chat.
      </Trans>
      <br />
      <br />
      <div onClick={onButtonClick} className="text-xl cursor-pointer text-gray-300 underline">
        <Trans>Give us your feedback on GMX.</Trans>
      </div>
      <br />
      <Trans>
        As a token of our appreciation, you'll receive a reward of{" "}
        <span className="font-400 text-green-500">
          100 <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("USDC")} />
        </span>
        .
      </Trans>
    </div>
  );
}
