import { t } from "@lingui/macro";

import { getDistributionTitle } from "components/UserIncentiveDistribution/utils";

import {
  GLP_DISTRIBUTION_ID,
  GLP_DISTRIBUTION_TEST_ID,
  GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID,
  GLV_BONUS_INCENTIVE_DISTRIBUTION_ID,
} from "../claims/constants";

export const INCENTIVE_TYPE_MAP = {
  1001: t`GM airdrop`,
  1002: t`GLP to GM airdrop`,
  1003: t`Trading airdrop`,
  1004: t`STIP.b LP incentives`,
  1005: t`STIP.b trading incentives`,
  1006: t`STIP.b retroactive bonus`,
  1100: t`Avalanche LP incentives`,
  1101: t`Avalanche trading incentives`,
  1200: t`tBTC LP incentives`,
  [GLV_BONUS_INCENTIVE_DISTRIBUTION_ID.toString()]: getDistributionTitle(
    GLV_BONUS_INCENTIVE_DISTRIBUTION_ID.toString()
  ),
  [GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID.toString()]: getDistributionTitle(
    GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID.toString()
  ),
  [GLP_DISTRIBUTION_ID.toString()]: getDistributionTitle(GLP_DISTRIBUTION_ID.toString()),
  [GLP_DISTRIBUTION_TEST_ID.toString()]: getDistributionTitle(GLP_DISTRIBUTION_TEST_ID.toString()),
};

export const INCENTIVE_TOOLTIP_MAP = {
  2001: { link: "/competitions/march_13-20_2024", text: t`EIP-4844, 13-20 Mar` },
  2002: { link: "/competitions/march_20-27_2024", text: t`EIP-4844, 20-27 Mar` },
};
