import { Trans } from "@lingui/macro";
import cx from "classnames";
import type { SVGProps } from "react";

import { UsdgLaunchBoost, getIsUsdgLaunchBoostIncluded } from "domain/synthetics/usdgLaunchBoost/utils";

import {
  UsdgLaunchBoostProgramNote,
  UsdgLaunchBoostStatusNote,
  formatUsdgLaunchBoostValue,
} from "components/AprInfo/UsdgLaunchBoostAprInfo";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import SparkleIcon from "img/sparkle.svg?react";

function GreySparkleIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return <SparkleIcon className={cx(className, "opacity-50 grayscale")} {...props} />;
}

export function UsdgLaunchBoostCard({ launchBoost, className }: { launchBoost: UsdgLaunchBoost; className?: string }) {
  const tokenSymbol = launchBoost.isGlv ? "GLV" : "GM";
  const isBoostIncluded = getIsUsdgLaunchBoostIncluded(launchBoost);
  const icon = isBoostIncluded ? SparkleIcon : GreySparkleIcon;

  const boostValue = formatUsdgLaunchBoostValue(launchBoost);
  const value = isBoostIncluded ? <Trans>{boostValue} APR</Trans> : boostValue;

  return (
    <ColorfulBanner className={className} color="blue" icon={icon}>
      <div className="flex justify-between gap-8 font-medium">
        <Trans>Launch boost</Trans>
        <span className="numbers">{value}</span>
      </div>
      <div>
        <UsdgLaunchBoostStatusNote launchBoost={launchBoost} />{" "}
        {isBoostIncluded && (
          <Trans>
            Paid into the {tokenSymbol} price every 4 hours. Nothing to claim. Already included in the APY above.
          </Trans>
        )}
      </div>
      <div>
        <UsdgLaunchBoostProgramNote />
      </div>
    </ColorfulBanner>
  );
}
