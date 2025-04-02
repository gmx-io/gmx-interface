import { Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BASE_MAINNET, getChainName } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { MULTI_CHAIN_SUPPORTED_TOKEN_MAP } from "context/GmxAccountContext/config";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { TokenData, convertToUsd } from "domain/tokens";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";

import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import {
  useGmxAccountTokensData,
  useGmxAccountWithdrawNetworks,
  useMultichainTokens,
} from "components/Synthetics/GmxAccountModal/hooks";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { Selector } from "./Selector";

export const WithdrawView = () => {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [inputValue, setInputValue] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<number>(BASE_MAINNET);

  useEffect(() => {
    const sourceChains = Object.keys(MULTI_CHAIN_SUPPORTED_TOKEN_MAP[settlementChainId] || {}).map(Number);

    if (sourceChains.length === 0) {
      return;
    }

    if (sourceChains.includes(selectedNetwork)) {
      return;
    }

    setSelectedNetwork(sourceChains[0]);
  }, [settlementChainId, selectedNetwork]);

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);

  const gmxAccountTokensData = useGmxAccountTokensData();

  const networks = useGmxAccountWithdrawNetworks();

  const multichainTokens = useMultichainTokens();

  const selectedToken = useMemo(() => {
    return getByKey(gmxAccountTokensData, selectedTokenAddress);
  }, [selectedTokenAddress, gmxAccountTokensData]);

  const amount = selectedToken ? parseValue(inputValue, selectedToken.decimals) : undefined;
  const amountUsd = selectedToken
    ? convertToUsd(amount, selectedToken.decimals, selectedToken.prices.maxPrice)
    : undefined;

  const options = useMemo(() => {
    return Object.values(gmxAccountTokensData);
  }, [gmxAccountTokensData]);

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedToken.balance === undefined || selectedToken.balance === 0n) {
      return;
    }

    setInputValue(formatAmountFree(selectedToken.balance, selectedToken.decimals));
  }, [selectedToken]);

  const gmxAccountTokenBalanceUsd = convertToUsd(
    selectedToken?.balance,
    selectedToken?.decimals,
    selectedToken?.prices.maxPrice
  );

  const sourceChainSelectedToken = useMemo(() => {
    const sourceChainToken = multichainTokens.find(
      (token) => token.address === selectedToken?.address && token.sourceChainId === selectedNetwork
    );

    return sourceChainToken;
  }, [multichainTokens, selectedNetwork, selectedToken?.address]);

  const sourceChainTokenBalanceUsd = useMemo(() => {
    if (sourceChainSelectedToken === undefined) {
      return 0n;
    }

    return convertToUsd(
      sourceChainSelectedToken.sourceChainBalance,
      sourceChainSelectedToken.sourceChainDecimals,
      sourceChainSelectedToken.sourceChainPrices?.maxPrice
    );
  }, [sourceChainSelectedToken]);

  const { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd } = useMemo(() => {
    if (selectedToken === undefined || amount === undefined || amountUsd === undefined) {
      return { nextGmxAccountBalanceUsd: undefined, nextSourceChainBalanceUsd: undefined };
    }

    const nextGmxAccountBalanceUsd = (gmxAccountTokenBalanceUsd ?? 0n) - (amountUsd ?? 0n);
    const nextSourceChainBalanceUsd = (sourceChainTokenBalanceUsd ?? 0n) + (amountUsd ?? 0n);

    return { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd };
  }, [selectedToken, amount, amountUsd, gmxAccountTokenBalanceUsd, sourceChainTokenBalanceUsd]);

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
        <div className="text-body-small flex items-center justify-between text-slate-100">
          <Trans>Withdraw</Trans>
          {selectedToken !== undefined && selectedToken.balance !== undefined && selectedToken !== undefined && (
            <div>
              <Trans>Available:</Trans>{" "}
              {formatBalanceAmount(selectedToken.balance, selectedToken.decimals, selectedToken.symbol)}
            </div>
          )}
        </div>
        <div className="text-body-large relative">
          <NumberInput
            value={inputValue}
            onValueChange={(e) => setInputValue(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72"
            placeholder={`0.0 ${selectedToken?.symbol || ""}`}
          />
          {inputValue !== "" && (
            <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
              <div className="invisible whitespace-pre font-[RelativeNumber]">{inputValue} </div>
              <div className="text-slate-100">{selectedToken?.symbol || ""}</div>
            </div>
          )}
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={handleMaxButtonClick}
          >
            MAX
          </button>
        </div>
        <div className="text-body-small text-slate-100">{formatUsd(amountUsd ?? 0n)}</div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Withdraw Fee" value="$0.22" />
        <SyntheticsInfoRow
          label="GMX Balance"
          value={
            <ValueTransition from={formatUsd(gmxAccountTokenBalanceUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />
          }
        />
        <SyntheticsInfoRow
          label="Asset Balance"
          value={
            <ValueTransition from={formatUsd(sourceChainTokenBalanceUsd)} to={formatUsd(nextSourceChainBalanceUsd)} />
          }
        />
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
