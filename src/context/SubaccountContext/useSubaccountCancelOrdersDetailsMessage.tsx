import { Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { selectSetIsSettingsVisible } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectRawSubaccount } from "context/SyntheticsStateContext/selectors/subaccountSelectors";
import { useSyntheticsStateSelector as useSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { getRemainingSubaccountActions } from "domain/synthetics/gassless/txns/subaccountUtils";

export function useSubaccountCancelOrdersDetailsMessage(actionCount: number) {
  const subaccount = useSelector(selectRawSubaccount);
  const setIsSettingsVisible = useSelector(selectSetIsSettingsVisible);

  const isLastAction = subaccount && getRemainingSubaccountActions(subaccount) === BigInt(actionCount);

  const handleOpenSubaccountModal = useCallback(() => {
    setIsSettingsVisible(true);
  }, [setIsSettingsVisible]);

  return useMemo(() => {
    if (isLastAction) {
      return (
        <Trans>
          Max Action Count Reached.{" "}
          <span onClick={handleOpenSubaccountModal} className="link-underline">
            Click here
          </span>{" "}
          to update.
        </Trans>
      );
    }

    return null;
  }, [isLastAction, handleOpenSubaccountModal]);
}
