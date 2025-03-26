// @ts-nocheck

import { t } from "@lingui/macro";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/GmxAccountContext";
import { formatUsd } from "lib/numbers";
import { BiChevronRight } from "react-icons/bi";
import { sonic } from "viem/chains";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

// Dev: left this in case manager wants to use it again

export const WithdrawView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex grow flex-col overflow-y-hidden p-16">
      <div className="pb-16">
        <BuyInputSection
          topLeftLabel={t`Withdraw`}
          bottomLeftValue={formatUsd(100n * 10n ** 30n)}
          bottomRightValue="10.000 SOL"
          maxButtonPosition="bottom-right"
          onClickMax={() => {
            console.log("clicked max");
          }}
          //   <button
          //   type="button"
          //   className="-my-4 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
          //   onClick={handleMaxClick}
          //   data-qa="input-max"
          // >
          //   <Trans>MAX</Trans>
          // </button>
          topRightValue={
            <button
              type="button"
              className="-my-4 flex items-center gap-4 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              onClick={() => {}}
              data-qa="input-max"
            >
              {/* chain icon with chain name */}
              <img
                src={CHAIN_ID_TO_NETWORK_ICON[sonic.id]}
                alt={CHAIN_ID_TO_EXPLORER_NAME[sonic.id]}
                className="size-16"
              />
              <div>{sonic.name}</div>
            </button>
          }
        >
          <div className="flex cursor-pointer items-center" onClick={() => setIsVisibleOrView("selectAssetToWithdraw")}>
            <TokenIcon symbol="SOL" displaySize={20} importSize={40} chainIdBadge={sonic.id} />
            <div className="ml-4">SOL</div>
            <BiChevronRight />
          </div>
        </BuyInputSection>
      </div>

      <div className="flex flex-col gap-14 pt-4">
        <Button variant="primary" className="w-full">
          Withdraw 9.98 USDC
        </Button>

        <div className="h-1 bg-stroke-primary" />

        <SyntheticsInfoRow label="GMX Balance" value={<ValueTransition from="$1,277.50" to="$1,267.48" />} />
        <SyntheticsInfoRow label="Asset Balance" value={<ValueTransition from="1,277.50 USDC" to="1,267.48 USDC" />} />
      </div>
    </div>
  );
};
