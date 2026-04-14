import { t } from "@lingui/macro";
import { useMedia } from "react-use";

import type { Token } from "sdk/utils/tokens/types";

import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileButton,
  SelectorBaseMobileList,
  useSelectorClose,
} from "components/SelectorBase/SelectorBase";
import { TableTd } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";

export function ClaimSwapTargetTokenSelector({
  options,
  value,
  onSelect,
}: {
  options: Token[];
  value: string | undefined;
  onSelect: (tokenAddress: string) => void;
}) {
  const selectedOption = options.find((option) => option.address === value);
  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);

  if (!selectedOption) {
    return <>-</>;
  }

  return (
    <SelectorBase
      label={
        <div className="flex items-center gap-4">
          <TokenIcon symbol={selectedOption.symbol} displaySize={18} />
          <span>{selectedOption.symbol}</span>
        </div>
      }
      modalLabel={t`Swap to`}
      qa="claim-swap-target-token-selector"
    >
      {isMobile ? (
        <ClaimSwapTargetTokenSelectorMobile options={options} onSelect={onSelect} />
      ) : (
        <ClaimSwapTargetTokenSelectorDesktop options={options} onSelect={onSelect} />
      )}
    </SelectorBase>
  );
}

function ClaimSwapTargetTokenSelectorDesktop({
  options,
  onSelect,
}: {
  options: Token[];
  onSelect: (tokenAddress: string) => void;
}) {
  const close = useSelectorClose();

  return (
    <table className="w-full">
      <tbody>
        {options.map((option) => (
          <SelectorBaseDesktopRow
            key={option.address}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onSelect(option.address);
              close();
            }}
          >
            <TableTd padding="compact-one-column">
              <div className="flex items-center gap-8">
                <TokenIcon symbol={option.symbol} displaySize={18} />
                <div>{option.symbol}</div>
              </div>
            </TableTd>
          </SelectorBaseDesktopRow>
        ))}
      </tbody>
    </table>
  );
}

function ClaimSwapTargetTokenSelectorMobile({
  options,
  onSelect,
}: {
  options: Token[];
  onSelect: (tokenAddress: string) => void;
}) {
  const close = useSelectorClose();

  return (
    <SelectorBaseMobileList>
      {options.map((option) => (
        <SelectorBaseMobileButton
          key={option.address}
          onSelect={() => {
            onSelect(option.address);
            close();
          }}
        >
          <div className="flex items-center gap-8">
            <TokenIcon symbol={option.symbol} displaySize={18} />
            <div>{option.symbol}</div>
          </div>
        </SelectorBaseMobileButton>
      ))}
    </SelectorBaseMobileList>
  );
}
