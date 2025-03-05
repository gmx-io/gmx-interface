import { differenceInDays } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useUnmount } from "react-use";

import { HIGH_LIQUIDITY_FOR_FEEDBACK } from "config/constants";
import { LP_INTERVIEW_INVITATION_SHOWN_TIME_KEY } from "config/localStorage";
import { useSyntheticsEvents } from "context/SyntheticsEvents/SyntheticsEventsProvider";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMarketTokensData } from "../markets/useMarketTokensData";
import { getTotalGlvInfo, getTotalGmInfo } from "../markets/utils";

import { InterviewToast } from "components/InterviewToast/InterviewToast";

const ACTION_TRIGGERED_DELAY = 5000;

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
  const { depositStatuses, withdrawalStatuses, shiftStatuses } = useSyntheticsEvents();

  const [isLpInterviewModalVisible, setIsLpInterviewModalVisible] = useState(false);
  const [lpInterviewInvitationShownTime, setLpInterviewInvitationShownTime] = useLocalStorageSerializeKey<
    number | undefined
  >(LP_INTERVIEW_INVITATION_SHOWN_TIME_KEY, undefined);

  const [isTriggerActionPerformed, setIsTriggerActionPerformed] = useState(false);
  const isTriggerActionPerformedRef = useRef<number>();

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

  useEffect(
    function checkTriggerActionRef() {
      const dsLength = Object.keys(depositStatuses).length;
      const wsLength = Object.keys(withdrawalStatuses).length;
      const ssLength = Object.keys(shiftStatuses).length;

      const dsExecuted = dsLength > 0 && Object.values(depositStatuses).every((ds) => ds.executedTxnHash);
      const wsExecuted = wsLength > 0 && Object.values(withdrawalStatuses).every((ws) => ws.executedTxnHash);
      const ssExecuted = ssLength > 0 && Object.values(shiftStatuses).every((ss) => ss.executedTxnHash);

      const isLastAcceptableActionExecuted = dsExecuted || wsExecuted || ssExecuted;

      if (isLastAcceptableActionExecuted && isTriggerActionPerformedRef.current === undefined) {
        isTriggerActionPerformedRef.current = window.setTimeout(() => {
          setIsTriggerActionPerformed(true);
        }, ACTION_TRIGGERED_DELAY);
      }
    },
    [depositStatuses, shiftStatuses, withdrawalStatuses]
  );

  useUnmount(() => {
    clearTimeout(isTriggerActionPerformedRef.current);
    isTriggerActionPerformedRef.current = undefined;
  });

  return {
    isLpInterviewModalVisible,
    setIsLpInterviewModalVisible,
  };
}
