import { Trans, t } from "@lingui/macro";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "../Modal/Modal";

import "./InterviewModal.scss";

import { ReactComponent as ArrowBulletIcon } from "img/arrow-bullet.svg";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
};

export function InterviewModal({ isVisible, setIsVisible }: Props) {
  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Anonymous chat with GMX product manager`}>
      <div className="InterviewModal">
        <Trans>
          We want your insights to help improve GMX. For security reasons, we won't contact you first. Please send the
          message "I have feedback" to any of our official accounts:
        </Trans>
        <div className="InterviewModal-bullet-list">
          <div className="InterviewModal-bullet">
            <ArrowBulletIcon />
            <ExternalLink className="InterviewModal-bullet-text" href="https://t.me/GMXPartners">
              <Trans>Official Telegram account</Trans>
            </ExternalLink>
          </div>
          <div className="InterviewModal-bullet">
            <ArrowBulletIcon />
            <div className="text-gray-300 underline">
              <Trans>Official Discord account: @gmx_feedback</Trans>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
