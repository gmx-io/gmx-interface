import noop from "lodash/noop";
import { useMemo, useState } from "react";

import { BASE_MAINNET, getChainName } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { TokenData } from "domain/tokens";
import { getByKey } from "lib/objects";

import Button from "components/Button/Button";
import { useGmxAccountTokensData, useGmxAccountWithdrawNetworks } from "components/Synthetics/GmxAccountModal/hooks";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";


import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { Selector } from "./Selector";


export const WithdrawView = () => {
  const [amount, setAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<number>(BASE_MAINNET);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);

  const gmxAccountTokensData = useGmxAccountTokensData();

  const networks = useGmxAccountWithdrawNetworks();

  const selectedToken = useMemo(() => {
    return getByKey(gmxAccountTokensData, selectedTokenAddress);
  }, [selectedTokenAddress, gmxAccountTokensData]);

  const options = useMemo(() => {
    return Object.values(gmxAccountTokensData);
  }, [gmxAccountTokensData]);

  return (
    <div className=" grow  overflow-y-auto p-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">Asset</div>
          <Selector
            value={selectedTokenAddress}
            onChange={setSelectedTokenAddress}
            placeholder="Select token"
            button={
              selectedTokenAddress && selectedToken ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} importSize={40} />
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : undefined
            }
            options={options}
            item={WithdrawAssetItem}
            itemKey={withdrawAssetItemKey}
          />
        </div>

        {/* Network selector */}
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">To Network</div>
          <Selector
            value={selectedNetwork}
            onChange={(value) => setSelectedNetwork(value)}
            placeholder="Select network"
            button={
              <div className="flex items-center gap-8">
                <img
                  src={CHAIN_ID_TO_NETWORK_ICON[selectedNetwork]}
                  alt={getChainName(selectedNetwork)}
                  className="size-20"
                />
                <span className="text-body-large">{getChainName(selectedNetwork)}</span>
              </div>
            }
            options={networks}
            item={NetworkItem}
            itemKey={networkItemKey}
          />
        </div>
      </div>

      <div className="h-20" />

      <div className="flex flex-col gap-4">
        <div className="text-body-small text-slate-100">Withdraw</div>
        <div className="text-body-large relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72 text-white placeholder-slate-100"
            placeholder={`0.0 ${selectedToken?.symbol || ""}`}
          />
          {amount !== "" && (
            <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
              <div className="invisible whitespace-pre font-[RelativeNumber]">{amount} </div>
              <div className="text-slate-100">{selectedToken?.symbol || ""}</div>
            </div>
          )}
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={noop}
          >
            MAX
          </button>
        </div>
        <div className="text-body-small text-slate-100">$10.00</div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Withdraw Fee" value="$0.22" />
        <SyntheticsInfoRow label="GMX Balance" value={<ValueTransition from="$1,277.50" to="$1,267.48" />} />
        <SyntheticsInfoRow label="Asset Balance" value={<ValueTransition from="1,277.50 USDC" to="1,267.48 USDC" />} />
      </div>

      <div className="h-16" />

      {/* Withdraw button */}
      <Button variant="primary" className="w-full">
        Withdraw
      </Button>
    </div>
  );
};

function networkItemKey(option: { id: number; name: string; fee: string }) {
  return option.id.toString();
}

function NetworkItem({ option }: { option: { id: number; name: string; fee: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={CHAIN_ID_TO_NETWORK_ICON[option.id]} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
      <span className="text-body-medium text-slate-100">{option.fee}</span>
    </div>
  );
}

function WithdrawAssetItem({ option }: { option: TokenData }) {
  return (
    <div className="flex items-center gap-8">
      <TokenIcon symbol={option.symbol} displaySize={20} importSize={40} />
      <span>
        {option.symbol} <span className="text-slate-100">{option.name}</span>
      </span>
    </div>
  );
}

function withdrawAssetItemKey(option: TokenData) {
  return option.address;
}
