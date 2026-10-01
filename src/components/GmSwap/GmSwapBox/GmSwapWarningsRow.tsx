import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { GMX_PARTNER_TELEGRAM_URL } from "config/links";
import { ARBITRUM_USDG_GLV_ADDRESS } from "config/usdgPools";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";

import InfoIcon from "img/ic_info.svg?react";

export function GmSwapWarningsRow({
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  bannerErrorContent,
  shouldShowAvalancheGmxAccountWarning,
  shouldShowBuyUsdgHint,
  shouldShowWhitelistOnlyHint,
  gasPaymentTokenWarningContent,
  isSubmitDisabled,
}: {
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  bannerErrorContent?: ReactNode;
  shouldShowAvalancheGmxAccountWarning?: boolean;
  shouldShowBuyUsdgHint?: boolean;
  shouldShowWhitelistOnlyHint?: boolean;
  gasPaymentTokenWarningContent?: string;
  isSubmitDisabled?: boolean;
}) {
  const warnings: ReactNode[] = [];

  if (shouldShowAvalancheGmxAccountWarning) {
    warnings.push(
      <AlertInfoCard type="error" key="avalancheGmxAccountWarning" hideClose>
        <Trans>
          GMX Account support on Avalanche is ending. New positions and additional deposits are unavailable. Switch to
          Arbitrum as a settlement network.
        </Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForPosition) {
    warnings.push(
      <AlertInfoCard type="warning" key="swapBoxHighPriceImpactWarning" hideClose>
        <Trans>High price impact</Trans>
      </AlertInfoCard>
    );
  }

  if (shouldShowWarningForExecutionFee) {
    warnings.push(
      <AlertInfoCard type="warning" key="swapBoxHighNetworkFeeWarning" hideClose>
        <Trans>High network fees</Trans>
      </AlertInfoCard>
    );
  }

  if (bannerErrorContent) {
    warnings.push(
      <AlertInfoCard type="error" key="bannerErrorContent" hideClose>
        {bannerErrorContent}
      </AlertInfoCard>
    );
  }

  if (gasPaymentTokenWarningContent && !isSubmitDisabled && !bannerErrorContent) {
    warnings.push(
      <AlertInfoCard type="warning" key="gasPaymentTokenWarningContent" hideClose>
        {gasPaymentTokenWarningContent}
      </AlertInfoCard>
    );
  }

  if (shouldShowWhitelistOnlyHint) {
    warnings.push(
      <ColorfulBanner color="blue" icon={InfoIcon} key="whitelistOnlyHint">
        <Trans>
          Direct deposits into this pool are open to whitelisted addresses. GLV [USDG] gives you the same markets in one
          deposit. To get whitelisted, message <ExternalLink href={GMX_PARTNER_TELEGRAM_URL}>@GMXPartners</ExternalLink>{" "}
          on Telegram and mention "USDG whitelist".
        </Trans>
        <ColorfulButtonLink color="blue" to={`/pools/details?market=${ARBITRUM_USDG_GLV_ADDRESS}`}>
          <Trans>Buy GLV [USDG]</Trans>
        </ColorfulButtonLink>
      </ColorfulBanner>
    );
  }

  if (shouldShowBuyUsdgHint) {
    warnings.push(
      <ColorfulBanner color="blue" icon={InfoIcon} key="buyUsdgHint">
        <Trans>You need USDC or USDG to buy.</Trans>
        <ColorfulButtonLink color="blue" to="/trade/swap?to=USDG">
          <Trans>Buy USDG</Trans>
        </ColorfulButtonLink>
      </ColorfulBanner>
    );
  }

  if (!shouldShowWarning && warnings.length === 0) {
    return null;
  }

  return <div className="flex flex-col gap-14">{warnings}</div>;
}
