import { RatingToast } from "@/components/RatingToast/RatingToast";
import { NPS_SURVEY_SHOWN_TIME } from "config/localStorage";
import {
  selectAccountStats,
  selectLastMonthAccountStats,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useOracleKeeperFetcher } from "../tokens";
import { useChainId } from "@/lib/chains";
import { formatAmountForMetrics } from "@/lib/metrics";
import { USD_DECIMALS } from "@/config/factors";
import { useShowDebugValues } from "@/context/SyntheticsStateContext/hooks/settingsHooks";
import useWallet from "@/lib/wallets/useWallet";

type Answer = {
  questionType: string;
  question: string;
  answer: string;
};

export function useNpsSurvey() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const showDebugValues = useShowDebugValues();
  const fetcher = useOracleKeeperFetcher(chainId);

  const lastMonthAccountStats = useSelector(selectLastMonthAccountStats);
  const accountStats = useSelector(selectAccountStats);

  const [npsSurveyShownTime, setNpsSurveyShownTime] = useLocalStorageSerializeKey<number | undefined>(
    NPS_SURVEY_SHOWN_TIME,
    undefined
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [rating, setRating] = useState<number>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error>();

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
              account,
              rating,
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

  useEffect(
    function showNpsToast() {
      const isConditionsMet = accountStats?.closedCount && accountStats.closedCount >= 3;
      const isAlreadyShown = Boolean(npsSurveyShownTime);

      if (!isConditionsMet || isAlreadyShown || isModalVisible) {
        return;
      }

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
    },
    [isModalVisible, accountStats, npsSurveyShownTime, setNpsSurveyShownTime]
  );

  return useMemo(
    () => ({
      isModalVisible,
      setIsModalVisible,
      onSubmitSurvey,
      isSubmitting,
      error,
      rating,
    }),
    [error, isModalVisible, isSubmitting, onSubmitSurvey, rating]
  );
}
