import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

export function TransitApprovalProposalAlert({ onProposeNewApproval }: { onProposeNewApproval: () => void }) {
  return (
    <AlertInfoCard type="info" hideClose>
      <div className="flex flex-col gap-6">
        <span>
          <Trans>
            An approval is already waiting in your wallet. Convert waits for it and does not propose a new one.
          </Trans>
        </span>
        <EmbeddedActionButton onClick={onProposeNewApproval}>
          <Trans>Propose a new approval</Trans>
        </EmbeddedActionButton>
      </div>
    </AlertInfoCard>
  );
}
