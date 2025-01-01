import { Trans, t } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "../Modal/Modal";
import ArrowBulletIcon from "img/arrow-bullet.svg?react";
import { useCopyToClipboard } from "react-use";
import { helperToast } from "lib/helperToast";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
};

export function InterviewModal({ isVisible, setIsVisible }: Props) {
  const [, copyToClipboard] = useCopyToClipboard();

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
          <div className="flex items-center gap-12 text-14">
            <ArrowBulletIcon />
            <div className="text-slate-100">
              <Trans>
                Discord account:{" "}
                <span
                  className="cursor-copy underline"
                  onClick={() => {
                    copyToClipboard(window.location.href);
                    helperToast.success("Username copied to your clipboard");
                  }}
                >
                  @gmx_feedback
                </span>{" "}
              </Trans>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
