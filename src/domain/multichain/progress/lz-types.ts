export type LzApiOperation = {
  pathway?: {
    srcEid?: number;
    dstEid?: number;
    sender?: {
      address?: string;
      id?: string;
      name?: string;
      chain?: string;
    };
    receiver?: {
      address?: string;
      id?: string;
      name?: string;
      chain?: string;
    };
    id?: string;
    nonce?: number;
  };
  source?: {
    status?:
      | "WAITING"
      | "VALIDATING_TX"
      | "SUCCEEDED"
      | "WAITING_FOR_HASH_DELIVERED"
      | "UNRESOLVABLE_COMMAND"
      | "MALFORMED_COMMAND";
    tx?: {
      txHash?: string;
      blockHash?: string;
      blockNumber?: string;
      blockTimestamp?: number;
      from?: string;
      blockConfirmations?: number;
      payload?: string;
      value?: string;
      readinessTimestamp?: number;
      resolvedPayload?: string;
      adapterParams?: {
        version?: string;
        dstGasLimit?: string;
        dstNativeGasTransferAmount?: string;
        dstNativeGasTransferAddress?: string;
      };
      options?: {
        lzReceive?: {
          gas?: string;
          value?: string;
        };
        nativeDrop?: {
          amount?: string;
          receiver?: string;
        }[];
        compose?: {
          index?: number;
          gas?: string;
          value?: string;
        }[];
        ordered?: boolean;
      };
    };
    failedTx?: string[];
  };
  destination?:
    | {
        status?: "WAITING" | "VALIDATING_TX" | "SUCCEEDED" | "PAYLOAD_STORED";
        tx?: {
          txHash?: string;
          blockHash?: string;
          blockNumber?: number;
          blockTimestamp?: number;
        };
        payloadStoredTx?: string;
        failedTx?: string[];
      }
    | {
        nativeDrop?: {
          tx?: {
            txHash?: string;
            blockHash?: string;
            blockNumber?: number;
            blockTimestamp?: number;
          };
          failedTx?: {
            txHash?: string;
            txError?: string;
          }[];
          appliedResults?: unknown;
          status?: "WAITING" | "VALIDATING_TX" | "SUCCEEDED" | "FAILED" | "N/A";
        };
        nilify?: {
          txStatus?: "WAITING" | "VALIDATING_TX" | "SUCCEEDED";
          txHash?: string;
          blockHash?: string;
          blockNumber?: number;
          blockTimestamp?: number;
        };
        burn?: {
          txStatus?: "WAITING" | "VALIDATING_TX" | "SUCCEEDED";
          txHash?: string;
          blockHash?: string;
          blockNumber?: number;
          blockTimestamp?: number;
        };
        skip?: {
          txStatus?: "WAITING" | "VALIDATING_TX" | "SUCCEEDED";
          txHash?: string;
          blockHash?: string;
          blockNumber?: number;
          blockTimestamp?: number;
        };
        lzCompose?: {
          txs?: {
            txHash?: string;
            blockHash?: string;
            blockNumber?: number;
            blockTimestamp?: number;
            from?: string;
            to?: string;
          }[];
          failedTx?: {
            txHash?: string;
            txError?: string;
            from?: string;
            to?: string;
            index?: number;
            revertReason?: string | null;
          }[];
          status?:
            | "WAITING"
            | "VALIDATING_TX"
            | "SUCCEEDED"
            | "N/A"
            | "FAILED"
            | "SIMULATION_REVERTED"
            | "WAITING_FOR_COMPOSE_SENT_EVENT";
        };
        tx?: {
          txHash?: string;
          blockHash?: string;
          blockNumber?: number;
          blockTimestamp?: number;
        };
        payloadStoredTx?: string;
        failedTx?: {
          txHash?: string;
          txError?: string;
          blockHash?: string;
          blockNumber?: number;
          revertReason?: string | null;
        }[];
        status?:
          | "WAITING"
          | "VALIDATING_TX"
          | "SUCCEEDED"
          | "FAILED"
          | "SIMULATION_REVERTED"
          | "PAYLOAD_STORED"
          | "RESOLVED_PAYLOAD_SIZE_NOT_PAID";
      };
  verification?: {
    dvn?: {
      dvns?: {
        [key: string]:
          | {
              txHash?: string;
              blockHash?: string;
              blockNumber?: number;
              blockTimestamp?: number;
              proof?: {
                packetHeader?: string;
                payloadHash?: string;
              };
              optional?: boolean;
              status?: "VALIDATING_TX" | "SUCCEEDED" | "WAITING_FOR_ULN_CONFIG" | "FAILED";
            }
          | {
              /** @enum {string} */
              status: "WAITING";
            };
      };
      status?: "WAITING" | "QUORUM_REACHED" | "SUCCEEDED";
    };
    sealer?: {
      tx?: {
        txHash?: string;
        blockHash?: string;
        blockNumber?: number;
        blockTimestamp?: number;
      };
      failedTx?: {
        txHash?: string;
        txError?: string;
      }[];
      status?: "WAITING" | "VALIDATING_TX" | "SUCCEEDED" | "FAILED";
    };
  };
  guid?: string;
  config?: {
    error?: boolean;
    errorMessage?: string;
    dvnConfigError?: boolean;
    receiveLibrary?: string | null;
    sendLibrary?: string | null;
    inboundConfig?:
      | {
          confirmations?: number;
          requiredDVNCount?: number;
          optionalDVNCount?: number;
          optionalDVNThreshold?: number;
          requiredDVNs?: string[];
          requiredDVNNames?: string[];
          optionalDVNs?: string[];
          optionalDVNNames?: string[];
          executor?: string;
        }
      | {
          blockConfirmation?: number;
          relayerAddress?: string;
          oracleAddress?: string;
          executorAddress?: string;
          proofType?: string;
          utilsVersion?: number;
          proofVersion?: string | null;
          proofLibraryAddress?: string | null;
          /** @enum {string} */
          ulnVersion?: "V1" | "V2" | "V300" | "V301" | "V302" | "ReadV1002";
        };
    outboundConfig?:
      | {
          confirmations?: number;
          requiredDVNCount?: number;
          optionalDVNCount?: number;
          optionalDVNThreshold?: number;
          requiredDVNs?: string[];
          requiredDVNNames?: string[];
          optionalDVNs?: string[];
          optionalDVNNames?: string[];
          executor?: string;
        }
      | {
          blockConfirmation?: number;
          relayerAddress?: string;
          oracleAddress?: string;
          executorAddress?: string;
          proofType?: string;
        };
    /** @enum {string} */
    ulnSendVersion?: "V1" | "V2" | "V300" | "V301" | "V302" | "ReadV1002";
    /** @enum {string} */
    ulnReceiveVersion?: "V1" | "V2" | "V300" | "V301" | "V302" | "ReadV1002";
  };
  status?: {
    /** @enum {string} */
    name?:
      | "INFLIGHT"
      | "CONFIRMING"
      | "FAILED"
      | "DELIVERED"
      | "BLOCKED"
      | "PAYLOAD_STORED"
      | "APPLICATION_BURNED"
      | "APPLICATION_SKIPPED"
      | "UNRESOLVABLE_COMMAND"
      | "MALFORMED_COMMAND";
    message?: string;
  };
  /** @default 2025-09-25T00:13:59.006Z */
  created: string;
  /** @default 2025-09-25T00:13:59.006Z */
  updated: string;
};
