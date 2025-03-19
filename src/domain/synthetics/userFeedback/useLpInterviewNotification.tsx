import { differenceInDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { HIGH_LIQUIDITY_FOR_FEEDBACK, TIME_SPENT_ON_EARN_PAGE_FOR_INVITATION_TOAST } from "config/constants";
import { LP_INTERVIEW_INVITATION_SHOWN_TIME_KEY } from "config/localStorage";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { InterviewToast } from "components/InterviewToast/InterviewToast";

import { useMarketTokensData } from "../markets/useMarketTokensData";
import { getTotalGlvInfo, getTotalGmInfo } from "../markets/utils";


function useTotalProvidedLiquidityUsd() {
  const chainId = useSelector(selectChainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false, withGlv: true });

  return useMemo(() => {
    const totalGmInfo = getTotalGmInfo(marketTokensData);
    const totalGlvInfo = getTotalGlvInfo(marketTokensData);

    return totalGmInfo.balanceUsd + totalGlvInfo.balanceUsd;
  }, [marketTokensData]);
}

export function useLpInterviewNotification() {
  const totalProvidedLiquidityUsd = useTotalProvidedLiquidityUsd();

  const [isLpInterviewModalVisible, setIsLpInterviewModalVisible] = useState(false);
  const [lpInterviewInvitationShownTime, setLpInterviewInvitationShownTime] = useLocalStorageSerializeKey<
    number | undefined
  >(LP_INTERVIEW_INVITATION_SHOWN_TIME_KEY, undefined);

  const [isTriggerActionPerformed, setIsTriggerActionPerformed] = useState(false);

  useEffect(
    function showLpInterviewToast() {
      const isHighLiquidityProvided = totalProvidedLiquidityUsd >= HIGH_LIQUIDITY_FOR_FEEDBACK;
      const isAlreadyShown =
        lpInterviewInvitationShownTime !== undefined &&
        differenceInDays(Date.now(), lpInterviewInvitationShownTime) < 30;

      if (!isHighLiquidityProvided || !isTriggerActionPerformed || isAlreadyShown || isLpInterviewModalVisible) {
        return;
      }

      const toastTimestamp = Date.now();

      setLpInterviewInvitationShownTime(toastTimestamp);

      helperToast.error(
        <InterviewToast
          type="lp"
          onButtonClick={() => {
            setIsLpInterviewModalVisible(true);
            toast.dismiss(toastTimestamp);
          }}
        />,
        {
          autoClose: false,
          toastId: toastTimestamp,
        }
      );
    },
    [
      isLpInterviewModalVisible,
      isTriggerActionPerformed,
      lpInterviewInvitationShownTime,
      setLpInterviewInvitationShownTime,
      totalProvidedLiquidityUsd,
    ]
  );

  useEffect(function runTriggerAction() {
    const timeout = setTimeout(() => {
      setIsTriggerActionPerformed(true);
    }, TIME_SPENT_ON_EARN_PAGE_FOR_INVITATION_TOAST);

    return () => clearTimeout(timeout);
  }, []);

  return {
    isLpInterviewModalVisible,
    setIsLpInterviewModalVisible,
  };
}
