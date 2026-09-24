import { ExchangeInfo } from '@/components/Exchange/ExchangeInfo';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { ExpandableRow } from '@/components/TradeBox/TradeBoxRows/ExpandableRow';
import { ValueTransition } from '@/components/Common/ValueTransition/ValueTransition';
import { BN_ZERO } from '@/config/constants';
import { selectPositionEditorEditingPosition } from '@/selectors/positionEditor/selectPositionEditorEditingPosition';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { formatLeverage, formatUsd } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useState } from 'react';

import { usePositionEditorData } from './hooks/usePositionEditorData';
import { Options } from './hooks/usePositionEditorFees';
import { getByKey } from '@/utils/lib/object';
import { parseValue } from '@/utils/legacy/parse';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { selectTradeboxAdvancedOptions } from '@/selectors/tradebox/baseSelectors';

export function PositionEditorAdvancedRows({
  selectedCollateralAddress,
  collateralInputValue,
  operation,
}: Options) {
  const tokensData = useAppStore(selectTokensData);
  const position = useAppStore(selectPositionEditorEditingPosition);
  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const collateralPrice = collateralToken?.prices.minPrice;

  const collateralDeltaAmount = parseValue(
    collateralInputValue || '0',
    collateralToken?.decimals || 0
  );
  const collateralDeltaUsd = convertTokenAmountToUsd(
    collateralDeltaAmount ?? BN_ZERO,
    collateralToken?.decimals,
    collateralPrice
  );

  const { nextCollateralUsd, nextLeverage } = usePositionEditorData({
    selectedCollateralAddress,
    collateralInputValue,
    operation,
  });

  const { advancedDisplay } = useAppStore(selectTradeboxAdvancedOptions);
  const [open, setOpen] = useState(advancedDisplay);

  if (!position || collateralDeltaUsd === undefined) {
    return null;
  }

  return (
    <ExpandableRow
      className="-my-15"
      title={t`Advanced display`}
      open={open}
      onToggle={setOpen}
    >
      <ExchangeInfo.Group>
        <ExchangeInfoRow
          label={t`Leverage`}
          value={
            <ValueTransition
              from={formatLeverage(position?.leverage)}
              to={formatLeverage(nextLeverage)}
            />
          }
        />
        <ExchangeInfoRow
          label={t`Size`}
          value={formatUsd(position.sizeInUsd)}
        />
        <div className="Exchange-info-row">
          <div>
            <Tooltip
              handle={
                <span className="Exchange-info-label">
                  <Trans>
                    Collateral ({position?.collateralToken?.symbol})
                  </Trans>
                </span>
              }
              position="top-start"
              renderContent={() => {
                return (
                  <Trans>
                    Initial Collateral (Collateral excluding Borrow and Funding
                    Fee).
                  </Trans>
                );
              }}
            />
          </div>
          <div className="align-right">
            <ValueTransition
              from={formatUsd(position?.collateralUsd)}
              to={
                collateralDeltaUsd !== undefined &&
                collateralDeltaUsd.gt(BN_ZERO)
                  ? formatUsd(nextCollateralUsd)
                  : undefined
              }
            />
          </div>
        </div>
      </ExchangeInfo.Group>
    </ExpandableRow>
  );
}
