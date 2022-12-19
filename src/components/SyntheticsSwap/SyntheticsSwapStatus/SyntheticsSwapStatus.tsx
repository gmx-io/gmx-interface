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

export function SyntheticSwapStatus(p: Props) {
  const { account } = useWeb3React();

  const { subscribe, unsubscribe } = useContractEvents();
  const [depositKey, setDepositKey] = useState<string>();

  const [orderCreatedTxnHash, setOrderCreatedTxnHash] = useState<string>();
  const [orderExecutedTxnHash, setOrderExecutedTxnHash] = useState<string>();
  const [orderCancelledTxnHash, setOrderCancelledTxnHash] = useState<string>();

  let orderExecuionStatusText = "Order processing";
  let orderExecutionTxnHash: string | undefined = undefined;

  const isOrderExecutionLoading = Boolean(depositKey && !orderExecutedTxnHash && !orderCancelledTxnHash);

  if (orderExecutedTxnHash) {
    orderExecuionStatusText = t`Order executed`;
    orderExecutionTxnHash = orderExecutedTxnHash;
  }

  if (orderCancelledTxnHash) {
    orderExecuionStatusText = t`Order cancelled`;
    orderExecutionTxnHash = orderCancelledTxnHash;
  }

  useEffect(() => {
    // TODO: get logs
    function onOrderCreated(key, [orderAddresses], txnParams) {
      console.log("onOrderCreated", key, orderAddresses, txnParams);
      // if (orderAddresses.account !== account) return;

      setDepositKey(key);
      setOrderCreatedTxnHash(txnParams.transactionHash);
    }

    function onOrderExecuted(key, txnParams) {
      console.log("onOrderExecuted", key, txnParams);
      // if (key !== depositKey) return;

      setOrderExecutedTxnHash(txnParams.transactionHash);
    }

    function onOrderCancelled(key, txnParams) {
      console.log("onOrderCancelled", key, txnParams);
      // if (key !== depositKey) return;

      setOrderCancelledTxnHash(txnParams.transactionHash);
    }

    subscribe("EventEmitter", "OrderCreated", onOrderCreated);
    subscribe("EventEmitter", "OrderExecuted", onOrderExecuted);
    subscribe("EventEmitter", "OrderCancelled", onOrderCancelled);

    return () => {
      unsubscribe("EventEmitter", "OrderCreated", onOrderCreated);
      unsubscribe("EventEmitter", "OrderExecuted", onOrderExecuted);
      unsubscribe("EventEmitter", "OrderCancelled", onOrderCancelled);
    };
  }, [account, depositKey, subscribe, unsubscribe]);

  return (
    <Modal
      isVisible={true}
      setIsVisible={p.onClose}
      label={t`${operationTexts[p.operationType]} status`}
      allowContentTouchMove
    >
      <StatusItem text={`Order create status`} txnHash={orderCreatedTxnHash} isLoading={!orderCreatedTxnHash} />
      <StatusItem text={orderExecuionStatusText} isLoading={isOrderExecutionLoading} txnHash={orderExecutionTxnHash} />
    </Modal>
  );
}
