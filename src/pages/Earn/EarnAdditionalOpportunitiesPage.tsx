import { Trans } from "@lingui/macro";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import EarnPageLayout from "./EarnPageLayout";

export default function EarnAdditionalOpportunitiesPage() {
  return (
    <EarnPageLayout>
      <ColorfulBanner>
        <Trans>
          Maximize your earnings on your ecosystem tokens (GMX, GLV and GM) with the following integrated partner
          protocols.
        </Trans>
      </ColorfulBanner>
    </EarnPageLayout>
  );
}
