import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";
import ArrowBulletIcon from "img/arrow-bullet.svg?react";
import Modal from "../Modal/Modal";

type Props = {
  type: "trader" | "lp";
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
};

export function InterviewModal({ type, isVisible, setIsVisible }: Props) {
  if (type === "trader") {
    return (
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Anonymous chat with GMX`}>
        <div className="max-w-xl">
          <Trans>
            We want your insights to help improve GMX. For security reasons, we won't contact you first. Please send the
            message "I have feedback" to any of our official accounts:
          </Trans>
          <div className="mb-20 mt-20 flex flex-col gap-8">
            <div className="flex items-center gap-12 text-14">
              <ArrowBulletIcon />
              <ExternalLink href="https://t.me/GMXPartners">
                <Trans>Telegram account</Trans>
              </ExternalLink>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  if (type === "lp") {
    return (
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Anonymous chat with GMX team`}>
        <div className="max-w-xl">
          <Trans>
            We want your insights to help improve GMX for Liquidity Providers. For security reasons, we won't contact
            you first. Please send the message "I’m a Liquidity Provider" to our official telegram account:
          </Trans>
          <div className="mb-20 mt-20 flex flex-col gap-8">
            <div className="flex items-center gap-12 text-14">
              <ArrowBulletIcon />
              <ExternalLink href="https://t.me/GMXPartners">
                <Trans>Telegram account</Trans>
              </ExternalLink>
            </div>
          </div>
          <Trans>
            We'll then schedule a chat or interview with you. As a thank you, you'll receive{" "}
            <span className="font-400 text-green-500">
              100 <TokenSymbolWithIcon symbol="USDC" />
            </span>{" "}
            for providing your feedback.
          </Trans>
        </div>
      </Modal>
    );
  }
}
