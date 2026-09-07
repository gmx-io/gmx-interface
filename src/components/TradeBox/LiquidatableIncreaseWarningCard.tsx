import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { LiquidatableIncreaseMessage } from "components/MarginRemediation/MarginRemediationActions";

export function LiquidatableIncreaseWarningCard({ positionKey }: { positionKey: string | undefined }) {
  return (
    <AlertInfoCard type="warning" hideClose>
      <LiquidatableIncreaseMessage positionKey={positionKey} />
    </AlertInfoCard>
  );
}
