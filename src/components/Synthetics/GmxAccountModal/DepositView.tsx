import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BiChevronRight } from "react-icons/bi";
import Skeleton from "react-loading-skeleton";

import { getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { isSourceChain } from "context/GmxAccountContext/config";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountModalOpen,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { convertToUsd } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { useMultichainTokens } from "./hooks";

export const DepositView = () => {
  const { chainId: walletChainId } = useWallet();
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const [depositViewChain, setDepositViewChain] = useGmxAccountDepositViewChain();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [inputValue, setInputValue] = useState("0.0");
  const multichainTokens = useMultichainTokens();

  const selectedToken =
    depositViewTokenAddress !== undefined ? getToken(settlementChainId, depositViewTokenAddress) : undefined;

  const selectedTokenChainData = useMemo(() => {
    if (selectedToken === undefined) return undefined;
    return multichainTokens.find(
      (token) => token.address === selectedToken.address && token.sourceChainId === depositViewChain
    );
  }, [selectedToken, multichainTokens, depositViewChain]);

  const { selectedTokenSourceChainBalance, selectedTokenSourceChainBalanceUsd } = useMemo((): {
    selectedTokenSourceChainBalance?: bigint;
    selectedTokenSourceChainBalanceUsd?: bigint;
  } => {
    if (selectedToken === undefined) return EMPTY_OBJECT;

    if (selectedTokenChainData === undefined) return EMPTY_OBJECT;

    const balance = selectedTokenChainData.sourceChainBalance;
    const balanceUsd =
      convertToUsd(
        balance,
        selectedTokenChainData.sourceChainDecimals,
        selectedTokenChainData.sourceChainPrices?.maxPrice
      ) ?? 0n;
    return {
      selectedTokenSourceChainBalance: balance,
      selectedTokenSourceChainBalanceUsd: balanceUsd,
    };
  }, [selectedToken, selectedTokenChainData]);

  const { inputAmount, inputAmountUsd } = useMemo((): { inputAmount?: bigint; inputAmountUsd?: bigint } => {
    if (selectedToken === undefined) {
      return EMPTY_OBJECT;
    }

    const inputAmount = parseValue(inputValue, selectedToken.decimals);
    const inputAmountUsd = convertToUsd(
      inputAmount,
      selectedToken.decimals,
      selectedTokenChainData?.sourceChainPrices?.maxPrice
    );

    return { inputAmount, inputAmountUsd };
  }, [inputValue, selectedToken, selectedTokenChainData?.sourceChainPrices?.maxPrice]);

  const { nextGmxBalanceUsd, nextSourceChainBalanceUsd } = useMemo((): {
    nextGmxBalanceUsd?: bigint;
    nextSourceChainBalanceUsd?: bigint;
  } => {
    if (selectedToken === undefined || selectedTokenSourceChainBalanceUsd === undefined || inputAmountUsd === undefined)
      return EMPTY_OBJECT;

    const nextSourceChainBalanceUsd = selectedTokenSourceChainBalanceUsd - inputAmountUsd;
    const nextGmxBalanceUsd = 0n + inputAmountUsd;

    return {
      nextSourceChainBalanceUsd,
      nextGmxBalanceUsd,
    };
  }, [inputAmountUsd, selectedToken, selectedTokenSourceChainBalanceUsd]);

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedTokenSourceChainBalance === undefined) {
      return;
    }
    setInputValue(formatAmountFree(selectedTokenSourceChainBalance, selectedToken.decimals));
  }, [selectedToken, selectedTokenSourceChainBalance]);

  useEffect(() => {
    if (depositViewChain === undefined && walletChainId && isSourceChain(walletChainId)) {
      setDepositViewChain(walletChainId);
    }
  }, [depositViewChain, walletChainId, setDepositViewChain]);

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
              {selectedToken ? (
                <>
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} importSize={40} />
                  <span className="text-body-large">{selectedToken.symbol}</span>
                </>
              ) : (
                <>
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                </>
              )}
            </div>
            <BiChevronRight className="size-20 text-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-8 rounded-4 border border-cold-blue-900 px-14 py-12">
          {depositViewChain !== undefined ? (
            <>
              <img src={getChainIcon(depositViewChain)} alt={getChainName(depositViewChain)} className="size-20" />
              <span className="text-body-large text-slate-100">{getChainName(depositViewChain)}</span>
            </>
          ) : (
            <>
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={20} height={20} borderRadius={10} />
              <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
            </>
          )}
        </div>
      </div>

      <div className="h-20" />

      <div className="flex flex-col gap-4">
        <div className="text-body-small flex items-center justify-between gap-4 text-slate-100">
          <Trans>Deposit</Trans>
          {selectedTokenSourceChainBalance !== undefined && selectedToken !== undefined && (
            <div>
              <Trans>Available:</Trans>{" "}
              {formatBalanceAmount(selectedTokenSourceChainBalance, selectedToken.decimals, selectedToken.symbol)}
            </div>
          )}
        </div>
        <div className="text-body-large relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72 text-white"
          />
          <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
            <div className="invisible whitespace-pre font-[RelativeNumber]">
              {inputValue}
              {inputValue === "" ? "" : " "}
            </div>
            <div className="text-slate-100">{selectedToken?.symbol}</div>
          </div>
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={handleMaxButtonClick}
          >
            MAX
          </button>
        </div>
        <div className="text-body-small text-slate-100">{formatUsd(inputAmountUsd ?? 0n)}</div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Deposit Fee" value="$0.22" />
        <SyntheticsInfoRow
          label={t`GMX Balance`}
          value={<ValueTransition from={formatUsd(0n)} to={formatUsd(nextGmxBalanceUsd)} />}
        />
        <SyntheticsInfoRow
          label={t`Asset Balance`}
          value={
            <ValueTransition
              from={formatUsd(selectedTokenSourceChainBalanceUsd)}
              to={formatUsd(nextSourceChainBalanceUsd)}
            />
          }
        />
      </div>

      {/* Deposit button */}
      <Button variant="primary" className="mt-auto w-full">
        Deposit
      </Button>
    </div>
  );
};
