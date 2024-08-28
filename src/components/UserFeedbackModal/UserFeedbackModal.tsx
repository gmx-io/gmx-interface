import { USD_DECIMALS } from "@/config/factors";
import { MAX_FEEDBACK_LENGTH } from "@/config/ui";
import { useAccountStats, usePeriodAccountStats } from "@/domain/synthetics/accountStats";
import { useOracleKeeperFetcher } from "@/domain/synthetics/tokens";
import { useChainId } from "@/lib/chains";
import { getTimePeriodsInSeconds } from "@/lib/dates";
import { formatAmountForMetrics } from "@/lib/metrics";
import useWallet from "@/lib/wallets/useWallet";
import { t } from "@lingui/macro";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { Textarea } from "components/Textarea/Textarea";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
};

export function UserFeedbackModal({ isVisible, setIsVisible }: Props) {
  const { account } = useWallet();
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId);

  const timePerios = useMemo(() => getTimePeriodsInSeconds(), []);

  const { data: lastMonthAccountStats } = usePeriodAccountStats(chainId, {
    account,
    from: timePerios.month[0],
    to: timePerios.month[1],
    enabled: isVisible,
  });

  const { data: accountStats } = useAccountStats(chainId, {
    account,
    enabled: isVisible,
  });

  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error>();

  const feedbackQuestion = t`Your opinions and experiences matter to us. Your feedback helps us understand what we are doing well and where we can make enhancements.`;

  const onChangeFeedback = useCallback((val: string) => {
    if (val.length > MAX_FEEDBACK_LENGTH) {
      return;
    }

    setFeedback(val);
  }, []);

  const onSubmitFeedback = useCallback(() => {
    setIsSubmitting(true);

    fetcher
      .fetchPostFeedback({
        feedback: {
          account: "",
          rating: undefined,
          isGeneralFeedback: true,
          monthVolume: formatAmountForMetrics(lastMonthAccountStats?.volume || 0n, USD_DECIMALS, false)!,
          totalVolume: formatAmountForMetrics(accountStats?.volume || 0n, USD_DECIMALS, false)!,
          answers: [
            {
              questionType: "generalFeedback",
              question: feedbackQuestion,
              answer: feedback,
            },
          ],
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
  }, [accountStats?.volume, feedback, feedbackQuestion, fetcher, lastMonthAccountStats?.volume, setIsVisible]);

  const submitButtonState = useMemo(() => {
    if (isSubmitting) {
      return {
        text: t`Submitting...`,
        disabled: true,
      };
    }

    if (error) {
      return {
        text: t`Error occurred. Please try again`,
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
    },
    [isVisible]
  );

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`We Value Your Feedback`}>
      <div className="mb-15 max-w-xl">
        {feedbackQuestion}
        <Textarea value={feedback} onChange={onChangeFeedback} placeholder={t`Enter your feedback here`} />
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
