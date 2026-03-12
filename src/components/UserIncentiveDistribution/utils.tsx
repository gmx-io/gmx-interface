import { t } from "@lingui/macro";

import {
  GLP_DISTRIBUTION_ID,
  GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID,
  GLV_BONUS_INCENTIVE_DISTRIBUTION_ID,
  GLP_DISTRIBUTION_TEST_ID,
} from "domain/synthetics/claims/constants";

export const getDistributionTitle = (distributionId: string) => {
  switch (distributionId) {
    case GLP_DISTRIBUTION_TEST_ID.toString():
      return t`GLP reimbursement (test)`;
    case GLP_DISTRIBUTION_ID.toString():
      return t`GLP reimbursement`;
    case GLV_BONUS_INCENTIVE_DISTRIBUTION_ID.toString():
      return t`GLV bonus incentive`;
    case GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID.toString():
      return t`GLV bonus incentive (test)`;
  }
};
