import { Trans } from "@lingui/macro";
import { getAccount } from "@wagmi/core";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useCopyToClipboard } from "react-use";

import { getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { getTokenAddressByGlv } from "domain/synthetics/markets/glv";
import { Operation } from "domain/synthetics/markets/types";
import { Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { CHAIN_ID_TO_TX_URL_BUILDER } from "lib/chains/blockExplorers";
import { shortenAddressOrEns } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import {
  getIsSpotOnlyMarket,
  getMarketIndexToken,
  getTokenAddressByMarket,
  getTokenSymbolByMarket,
  isMarketTokenAddress,
} from "sdk/configs/markets";
import { getToken } from "sdk/configs/tokens";
import { getMarketIndexName, getMarketPoolName } from "sdk/utils/markets";
import { formatTokenAmount, formatUsd } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { EXPAND_ANIMATION_VARIANTS } from "components/ExpandableRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";

import AttentionIcon from "img/ic_attention.svg?react";
import CheckCircleIcon from "img/ic_check_circle.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ChevronUpIcon from "img/ic_chevron_up.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import ExternalLinkIcon from "img/ic_new_link_20.svg?react";
import SpinnerBlueSrc from "img/ic_spinner_blue.svg";

import { MultichainTransferProgress } from "./MultichainTransferProgress";

const MULTICHAIN_TRANSFER_PROGRESS_TOAST_ID = "multichain-transfer-progress";

type PromiseState = "pending" | "completed" | "error";
function usePromiseState<ErrorType = unknown>(
  promise: Promise<void> | undefined
): {
  state: PromiseState | undefined;
  error: ErrorType | undefined;
} {
  const [state, setState] = useState<PromiseState | undefined>(undefined);
  const [error, setError] = useState<ErrorType | undefined>(undefined);

  useEffect(() => {
    setState(undefined);
    setError(undefined);
    if (!promise) {
      return;
    }

    setState("pending");
    promise
      .then(() => {
        setState("completed");
      })
      .catch((error: ErrorType) => {
        setError(error);
        setState("error");
      });
  }, [promise]);

  return { state, error };
}

export function useMultichainTransferProgressView(task: MultichainTransferProgress | undefined) {
  const { chainId } = useChainId();

  const { state: finishedState, error: finishedError } = usePromiseState<MultichainTransferProgress.errors>(
    task?.getStepPromise("finished")
  );

  useEffect(() => {
    if (!task) {
      return;
    }

    if (!finishedState) {
      if (toast.isActive(MULTICHAIN_TRANSFER_PROGRESS_TOAST_ID)) {
        toast.dismiss(MULTICHAIN_TRANSFER_PROGRESS_TOAST_ID);
      }
      return;
    }

    if (toast.isActive(MULTICHAIN_TRANSFER_PROGRESS_TOAST_ID)) {
      toast.update(MULTICHAIN_TRANSFER_PROGRESS_TOAST_ID, {
        render: (
          <ToastContent chainId={chainId} task={task} finishedState={finishedState} finishedError={finishedError} />
        ),
      });
    } else {
      toast(
        <ToastContent chainId={chainId} task={task} finishedState={finishedState} finishedError={finishedError} />,
        {
          toastId: MULTICHAIN_TRANSFER_PROGRESS_TOAST_ID,
          type: "default",
          autoClose: false,
          closeButton: false,
          bodyClassName: "!p-0",
          className: "!bg-[#161825] border-1/2 border-slate-600 !-ml-64",
          hideProgressBar: true,
        }
      );
    }
  }, [chainId, finishedError, finishedState, task]);

  return null;
}

type Props = {
  chainId: number;
  task: MultichainTransferProgress;
  finishedState: PromiseState;
  finishedError: MultichainTransferProgress.errors | undefined;
  closeToast?: () => void;
};
function ToastContent({ chainId, task, finishedState, finishedError, closeToast }: Props) {
  const [isCopied, setIsCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(
      JSON.stringify(
        {
          operation: task.operation,
          amount: task.amount.toString(),
          currentSettlementChainId: chainId,
          tokenSymbol: task.token.symbol,
          tokenAddress: task.token.address,
          initialTx: task.initialTxHash,
          error: finishedError,
          account: getAccount(getRainbowKitConfig()).address,
        },
        null,
        2
      )
    );
    setIsCopied(true);
  }, [
    chainId,
    copyToClipboard,
    finishedError,
    task.amount,
    task.initialTxHash,
    task.operation,
    task.token.address,
    task.token.symbol,
  ]);

  useEffect(() => {
    if (finishedState === "error") {
      setIsOpen(true);
    }
  }, [finishedState]);

  const [elapsedTime, setElapsedTime] = useState<string | undefined>(undefined);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(
        formatElapsedTime(Math.floor(((task.finishTimestamp || Date.now()) - task.startTimestamp) / 1000))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [task.finishTimestamp, task.startTimestamp]);

  const indexName = task.isGlv
    ? "GLV"
    : getMarketIndexName({
        indexToken: getMarketIndexToken(chainId, task.token.address)!,
        isSpotOnly: getIsSpotOnlyMarket(chainId, task.token.address),
      });

  const gmOrGlvLabel = task.isGlv ? "GLV" : "GM";
  let longToken: Token | undefined;
  let shortToken: Token | undefined;
  if (task.isGlv) {
    longToken = getToken(chainId, getTokenAddressByGlv(chainId, task.token.address, "long"));
    shortToken = getToken(chainId, getTokenAddressByGlv(chainId, task.token.address, "short"));
  } else {
    longToken = getToken(chainId, getTokenAddressByMarket(chainId, task.token.address, "long"));
    shortToken = getToken(chainId, getTokenAddressByMarket(chainId, task.token.address, "short"));
  }

  const poolName = getMarketPoolName({
    longToken,
    shortToken,
  });

  return (
    <div className="text-body-medium flex flex-col font-medium">
      <div className="flex items-center justify-between gap-12 p-16">
        <div className="flex items-center gap-4">
          <TokenIcon
            symbol={
              isMarketTokenAddress(chainId, task.token.address)
                ? getTokenSymbolByMarket(chainId, task.token.address, "index")
                : task.token.symbol
            }
            displaySize={16}
            className="size-16"
          />

          <div>
            {task.operation === Operation.Deposit ? <Trans>Buying...</Trans> : <Trans>Selling...</Trans>}{" "}
            {formatTokenAmount(task.amount, task.token.decimals)}{" "}
            {isMarketTokenAddress(chainId, task.token.address) ? (
              <>
                GM: {indexName}
                <span className="subtext">[{poolName}]</span>
              </>
            ) : (
              <>
                GLV
                <span className="subtext">[{poolName}]</span>
              </>
            )}
          </div>
        </div>
        <div className="text-typography-secondary">
          {finishedState === "pending" && (
            <div className="flex items-center gap-4">
              <img src={SpinnerBlueSrc} alt="spinner" className="size-16 shrink-0 animate-spin" />
              <div className="text-typography-secondary">
                <Trans>In progress...</Trans>
              </div>
            </div>
          )}
          {finishedState === "completed" && (
            <div className="flex items-center gap-4 text-green-700">
              <CheckCircleIcon className="size-16 shrink-0" />
              <Trans>Completed</Trans>
            </div>
          )}
          {finishedState === "error" && (
            <div className="flex items-center gap-4 text-red-500">
              <AttentionIcon className="size-16 shrink-0" />
              <Trans>Buy failed</Trans>
            </div>
          )}
        </div>
      </div>

      <>
        <hr className="border-t-1/2 border-slate-600" />
        <div className="flex flex-col gap-12 p-16">
          <SyntheticsInfoRow
            onClick={() => setIsOpen(!isOpen)}
            className="group"
            label={
              <div className="flex items-center gap-4 group-gmx-hover:text-blue-300">
                {isOpen ? (
                  <>
                    <Trans>Fewer details</Trans>
                    <ChevronUpIcon className="w-16 text-typography-secondary group-gmx-hover:text-blue-300" />
                  </>
                ) : (
                  <>
                    <Trans>More details</Trans>
                    <ChevronDownIcon className="w-16 text-typography-secondary group-gmx-hover:text-blue-300" />
                  </>
                )}
              </div>
            }
            valueClassName="text-typography-secondary group-gmx-hover:text-blue-300"
            value={isOpen ? null : task.finishTimestamp ? elapsedTime : <Trans>Est. time: ~5 min</Trans>}
          />
          <AnimatePresence>
            {isOpen && (
              <motion.div
                variants={EXPAND_ANIMATION_VARIANTS}
                initial="collapsed"
                animate="expanded"
                exit="exit"
                className="flex flex-col gap-12"
              >
                <SyntheticsInfoRow
                  label={
                    task.operation === Operation.Deposit ? (
                      <Trans>Funds bridging to...</Trans>
                    ) : (
                      <Trans>{gmOrGlvLabel} bridging to...</Trans>
                    )
                  }
                  valueClassName="flex items-center gap-4"
                  value={
                    <>
                      {getChainName(task.settlementChainId)}
                      <img src={getChainIcon(task.settlementChainId)} className="size-16" />
                    </>
                  }
                />
                <SyntheticsInfoRow
                  label={
                    task.operation === Operation.Deposit ? (
                      <Trans>GM bridging to...</Trans>
                    ) : (
                      <Trans>Funds bridging to...</Trans>
                    )
                  }
                  valueClassName="flex items-center gap-4"
                  value={
                    <>
                      {getChainName(task.sourceChainId)}
                      <img src={getChainIcon(task.sourceChainId)} className="size-16" />
                    </>
                  }
                />
                <SyntheticsInfoRow
                  label={<Trans>Gas</Trans>}
                  valueClassName="flex items-center"
                  value={formatUsd(task.estimatedFeeUsd)}
                />
                {finishedState !== "completed" && (
                  <>
                    <SyntheticsInfoRow
                      label={<Trans>Estimated time</Trans>}
                      valueClassName="flex items-center"
                      value={<Trans>~5 min</Trans>}
                    />
                    <SyntheticsInfoRow
                      label={<Trans>Time elapsed</Trans>}
                      valueClassName="flex items-center"
                      value={elapsedTime}
                    />
                  </>
                )}
                <SyntheticsInfoRow
                  label={<Trans>Bridge transaction hash</Trans>}
                  valueClassName="flex items-center"
                  value={
                    <ExternalLink href={CHAIN_ID_TO_TX_URL_BUILDER["layerzero"](task.initialTxHash)} variant="icon">
                      {shortenAddressOrEns(task.initialTxHash, 11)}
                    </ExternalLink>
                  }
                />
                {finishedError && (
                  <>
                    {finishedError instanceof MultichainTransferProgress.errors.BridgeInFailed && (
                      <SyntheticsInfoRow
                        label={<Trans>Bridge in failed</Trans>}
                        valueClassName="flex items-center"
                        value={
                          finishedError.creationTx ? (
                            <ExternalLink
                              href={CHAIN_ID_TO_TX_URL_BUILDER[finishedError.chainId](finishedError.creationTx)}
                            >
                              <ExternalLinkIcon className="size-16 text-typography-secondary" />
                            </ExternalLink>
                          ) : (
                            "N/A"
                          )
                        }
                      />
                    )}
                    {finishedError instanceof MultichainTransferProgress.errors.BridgeOutFailed && (
                      <SyntheticsInfoRow
                        label={<Trans>Bridge out failed</Trans>}
                        valueClassName="flex items-center"
                        value={
                          finishedError.executionTx ? (
                            <ExternalLink
                              href={CHAIN_ID_TO_TX_URL_BUILDER[finishedError.chainId](finishedError.executionTx)}
                            >
                              <ExternalLinkIcon className="size-16 text-typography-secondary" />
                            </ExternalLink>
                          ) : (
                            "N/A"
                          )
                        }
                      />
                    )}
                    {finishedError instanceof MultichainTransferProgress.errors.ConversionFailed && (
                      <>
                        <SyntheticsInfoRow
                          label={<Trans>Conversion creation failed</Trans>}
                          valueClassName="flex items-center"
                          value={
                            finishedError.creationTx ? (
                              <ExternalLink
                                href={CHAIN_ID_TO_TX_URL_BUILDER[finishedError.chainId](finishedError.creationTx)}
                                variant="icon"
                              >
                                {shortenAddressOrEns(finishedError.creationTx, 11)}
                              </ExternalLink>
                            ) : (
                              "N/A"
                            )
                          }
                        />
                        <SyntheticsInfoRow
                          label={<Trans>Conversion execution failed</Trans>}
                          valueClassName="flex items-center"
                          value={
                            finishedError.executionTx ? (
                              <ExternalLink
                                href={CHAIN_ID_TO_TX_URL_BUILDER[finishedError.chainId](finishedError.executionTx)}
                                variant="icon"
                              >
                                {shortenAddressOrEns(finishedError.executionTx, 11)}
                              </ExternalLink>
                            ) : (
                              "N/A"
                            )
                          }
                        />
                      </>
                    )}
                    <ColorfulBanner color="red" className="text-red-100">
                      {finishedError instanceof MultichainTransferProgress.errors.BridgeInFailed && (
                        <>
                          {task.operation === Operation.Deposit ? (
                            <Trans>Buy {gmOrGlvLabel} failed.</Trans>
                          ) : (
                            <Trans>Sell {gmOrGlvLabel} failed.</Trans>
                          )}
                          {finishedError.fundsLeftIn === "source" && (
                            <Trans> Your funds are safe and remain in your wallet.</Trans>
                          )}
                          {finishedError.fundsLeftIn === "lz" && (
                            <Trans>
                              {" "}
                              Your funds are safe in LayerZero on the destination chain. Retry the receive transaction
                              in LayerZero Scan or contact support.
                            </Trans>
                          )}
                          {finishedError.fundsLeftIn === "gmx-lz" && (
                            <Trans>
                              {" "}
                              Your funds are safe in GMX contracts on the destination chain. Retry the compose
                              transaction in LayerZero Scan or contact support.
                            </Trans>
                          )}
                          {finishedError.fundsLeftIn === "unknown" && (
                            <Trans> Your funds are safe. Contact support for help.</Trans>
                          )}
                        </>
                      )}

                      {finishedError instanceof MultichainTransferProgress.errors.BridgeOutFailed &&
                        (task.operation === Operation.Deposit ? (
                          <Trans>
                            {gmOrGlvLabel} bought successfully, but bridge to Base failed. Your funds are safe in your
                            GMX Account. Retry the bridge or go to the {indexName} pool to withdraw your GM tokens.
                          </Trans>
                        ) : (
                          <Trans>
                            {gmOrGlvLabel} sold successfully, but bridge to Base failed. Your funds are safe in your GMX
                            Account. Retry the bridge or open GMX Account to withdraw your tokens.
                          </Trans>
                        ))}

                      {finishedError instanceof MultichainTransferProgress.errors.ConversionFailed &&
                        (task.operation === Operation.Deposit ? (
                          <Trans>
                            Buy {gmOrGlvLabel} failed. Your funds are safe in your GMX Account. Switch to settlement
                            chain and go to the {indexName} pool to buy your {gmOrGlvLabel} tokens.
                          </Trans>
                        ) : (
                          <Trans>
                            Sell {gmOrGlvLabel} failed. Your funds are safe in your GMX Account. Switch to settlement
                            chain and go to the {indexName} pool to sell your {gmOrGlvLabel} tokens.
                          </Trans>
                        ))}
                    </ColorfulBanner>
                    <Button variant="secondary" onClick={handleCopy}>
                      <CopyIcon className="size-16" />
                      {isCopied ? <Trans>Copied</Trans> : <Trans>Copy technical details</Trans>}
                    </Button>
                  </>
                )}
                <Button variant="secondary" onClick={closeToast}>
                  <Trans>Close</Trans>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    </div>
  );
}

function formatElapsedTime(elapsedSeconds: number): string {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const elapsedTimeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return elapsedTimeFormatted;
}
