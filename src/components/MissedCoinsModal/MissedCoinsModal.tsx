import { t, Trans } from "@lingui/macro";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { Textarea } from "components/Textarea/Textarea";
import { MAX_FEEDBACK_LENGTH } from "config/ui";
import {
  selectAccountStats,
  selectLastMonthAccountStats,
  selectMissedCoinsModalPlace,
  selectSetMissedCoinsModalPlace,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { sendMissedCoinsFeedback } from "domain/synthetics/userFeedback/requests";
import { helperToast } from "lib/helperToast";
import { useCallback, useEffect, useMemo, useState } from "react";

export function MissedCoinsModal() {
  const missedCoinsModalPlace = useSelector(selectMissedCoinsModalPlace);
  const setMissedCoinsModalPlace = useSelector(selectSetMissedCoinsModalPlace);
  const lastMonthAccountStats = useSelector(selectLastMonthAccountStats);
  const accountStats = useSelector(selectAccountStats);

  const isVisible = Boolean(missedCoinsModalPlace);
  const setIsVisible = useCallback(
    (isVisible: boolean) => {
      if (!isVisible) {
        setMissedCoinsModalPlace(undefined);
      }
    },
    [setMissedCoinsModalPlace]
  );

  const [coinsInputText, setCoinsInputText] = useState<string>("");

  const onChangeCoinsInput = useCallback((val: string) => {
    if (val.length > MAX_FEEDBACK_LENGTH) {
      return;
    }

    setCoinsInputText(val);
  }, []);

  const onSubmit = useCallback(() => {
    if (!missedCoinsModalPlace) {
      helperToast.error(t`Error submitting feedback`);
      return;
    }

    sendMissedCoinsFeedback({
      place: missedCoinsModalPlace,
      coinsInput: coinsInputText,
      totalVolume: accountStats?.volume,
      monthVolume: lastMonthAccountStats?.volume,
    });

    setIsVisible(false);
  }, [accountStats?.volume, coinsInputText, lastMonthAccountStats?.volume, missedCoinsModalPlace, setIsVisible]);

  const submitButtonState = useMemo(() => {
    if (coinsInputText.trim().length < 2) {
      return {
        text: t`Enter at least 2 symbols`,
        disabled: true,
      };
    }

    return {
      text: t`Submit`,
      disabled: false,
    };
  }, [coinsInputText]);

  useEffect(
    function resetEff() {
      setCoinsInputText("");
    },
    [isVisible]
  );

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Let us know which coins you're missing`}>
      <div className="mb-15 max-w-xl">
        <Trans>Please enter the names of the coins you'd like to see added:</Trans>
        <Textarea
          value={coinsInputText}
          onChange={onChangeCoinsInput}
          placeholder={t`Names could be separated by commas or spaces`}
        />
      </div>
      <Button variant="primary-action" className="mt-4 w-full" onClick={onSubmit} disabled={submitButtonState.disabled}>
        {submitButtonState.text}
      </Button>
    </Modal>
  );
}
