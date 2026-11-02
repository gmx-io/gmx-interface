import { Trans } from "@lingui/macro";
import { useEffect } from "react";

import { selectChainId, selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectPositionEditorAddMarginReturnPositionKey,
  selectPositionEditorOpenDepositNow,
  selectPositionEditorSetAddMarginReturnPositionKey,
} from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getAddMarginPositionLabel } from "domain/synthetics/usdgPools/addMarginReturn";
import { usePrevious } from "lib/usePrevious";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

export function UsdgAddMarginReturnBanner({ isSwap }: { isSwap: boolean }) {
  const chainId = useSelector(selectChainId);
  const positionKey = useSelector(selectPositionEditorAddMarginReturnPositionKey);
  const setPositionKey = useSelector(selectPositionEditorSetAddMarginReturnPositionKey);
  const openDepositNow = useSelector(selectPositionEditorOpenDepositNow);
  const position = useSelector((s) => (positionKey ? selectPositionsInfoData(s)?.[positionKey] : undefined));
  const prevIsSwap = usePrevious(isSwap);

  useEffect(
    // leaving the Swap tab ends the trip, so a later conversion isn't tagged as this top-up
    function clearOnLeavingSwap() {
      if (prevIsSwap && !isSwap && positionKey !== undefined) {
        setPositionKey(undefined);
      }
    },
    [isSwap, positionKey, prevIsSwap, setPositionKey]
  );

  if (!isSwap || positionKey === undefined || !position) {
    return null;
  }

  const collateralSymbol = position.collateralToken.symbol;
  const positionLabel = getAddMarginPositionLabel(chainId, positionKey);

  return (
    <AlertInfoCard type="info" onClose={() => setPositionKey(undefined)}>
      <Trans>
        Getting {collateralSymbol} to add margin to {positionLabel}.
      </Trans>{" "}
      <EmbeddedActionButton
        onClick={() => {
          setPositionKey(undefined);
          openDepositNow(positionKey);
        }}
      >
        <Trans>Back to position</Trans>
      </EmbeddedActionButton>
    </AlertInfoCard>
  );
}
