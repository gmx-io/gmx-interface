import { InterviewToast } from "components/InterviewToast/InterviewToast";
import { HIGH_TRADE_VOLUME_FOR_FEEDBACK } from "config/factors";
import { INTERVIEW_INVITATION_SHOWN_TIME } from "config/localStorage";
import { selectLastWeekAccountStats } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { differenceInDays } from "date-fns";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export function useInterviewNotification() {
  const lastWeekAccountStats = useSelector(selectLastWeekAccountStats);
  const [isInterviewModalVisible, setIsInterviewModalVisible] = useState(false);
  const [interviewInvitationShownTime, setInterviewInvitationShownTime] = useLocalStorageSerializeKey<
    number | undefined
  >(INTERVIEW_INVITATION_SHOWN_TIME, undefined);

  useEffect(
    function showInterviewToast() {
      const isHighTradeVolume = lastWeekAccountStats && lastWeekAccountStats.volume >= HIGH_TRADE_VOLUME_FOR_FEEDBACK;
      const isAlreadyShown =
        interviewInvitationShownTime && differenceInDays(interviewInvitationShownTime, Date.now()) < 30;

      if (!isHighTradeVolume || isAlreadyShown) {
        return;
      }

      const toastTimestamp = Date.now();

      setInterviewInvitationShownTime(toastTimestamp);

      helperToast.error(
        <InterviewToast
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
