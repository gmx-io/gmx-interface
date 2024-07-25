import { Trans } from "@lingui/macro";

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
      <Trans>
        As a token of our appreciation, you'll receive a reward of{" "}
        <span className="font-bold text-green-500">100 USDC</span>.
      </Trans>
      <br />
      <br />
      <div onClick={onButtonClick} className="cursor-pointer text-gray-300 underline">
        <Trans>Click here to give us your feedback on GMX</Trans>
      </div>
    </div>
  );
}
