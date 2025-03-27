import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { BASE_MAINNET } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import noop from "lodash/noop";
import { useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

export const DepositView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [amount, setAmount] = useState("0.0");

  return (
    <div className="flex grow flex-col overflow-y-hidden p-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">Asset</div>
          <div
            tabIndex={0}
            role="button"
            onClick={() => setIsVisibleOrView("selectAssetToDeposit")}
            className="flex items-center justify-between rounded-4 bg-cold-blue-900 px-14 py-12 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-700"
          >
            <div className="flex items-center gap-8">
              <TokenIcon symbol="USDC" displaySize={20} importSize={40} />
              <span className="text-body-large">USDC</span>
            </div>
            <BiChevronRight className="size-20 text-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-8 rounded-4 border border-cold-blue-900 px-14 py-12">
          <img src={CHAIN_ID_TO_NETWORK_ICON[BASE_MAINNET]} alt="Base" className="size-20" />
          <span className="text-body-large text-slate-100">Base</span>
        </div>
      </div>

      <div className="h-20" />

      <div className="flex flex-col gap-4">
        <div className="text-body-small text-slate-100">Deposit</div>
        <div className="text-body-large relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72 text-white"
          />
          <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
            <div className="invisible whitespace-pre font-[RelativeNumber]">
              {amount}
              {amount === "" ? "" : " "}
            </div>
            <div className="text-slate-100">USDC</div>
          </div>
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={noop}
          >
            MAX
          </button>
        </div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Deposit Fee" value="$0.22" />
        <SyntheticsInfoRow label="GMX Balance" value={<ValueTransition from="$9.41" to="$9.41" />} />
        <SyntheticsInfoRow label="Asset Balance" value={<ValueTransition from="0.00 USDC" to="9.41 USDC" />} />
      </div>

      {/* Deposit button */}
      <Button variant="primary" className="mt-auto w-full">
        Deposit
      </Button>
    </div>
  );
};
