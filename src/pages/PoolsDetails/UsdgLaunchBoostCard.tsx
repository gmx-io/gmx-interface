import { Trans } from "@lingui/macro";

import { USDG_LAUNCH_BOOST_DOCS_URL } from "config/links";
import { UsdgLaunchBoost, getIsUsdgLaunchBoostIncluded } from "domain/synthetics/usdgLaunchBoost/utils";

import { formatUsdgLaunchBoostValue } from "components/AprInfo/UsdgLaunchBoostAprInfo";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";

import SparkleIcon from "img/sparkle.svg?react";

export function UsdgLaunchBoostCard({ launchBoost, className }: { launchBoost: UsdgLaunchBoost; className?: string }) {
  if (!getIsUsdgLaunchBoostIncluded(launchBoost)) {
    return null;
  }

  const tokenSymbol = launchBoost.isGlv ? "GLV" : "GM";
  const boostValue = formatUsdgLaunchBoostValue(launchBoost);

  return (
    <ColorfulBanner className={className} color="blue" icon={SparkleIcon}>
      <Trans>
        Launch boost · {boostValue} APR · Paid into {tokenSymbol} price every 4h, nothing to claim.{" "}
        <ExternalLink href={USDG_LAUNCH_BOOST_DOCS_URL}>Read more</ExternalLink>
      </Trans>
    </ColorfulBanner>
  );
}
