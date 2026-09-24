import Checkbox from '@/components/Common/CheckBox/CheckBox';
import { BN_10, ONE_USD } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { Trans } from '@lingui/macro';
import { useState } from 'react';

export function useHighExecutionFeeConsent(executionFeeUsd: BN | undefined) {
  const [isHighExecutionFeeAccepted, setIsHighExecutionFeeAccepted] =
    useState(false);
  const veryHighExecutionFeeUsd = BN_10.mul(ONE_USD);
  const shouldAccept =
    executionFeeUsd === undefined
      ? undefined
      : executionFeeUsd.gte(veryHighExecutionFeeUsd);

  return {
    isHighFeeConsentError: shouldAccept && !isHighExecutionFeeAccepted,
    element: shouldAccept ? (
      <div>
        <Checkbox
          asRow
          isChecked={isHighExecutionFeeAccepted}
          setIsChecked={setIsHighExecutionFeeAccepted}
        >
          <span className="text-14 text-yellow-500">
            <Trans>Acknowledge very high network Fees</Trans>
          </span>
        </Checkbox>
      </div>
    ) : null,
  };
}
