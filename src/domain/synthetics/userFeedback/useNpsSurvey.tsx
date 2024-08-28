import { RatingToast } from "@/components/RatingToast/RatingToast";
import { NPS_SURVEY_SHOWN_TIME_KEY } from "config/localStorage";
import {
  selectAccountStats,
  selectLastMonthAccountStats,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useOracleKeeperFetcher } from "../tokens";
import { useChainId } from "@/lib/chains";
import { formatAmountForMetrics } from "@/lib/metrics";
import { USD_DECIMALS } from "@/config/factors";
import { useShowDebugValues } from "@/context/SyntheticsStateContext/hooks/settingsHooks";
import useWallet from "@/lib/wallets/useWallet";
import { differenceInDays } from "date-fns";
import { useSyntheticsEvents } from "@/context/SyntheticsEvents";
import { OrderType } from "domain/synthetics/orders";
import { useUnmount } from "react-use";

type Answer = {
  questionType: string;
  question: string;
  answer: string;
};

const ACTION_TRIGGERED_DELAY = 5000;

export function useNpsSurvey() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const showDebugValues = useShowDebugValues();
  const fetcher = useOracleKeeperFetcher(chainId);

  const lastMonthAccountStats = useSelector(selectLastMonthAccountStats);
  const accountStats = useSelector(selectAccountStats);

  const [npsSurveyShownTime, setNpsSurveyShownTime] = useLocalStorageSerializeKey<number | undefined>(
    NPS_SURVEY_SHOWN_TIME_KEY,
    undefined
  );

  const { orderStatuses } = useSyntheticsEvents();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rating, setRating] = useState<number>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error>();
  const [isTriggerActionPerformed, setIsTriggerActionPerformed] = useState(false);

  const isTriggerActionPerformedRef = useRef<number>();

  const onSubmitSurvey = useCallback(
    (answers: Answer[]) => {
      if (!rating || !account) {
        setError(new Error("Error occurred. Please try again"));
        return;
      }

      setIsSubmitting(true);

      fetcher
        .fetchPostFeedback(
          {
            feedback: {
              account: "",
              rating,
              isGeneralFeedback: false,
              monthVolume: formatAmountForMetrics(lastMonthAccountStats?.volume || 0n, USD_DECIMALS, false)!,
              totalVolume: formatAmountForMetrics(accountStats?.volume || 0n, USD_DECIMALS, false)!,
              answers,
            },
          },
          showDebugValues
        )
        .then(() => {
          setIsSubmitting(false);
          setIsModalVisible(false);
        })
        .catch((error) => {
          setIsSubmitting(false);
          setError(error);
        });
    },
    [rating, account, fetcher, lastMonthAccountStats?.volume, accountStats?.volume, showDebugValues]
  );

  const showNpsSurveyToast = useCallback(() => {
    const toastTimestamp = Date.now();
    setNpsSurveyShownTime(toastTimestamp);

    helperToast.error(
      <RatingToast
        onRatingClick={(rating) => {
          setIsModalVisible(true);
          setRating(rating);
          toast.dismiss(toastTimestamp);
        }}
      />,
      {
        autoClose: false,
        toastId: toastTimestamp,
      }
    );
  }, [setNpsSurveyShownTime]);

  useEffect(
    function checkTriggerActionRef() {
      const decreaseOrderStatuses = Object.values(orderStatuses).filter(
        (os) => os.data?.orderType === OrderType.MarketDecrease
      );
      const isLastDecreaseOrderExecuted =
        decreaseOrderStatuses.length && decreaseOrderStatuses.every((os) => os.executedTxnHash);

      if (isLastDecreaseOrderExecuted) {
        isTriggerActionPerformedRef.current = window.setTimeout(() => {
          setIsTriggerActionPerformed(true);
        }, ACTION_TRIGGERED_DELAY);
      }
    },
    [orderStatuses]
  );

  useUnmount(() => {
    clearTimeout(isTriggerActionPerformedRef.current);
  });

  useEffect(
    function showNpsToast() {
      const isConditionsMet = isTriggerActionPerformed && accountStats?.closedCount && accountStats.closedCount >= 3;
      const isAlreadyShown = npsSurveyShownTime && differenceInDays(Date.now(), npsSurveyShownTime) < 30;

      if (!isConditionsMet || isAlreadyShown || isModalVisible) {
        return;
      }

      showNpsSurveyToast();
    },
    [
      isModalVisible,
      accountStats,
      npsSurveyShownTime,
      setNpsSurveyShownTime,
      orderStatuses,
      isTriggerActionPerformed,
      showNpsSurveyToast,
    ]
  );

  return useMemo(
    () => ({
      isModalVisible,
      setIsModalVisible,
      onSubmitSurvey,
      isSubmitting,
      showNpsSurveyToast,
      error,
      rating,
    }),
    [error, isModalVisible, isSubmitting, onSubmitSurvey, rating, showNpsSurveyToast]
  );
}
