import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { MAX_FEEDBACK_LENGTH } from "config/ui";
import { useAccountStats, usePeriodAccountStats } from "domain/synthetics/accountStats";
import { formatAnswersByQuestionType, QuestionType } from "domain/synthetics/userFeedback";
import { useChainId } from "lib/chains";
import { getTimePeriodsInSeconds } from "lib/dates";
import { formatAmountForMetrics } from "lib/metrics";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { Textarea } from "components/Textarea/Textarea";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
};

const TIME_PERIODS = getTimePeriodsInSeconds();

export function UserFeedbackModal({ isVisible, setIsVisible }: Props) {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);

  const { data: lastMonthAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: TIME_PERIODS.month[0],
    to: TIME_PERIODS.month[1],
    enabled: isVisible,
  });

  const { data: accountStats } = useAccountStats(chainId, {
    account,
    enabled: isVisible,
  });

  const [feedback, setFeedback] = useState<string>("");
  const [contact, setContact] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error>();

  const feedbackQuestion = t`Your feedback helps us understand what we're doing well and where we can improve`;

  const onChangeFeedback = useCallback((val: string) => {
    if (val.length > MAX_FEEDBACK_LENGTH) {
      return;
    }

    setFeedback(val);
  }, []);

  const onSubmitFeedback = () => {
    setIsSubmitting(true);

    fetcher
      .fetchPostFeedback({
        feedback: {
          account: "",
          rating: undefined,
          isGeneralFeedback: true,
          monthVolume: formatAmountForMetrics(lastMonthAccountStats?.volume || 0n, USD_DECIMALS, "toSecondOrderInt")!,
          totalVolume: formatAmountForMetrics(accountStats?.volume || 0n, USD_DECIMALS, "toSecondOrderInt")!,
          contact,
          answers: formatAnswersByQuestionType([
            {
              questionType: QuestionType.generalFeedback,
              question: feedbackQuestion,
              answer: feedback,
            },
          ]),
        },
      })
      .then(() => {
        setIsSubmitting(false);
        setIsVisible(false);
      })
      .catch((error) => {
        setIsSubmitting(false);
        setError(error);
      });
  };

  const submitButtonState = useMemo(() => {
    if (isSubmitting) {
      return {
        text: t`Submitting...`,
        disabled: true,
      };
    }

    if (error) {
      return {
        text: t`Error, try again`,
        disabled: true,
      };
    }

    return {
      text: t`Submit`,
      disabled: false,
    };
  }, [error, isSubmitting]);

  useEffect(
    function resetEff() {
      setFeedback("");
      setContact("");
    },
    [isVisible]
  );

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`We value your feedback`}>
      <div className="mb-15 max-w-xl">
        {feedbackQuestion}
        <Textarea value={feedback} onChange={onChangeFeedback} placeholder={t`Enter your feedback`} />
      </div>
      <div className="mb-15 flex flex-col">
        <TooltipWithPortal position="top-start" content={<Trans>Optional: share for follow-up questions</Trans>}>
          <Trans>Telegram contact (optional)</Trans>
        </TooltipWithPortal>
        <input
          className="mt-15 text-input-bg"
          name="contact"
          type="text"
          value={contact}
          onChange={(evt) => setContact(evt.target.value)}
          placeholder={t`@username`}
        />
      </div>
      <Button
        variant="primary-action"
        className="mt-4 w-full"
        onClick={onSubmitFeedback}
        disabled={submitButtonState.disabled}
      >
        {submitButtonState.text}
      </Button>
    </Modal>
  );
}
