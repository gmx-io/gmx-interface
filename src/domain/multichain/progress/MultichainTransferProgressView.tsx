import { Trans } from "@lingui/macro";
import { getAccount } from "@wagmi/core";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useCopyToClipboard } from "react-use";

import { getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { useChainId } from "lib/chains";
import { CHAIN_ID_TO_TX_URL_BUILDER } from "lib/chains/blockExplorers";
import { shortenAddressOrEns } from "lib/wallets";
import { getRainbowKitConfig } from "lib/wallets/rainbowKitConfig";
import { SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";
import {
  getIsSpotOnlyMarket,
  getMarketIndexName,
  getMarketIndexToken,
  getMarketIndexTokenSymbol,
  isMarketTokenAddress,
} from "sdk/utils/markets";
import { formatTokenAmount } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { EXPAND_ANIMATION_VARIANTS } from "components/ExpandableRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { Operation } from "components/GmSwap/GmSwapBox/types";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";

import AttentionIcon from "img/ic_attention.svg?react";
import CheckIcon from "img/ic_check.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ChevronUpIcon from "img/ic_chevron_up.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import ExternalLinkIcon from "img/ic_new_link_20.svg?react";
import SpinnerBlueSrc from "img/ic_spinner_blue.svg";

import { MultichainTransferProgress } from "./MultichainTransferProgress";

const TOAST_ID_PREFIX = "gm-sell-progress-";

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

  const toastId = useMemo(() => {
    if (!task) {
      return undefined;
    }
    return `${TOAST_ID_PREFIX}${task.initialTxHash}`;
  }, [task]);

  useEffect(() => {
    if (!task) {
      return;
    }

    if (!finishedState || !toastId) {
      if (toastId && toast.isActive(toastId)) {
        toast.dismiss(toastId);
      }
      return;
    }

    if (toast.isActive(toastId)) {
      toast.update(toastId, {
        render: (
          <ToastContent chainId={chainId} task={task} finishedState={finishedState} finishedError={finishedError} />
        ),
      });
    } else {
      toast(
        <ToastContent chainId={chainId} task={task} finishedState={finishedState} finishedError={finishedError} />,
        {
          toastId,
          type: "default",
          autoClose: false,
          closeButton: false,
          bodyClassName: "!p-0",
          hideProgressBar: true,
        }
      );
    }
  }, [chainId, finishedError, finishedState, task, toastId]);

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

  const elapsedTime = task.finishTimestamp
    ? formatElapsedTime(Math.floor((task.finishTimestamp - task.startTimestamp) / 1000))
    : undefined;

  return (
    <div className="text-body-medium flex flex-col font-medium">
      <div className="flex items-center justify-between gap-12 p-16">
        <div className="flex items-center gap-4">
          <TokenIcon
            symbol={
              isMarketTokenAddress(chainId, task.token.address)
                ? getMarketIndexTokenSymbol(chainId, task.token.address)
                : task.token.symbol
            }
            displaySize={16}
            className="size-16"
          />

          <div>
            {task.operation === Operation.Deposit ? <Trans>Buying</Trans> : <Trans>Selling</Trans>}{" "}
            {formatTokenAmount(task.amount, task.token.decimals)}{" "}
            {isMarketTokenAddress(chainId, task.token.address) ? (
              <>
                GM:{" "}
                {getMarketIndexName({
                  indexToken: getMarketIndexToken(chainId, task.token.address)!,
                  isSpotOnly: getIsSpotOnlyMarket(chainId, task.token.address),
                })}
              </>
            ) : (
              task.token.symbol
            )}
          </div>
        </div>
        <div className="text-typography-secondary">
          {finishedState === "pending" && (
            <div className="flex items-center gap-4">
              <img src={SpinnerBlueSrc} alt="spinner" className="size-16 animate-spin" />
              <div className="text-typography-secondary">
                <Trans>In progress</Trans>
              </div>
            </div>
          )}
          {finishedState === "completed" && (
            <div className="flex items-center gap-4 text-green-700">
              <CheckIcon className="size-16" />
              <Trans>Completed</Trans>
            </div>
          )}
          {finishedState === "error" && (
            <div className="flex items-center gap-4 text-red-500">
              <AttentionIcon className="size-16" />
              <Trans>Buying error</Trans>
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
                    <Trans>Less Details</Trans>
                    <ChevronUpIcon className="w-16 text-typography-secondary group-gmx-hover:text-blue-300" />
                  </>
                ) : (
                  <>
                    <Trans>More Details</Trans>
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
                      <Trans>Funds Bridging to</Trans>
                    ) : (
                      <Trans>GM Bridging to</Trans>
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
                      <Trans>GM withdrawing to</Trans>
                    ) : (
                      <Trans>Funds withdrawing to</Trans>
                    )
                  }
                  valueClassName="flex items-center gap-4"
                  value={
                    <>
                      {getChainName(SOURCE_BASE_MAINNET)}
                      <img src={getChainIcon(SOURCE_BASE_MAINNET)} className="size-16" />
                    </>
                  }
                />
                <SyntheticsInfoRow
                  label={<Trans>Gas</Trans>}
                  valueClassName="flex items-center"
                  value={<Trans>$0.001</Trans>}
                />
                <SyntheticsInfoRow
                  label={<Trans>Estimated time</Trans>}
                  valueClassName="flex items-center"
                  value={<Trans>~5 minutes</Trans>}
                />
                <SyntheticsInfoRow
                  label={<Trans>Time elapsed</Trans>}
                  valueClassName="flex items-center"
                  value={elapsedTime}
                />
                <SyntheticsInfoRow
                  label={<Trans>Bridge TX hash</Trans>}
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
                        label={<Trans>Failed to bridge in</Trans>}
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
                        label={<Trans>Failed to bridge out</Trans>}
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
                          label={<Trans>Failed to create conversion</Trans>}
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
                        <SyntheticsInfoRow
                          label={<Trans>Failed to execute conversion</Trans>}
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
                      </>
                    )}
                    <ColorfulBanner color="red" className="text-red-100">
                      {finishedError instanceof MultichainTransferProgress.errors.BridgeInFailed &&
                        (task.operation === Operation.Deposit ? (
                          <Trans>Buy GM operation failed. Your funds are safe and remain in your wallet.</Trans>
                        ) : (
                          <Trans>Sell GM operation failed. Your funds are safe and remain in your wallet.</Trans>
                        ))}
                      {finishedError instanceof MultichainTransferProgress.errors.BridgeOutFailed &&
                        (task.operation === Operation.Deposit ? (
                          <Trans>
                            GM tokens were bought successfully, but the bridge to Base failed. Your funds are safe and
                            currently stored in your GMX account. You can retry the bridge or go to the ETH/USDC pool to
                            manually withdraw your GM tokens.
                          </Trans>
                        ) : (
                          <Trans>
                            GM tokens were sold successfully, but the bridge to Base failed. Your funds are safe and
                            currently stored in your GMX account. You can retry the bridge or open GMX account modal to
                            manually withdraw your tokens.
                          </Trans>
                        ))}

                      {finishedError instanceof MultichainTransferProgress.errors.ConversionFailed &&
                        (task.operation === Operation.Deposit ? (
                          <Trans>
                            Buy GM operation failed. Your funds are safe and currently stored in your GMX account. You
                            can try again or go to the ETH/USDC pool to manually buy your GM tokens.
                          </Trans>
                        ) : (
                          <Trans>
                            Sell GM operation failed. Your funds are safe and currently stored in your GMX account. You
                            can try again or go to the ETH/USDC pool to manually sell your GM tokens.
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
