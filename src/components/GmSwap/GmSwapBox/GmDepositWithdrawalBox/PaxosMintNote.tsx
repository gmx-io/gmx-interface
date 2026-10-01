import { Trans } from "@lingui/macro";

import { PAXOS_CONVERT_DOCS_URL, PAXOS_SIGNUP_URL } from "config/links";

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";

import InfoIcon from "img/ic_info.svg?react";

export function PaxosMintNote() {
  return (
    <ColorfulBanner color="blue" icon={InfoIcon}>
      <div className="font-medium">
        <Trans>For businesses: mint USDG with Paxos</Trans>
      </div>
      <Trans>
        Paxos, the issuer of USDG, mints it 1:1 from USD with no minting fee. Requires business verification with Paxos.
      </Trans>
      <div className="flex gap-12">
        <ColorfulButtonLink color="blue" to={PAXOS_SIGNUP_URL} newTab>
          <Trans>Apply with Paxos</Trans>
        </ColorfulButtonLink>
        <ColorfulButtonLink color="blue" to={PAXOS_CONVERT_DOCS_URL} newTab>
          <Trans>How it works</Trans>
        </ColorfulButtonLink>
      </div>
    </ColorfulBanner>
  );
}
