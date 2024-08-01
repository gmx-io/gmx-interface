import { t, Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Tooltip from "components/Tooltip/Tooltip";

export function HighPriceImpactRow({
  isHighPriceImpactAccepted,
  setIsHighPriceImpactAccepted,
  isSingle,
}: {
  isHighPriceImpactAccepted: boolean;
  setIsHighPriceImpactAccepted: (val: boolean) => void;
  isSingle: boolean;
}) {
  return (
    <ExchangeInfo.Group>
      <Checkbox
        className="GmSwapBox-warning"
        asRow
        isChecked={isHighPriceImpactAccepted}
        setIsChecked={setIsHighPriceImpactAccepted}
      >
        {isSingle ? (
          <Tooltip
            className="warning-tooltip"
            handle={<Trans>Acknowledge high Price Impact</Trans>}
            position="top-start"
            renderContent={() => (
              <div>{t`Consider selecting and using the "Pair" option to reduce the Price Impact.`}</div>
            )}
          />
        ) : (
          <span className="muted text-14 text-yellow-500">
            <Trans>Acknowledge high Price Impact</Trans>
          </span>
        )}
      </Checkbox>
    </ExchangeInfo.Group>
  );
}
