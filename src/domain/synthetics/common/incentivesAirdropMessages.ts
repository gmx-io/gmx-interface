import { t } from "@lingui/macro";

export const INCENTIVE_TYPE_MAP = {
  1001: t`GM Airdrop`,
  1002: t`GLP to GM Airdrop`,
  1003: t`TRADING Airdrop`,
  1004: t`STIP.b LP incentives`,
  1005: t`STIP.b Trading Incentives`,
  1006: t`STIP.b Retroactive Bonus`,
  1100: t`Avalanche LP Incentives`,
  1101: t`Avalanche Trading Incentives`,
  1200: t`tBTC LP Incentives`,
};

export const INCENTIVE_TOOLTIP_MAP = {
  2001: { link: "/competitions/march_13-20_2024", text: t`EIP-4844, 13-20 Mar` },
  2002: { link: "/competitions/march_20-27_2024", text: t`EIP-4844, 20-27 Mar` },
};
