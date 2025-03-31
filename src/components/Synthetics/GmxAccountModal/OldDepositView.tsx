import { t } from "@lingui/macro";
import { BiChevronRight } from "react-icons/bi";

import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { formatUsd } from "lib/numbers";
import { SONIC_MAINNET } from "sdk/configs/chains";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";



import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

// Dev: left this in case manager wants to use it again

export const DepositView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex grow flex-col overflow-y-hidden p-16">
      <div className="pb-16">
        <BuyInputSection
          topLeftLabel={t`Deposit`}
          bottomLeftValue={formatUsd(100n * 10n ** 30n)}
          bottomRightValue="10.000 SOL"
          maxButtonPosition="bottom-right"
          onClickMax={() => {
            console.log("clicked max");
          }}
        >
          <div className="flex cursor-pointer items-center" onClick={() => setIsVisibleOrView("selectAssetToDeposit")}>
            <TokenIcon symbol="SOL" displaySize={20} importSize={40} chainIdBadge={SONIC_MAINNET} />
            <div className="ml-4">SOL</div>
            <BiChevronRight />
          </div>
        </BuyInputSection>
      </div>

      <div className="flex flex-col gap-14 pt-4">
        <Button variant="primary" className="w-full">
          Deposit 9.98 USDC
        </Button>

        <div className="h-1 bg-stroke-primary" />

        <SyntheticsInfoRow label="GMX Balance" value={<ValueTransition from="$1,277.50" to="$1,267.48" />} />
        <SyntheticsInfoRow label="Asset Balance" value={<ValueTransition from="1,277.50 USDC" to="1,267.48 USDC" />} />
      </div>
    </div>
  );
};
