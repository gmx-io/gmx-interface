import { Trans } from "@lingui/macro";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

type Props = {
  type: "trader" | "lp";
  onButtonClick?: () => void;
};

export function InterviewToast({ type, onButtonClick }: Props) {
  if (type === "trader") {
    return (
      <div>
        <Trans>
          We value your experience and insights and invite you to participate in an anonymous one-on-one chat.
        </Trans>
        <br />
        <br />
        <div onClick={onButtonClick} className="text-xl cursor-pointer text-slate-100 underline">
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

  if (type === "lp") {
    return (
      <div>
        <Trans>
          We value your experience as GMX Liquidity Provider and invite you to participate in an anonymous one-on-one
          chat.
        </Trans>
        <br />
        <br />
        <Trans>
          As a token of our appreciation, you'll receive a reward of{" "}
          <span className="font-400 text-green-500">
            100 <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("USDC")} />
          </span>
          .
        </Trans>
        <br />
        <br />
        <div onClick={onButtonClick} className="text-xl cursor-pointer text-slate-100 underline">
          <Trans>Click here to give us your feedback on GMX.</Trans>
        </div>
      </div>
    );
  }
}
