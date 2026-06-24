import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function BotanixShutdownBanner() {
  return (
    <div className="w-full max-md:px-8 md:pb-8" data-qa="botanix-shutdown-banner">
      <AlertInfoCard type="error" hideClose>
        <Trans>
          Botanix is shutting down. Do not open new positions. Close existing positions and withdraw funds from Botanix.
        </Trans>
      </AlertInfoCard>
    </div>
  );
}
