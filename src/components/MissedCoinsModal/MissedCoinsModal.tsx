import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  selectAccountStats,
  selectLastMonthAccountStats,
  selectMissedCoinsModalPlace,
  selectSetMissedCoinsModalPlace,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { COIN_REGEXP } from "domain/synthetics/userFeedback";
import { sendMissedCoinsFeedback } from "domain/synthetics/userFeedback/requests";
import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { Textarea } from "components/Textarea/Textarea";

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
  const coins = coinsInputText.trim().toUpperCase().split(/,|\W/).filter(Boolean);

  const onSubmit = useCallback(() => {
    if (!missedCoinsModalPlace) {
      helperToast.error(t`Error submitting coins`);
      return;
    }

    sendMissedCoinsFeedback({
      place: missedCoinsModalPlace,
      coins,
      totalVolume: accountStats?.volume,
      monthVolume: lastMonthAccountStats?.volume,
    });

    setIsVisible(false);
  }, [accountStats?.volume, coins, lastMonthAccountStats?.volume, missedCoinsModalPlace, setIsVisible]);

  const error = useMemo(() => {
    if (coinsInputText.trim().length === 0) {
      return t`Enter a value`;
    }

    if (coinsInputText.length > 110) {
      return t`Max 110 symbols exceeded`;
    }

    if (coins.length > 10) {
      return t`Enter up to 10 coins`;
    }

    if (coins.some((coin) => coin.length > 10)) {
      return t`Max 10 symbols in name`;
    }

    if (coins.some((coin) => coin.length === 0 || !coin.match(COIN_REGEXP))) {
      return t`Enter a valid coin names`;
    }

    const { isUnique } = coins.reduce(
      ({ cache, isUnique }, coin) => {
        return !isUnique || cache[coin]
          ? { cache, isUnique: false }
          : { cache: { ...cache, [coin]: coin }, isUnique: true };
      },
      { cache: {}, isUnique: true } as { cache: any; isUnique: boolean }
    );

    if (!isUnique) {
      return t`Enter unique coins`;
    }
  }, [coins, coinsInputText]);

  const submitButtonState = useMemo(() => {
    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: t`Submit`,
      disabled: false,
    };
  }, [error]);

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
          onChange={setCoinsInputText}
          placeholder={t`Names could be separated by commas or spaces`}
        />
      </div>
      <Button variant="primary-action" className="mt-4 w-full" onClick={onSubmit} disabled={submitButtonState.disabled}>
        {submitButtonState.text}
      </Button>
    </Modal>
  );
}
