import { t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import { getExplorerUrl } from "config/chains";
import { useChainId } from "lib/chains";
import { useContractEvents } from "lib/contracts";
import { useEffect, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import { Operation, operationTexts } from "../utils";

type Props = {
  operationType: Operation;
  onClose: () => void;
};

function StatusItem(p: { isLoading?: boolean; text: string; txnHash?: string }) {
  const { chainId } = useChainId();

  const txnLink = `${getExplorerUrl(chainId)}tx/${p.txnHash}`;

  return (
    <div>
      {p.text}
      {p.isLoading && <ImSpinner2 className="spin ApproveTokenButton-spin" />}
      {p.txnHash && <ExternalLink href={txnLink}>View</ExternalLink>}
    </div>
  );
}

export function MarketPoolSwapStatus(p: Props) {
  const { account } = useWeb3React();

  const { subscribe, unsubscribe } = useContractEvents();
  const [depositKey, setDepositKey] = useState<string>();

  const [depositCreatedTxnHash, setDepositCreatedTxnHash] = useState<string>();
  const [depositExecutedTxnHash, setDepositExecutedTxnHash] = useState<string>();
  const [depositCancelledTxnHash, setDepositCancelledTxnHash] = useState<string>();

  let orderExecuionStatusText = "Order processing";
  let orderExecutionTxnHash: string | undefined = undefined;

  const isOrderExecutionLoading = Boolean(depositKey && !depositExecutedTxnHash && !depositCancelledTxnHash);

  if (depositExecutedTxnHash) {
    orderExecuionStatusText = t`Order executed`;
    orderExecutionTxnHash = depositExecutedTxnHash;
  }

  if (depositCancelledTxnHash) {
    orderExecuionStatusText = t`Order cancelled`;
    orderExecutionTxnHash = depositCancelledTxnHash;
  }

  useEffect(() => {
    // TODO: get logs
    function onDepositCreated(key, [depositProps], txnParams) {
      if (depositProps.account !== account) return;

      setDepositKey(key);
      setDepositCreatedTxnHash(txnParams.transactionHash);
    }

    function onDepositExecuted(key, txnParams) {
      if (key !== depositKey) return;
      setDepositExecutedTxnHash(txnParams.transactionHash);
    }

    function onDepositCancelled(key, txnParams) {
      if (key !== depositKey) return;
      setDepositCancelledTxnHash(txnParams.transactionHash);
    }

    subscribe("EventEmitter", "DepositCreated", onDepositCreated);
    subscribe("EventEmitter", "DepositExecuted", onDepositExecuted);
    subscribe("EventEmitter", "DepositCancelled", onDepositCancelled);

    return () => {
      unsubscribe("EventEmitter", "DepositCreated", onDepositCreated);
      unsubscribe("EventEmitter", "DepositExecuted", onDepositExecuted);
      unsubscribe("EventEmitter", "DepositCancelled", onDepositCancelled);
    };
  }, [account, depositKey, subscribe, unsubscribe]);

  return (
    <Modal
      isVisible={true}
      setIsVisible={p.onClose}
      label={t`${operationTexts[p.operationType]} status`}
      allowContentTouchMove
    >
      <StatusItem text={`Order create status`} txnHash={depositCreatedTxnHash} isLoading={!depositCreatedTxnHash} />
      <StatusItem text={orderExecuionStatusText} isLoading={isOrderExecutionLoading} txnHash={orderExecutionTxnHash} />
    </Modal>
  );
}
