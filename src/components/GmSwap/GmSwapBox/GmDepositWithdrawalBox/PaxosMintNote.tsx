import { Trans } from "@lingui/macro";
import cx from "classnames";

import { PAXOS_SIGNUP_URL } from "config/links";
import { useBreakpoints } from "lib/useBreakpoints";

import ExternalLink from "components/ExternalLink/ExternalLink";

export function PaxosMintNote() {
  const { isDesktop: isInCurtain } = useBreakpoints();

  return (
    <ExternalLink
      href={PAXOS_SIGNUP_URL}
      variant="icon"
      className={cx("text-body-small self-start font-medium text-typography-secondary", { "px-12": isInCurtain })}
    >
      <Trans>Business? Mint USDG 1:1 with Paxos</Trans>
    </ExternalLink>
  );
}
