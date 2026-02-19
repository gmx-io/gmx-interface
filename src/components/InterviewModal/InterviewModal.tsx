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
            Help us improve GMX. For security, we won't contact you first. Send "I have feedback" to our official
            account:
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
            Help us improve GMX for Liquidity Providers. For security, we won't contact you first. Send "I'm a Liquidity
            Provider" to our official Telegram account:
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
            We'll schedule a chat with you. As thanks, you'll receive{" "}
            <span className="font-400 text-green-500">
              100 <TokenSymbolWithIcon symbol="USDC" />
            </span>{" "}
            for your feedback.
          </Trans>
        </div>
      </Modal>
    );
  }
}
