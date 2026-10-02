import { Trans } from "@lingui/macro";

import { PAXOS_SIGNUP_URL } from "config/links";

import ExternalLink from "components/ExternalLink/ExternalLink";

export function PaxosMintNote() {
  return (
    <ExternalLink
      href={PAXOS_SIGNUP_URL}
      variant="icon"
      className="text-body-small self-start font-medium text-typography-secondary"
    >
      <Trans>Business? Mint USDG 1:1 with Paxos</Trans>
    </ExternalLink>
  );
}
