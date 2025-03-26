import { differenceInDays } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { HIGH_TRADE_VOLUME_FOR_FEEDBACK } from "config/constants";
import { INTERVIEW_INVITATION_SHOWN_TIME_KEY } from "config/localStorage";
import { selectLastWeekAccountStats } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { InterviewToast } from "components/InterviewToast/InterviewToast";

export function useInterviewNotification() {
  const lastWeekAccountStats = useSelector(selectLastWeekAccountStats);
  const [isInterviewModalVisible, setIsInterviewModalVisible] = useState(false);
  const [interviewInvitationShownTime, setInterviewInvitationShownTime] = useLocalStorageSerializeKey<
    number | undefined
  >(INTERVIEW_INVITATION_SHOWN_TIME_KEY, undefined);

  useEffect(
    function showInterviewToast() {
      const isHighTradeVolume = lastWeekAccountStats && lastWeekAccountStats.volume >= HIGH_TRADE_VOLUME_FOR_FEEDBACK;
      const isAlreadyShown =
        interviewInvitationShownTime && differenceInDays(Date.now(), interviewInvitationShownTime) < 30;

      if (!isHighTradeVolume || isAlreadyShown) {
        return;
      }

      const toastTimestamp = Date.now();

      setInterviewInvitationShownTime(toastTimestamp);

      helperToast.error(
        <InterviewToast
          type="trader"
          onButtonClick={() => {
            setIsInterviewModalVisible(true);
            toast.dismiss(toastTimestamp);
          }}
        />,
        {
          autoClose: false,
          toastId: toastTimestamp,
        }
      );
    },
    [interviewInvitationShownTime, lastWeekAccountStats, setInterviewInvitationShownTime]
  );

  return {
    isInterviewModalVisible,
    setIsInterviewModalVisible,
  };
}
