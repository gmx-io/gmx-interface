import type { BaseContract, Provider } from "ethers";
import { numberToHex, StateOverride } from "viem";

import { isDevelopment } from "config/env";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { getGasLimit } from "./contracts";
import { estimateGasLimit } from "./gas/estimateGasLimit";
import { GasPriceData, getGasPrice } from "./gas/gasPrice";
import { helperToast } from "./helperToast";
import { getProvider } from "./rpc";
import type { ISigner } from "./transactions/iSigner";

export type TenderlyConfig = {
  accountSlug: string;
  projectSlug: string;
  accessKey: string;
  enabled: boolean;
};

const sentReports: {
  url: string;
  comment: string;
}[] = [];

export async function simulateCallDataWithTenderly({
  chainId,
  tenderlyConfig,
  provider,
  to,
  data,
  from,
  value,
  blockNumber,
  gasPriceData,
  gasLimit,
  comment,
  stateOverride,
}: {
  chainId: number;
  tenderlyConfig: TenderlyConfig;
  provider: Provider | ISigner;
  to: string;
  data: string;
  from: string;
  value: bigint | undefined;
  blockNumber: "latest" | number | undefined;
  gasPriceData: GasPriceData | undefined;
  gasLimit: bigint | undefined;
  comment: string | undefined;
  stateOverride?: StateOverride;
}) {
  if (blockNumber === undefined) {
    blockNumber = await provider.getBlockNumber();
  }

  if (!gasPriceData) {
    const provider = getProvider(undefined, chainId);
    gasPriceData = await getGasPrice(provider, chainId);
  }

  if (gasLimit === undefined) {
    gasLimit = await estimateGasLimit(provider, {
      to,
      data,
      from,
      value,
    });
  }

  return processSimulation({
    chainId,
    config: tenderlyConfig,
    from,
    to,
    data,
    value,
    gasLimit,
    gasPriceData,
    blockNumber,
    comment,
    stateOverride,
  });
}

export const simulateTxWithTenderly = async (
  chainId: number,
  contract: BaseContract,
  account: string,
  method: string,
  params: any,
  opts: {
    gasLimit?: bigint;
    value?: bigint;
    comment: string;
    stateOverride?: StateOverride;
  }
) => {
  const config = getTenderlyConfig();

  if (!config) {
    throw new Error("Tenderly config not found");
  }

  if (!contract.runner?.provider) {
    throw new Error("No provider found");
  }

  const blockNumber = await contract.runner?.provider?.getBlockNumber();

  if (!blockNumber) {
    throw new Error("No block number found");
  }

  const provider = getProvider(undefined, chainId);
  const gasPriceData = await getGasPrice(provider, chainId);

  let gasLimit: bigint | undefined;

  // estimateGas might fail cos of incorrect tx params,
  // have to simulate tx without gasLimit in that case
  try {
    gasLimit = opts.gasLimit ? opts.gasLimit : await getGasLimit(contract, method, params, opts.value);
  } catch (e) {
    gasLimit = undefined;
    //
  }

  const result = await processSimulation({
    from: account,
    to: typeof contract.target === "string" ? contract.target : await contract.target.getAddress(),
    data: await contract.interface.encodeFunctionData(method, params),
    gasPriceData,
    chainId,
    config,
    gasLimit,
    value: opts.value ?? 0n,
    blockNumber,
    comment: opts.comment,
    stateOverride: opts.stateOverride,
  });

  return result;
};

async function processSimulation({
  chainId,
  config,
  from,
  data,
  value,
  to,
  gasLimit,
  gasPriceData,
  blockNumber,
  comment,
  stateOverride,
}: {
  config: TenderlyConfig;
  chainId: number;
  from: string;
  to: string;
  data: string;
  value: bigint | undefined;
  gasLimit: bigint | undefined;
  gasPriceData: GasPriceData | undefined;
  blockNumber: "latest" | number | undefined;
  comment: string | undefined;
  stateOverride?: StateOverride;
}) {
  const simulationParams = buildSimulationRequest(
    chainId,
    {
      from,
      to,
      gas: gasLimit,
      input: data,
      value: Number(value),
      stateOverride,
      ...gasPriceData,
    },
    blockNumber
  );

  helperToast.info("Sending transaction to Tenderly...");
  // eslint-disable-next-line no-console
  console.log("tenderly simulation params", simulationParams);

  const response = await fetch(
    `https://api.tenderly.co/api/v1/account/${config.accountSlug}/project/${config.projectSlug}/simulate`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": config.accessKey,
      },
      method: "POST",
      body: JSON.stringify(simulationParams),
    }
  );

  let success = false;
  let json: any;
  try {
    if (!response.ok) throw new Error(`Failed to send transaction to Tenderly: ${response.statusText}`);

    json = await response.json();
    const url = `https://dashboard.tenderly.co/${config.accountSlug}/${config.projectSlug}/simulator/${json.simulation.id}`;
    sentReports.push({ url, comment: comment ?? "" });
    success = json.simulation.status;
    helperToast.info(
      <>
        {sentReports.map(({ url, comment }) => (
          <div key={url}>
            <ExternalLink href={url}>View Tx</ExternalLink> for {comment}
          </div>
        ))}
      </>,
      {
        autoClose: false,
      }
    );
  } catch (e) {
    helperToast.error(
      <>
        {e.message}
        <br />
        <br />
        {sentReports.map(({ url, comment }) => (
          <div key={url}>
            <ExternalLink href={url}>View Tx</ExternalLink> for {comment}
          </div>
        ))}
      </>
    );
  }

  return { success, raw: json };
}

// https://docs.tenderly.co/reference/api#/operations/simulateTransaction
function buildSimulationRequest(
  chainId,
  params: {
    from: string;
    to: string;
    value: number;
    input: string;
    gas?: bigint;
    gasPrice?: bigint;
    stateOverride?: StateOverride;
    /*
    api doesn't support these yet
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    */
  },
  blockNumber: "latest" | number | undefined
) {
  return {
    network_id: chainId.toString(),
    from: params.from,
    to: params.to,
    gas: params.gas !== undefined ? Number(params.gas) : undefined,
    gas_price: params.gasPrice !== undefined ? String(params.gasPrice) : undefined,
    /* api doesn't support these yet
    max_fee_per_gas: params.maxFeePerGas !== undefined ? String(params.maxFeePerGas) : undefined,
    max_priority_fee_per_gas:
      params.maxPriorityFeePerGas !== undefined ? String(params.maxPriorityFeePerGas) : undefined,
    */
    value: params.value,
    input: params.input,
    save: import.meta.env.TENDERLY_TEST === "true" ? false : true,
    save_if_fails: import.meta.env.TENDERLY_TEST === "true" ? false : true,
    simulation_type: "quick",
    block_number: blockNumber,
    state_objects: params.stateOverride?.reduce((acc, curr) => {
      acc[curr.address] = {
        code: curr.code,
        balance: curr.balance ? numberToHex(curr.balance) : undefined,
        nonce: 0,
        storage: curr.state ? Object.fromEntries(curr.state.map((s) => [s.slot, s.value])) : undefined,
      };
      return acc;
    }, {}),
  };
}

export const tenderlyLsKeys = {
  accountSlug: "tenderlyAccountSlug",
  projectSlug: "tenderlyProjectSlug",
  accessKey: "tenderlyAccessKey",
  enabled: "tenderlySimulationEnabled",
};

export function getTenderlyAccountParams() {
  return {
    accountSlug: JSON.parse(localStorage.getItem(JSON.stringify(tenderlyLsKeys.accountSlug)) ?? '""'),
    projectSlug: JSON.parse(localStorage.getItem(JSON.stringify(tenderlyLsKeys.projectSlug)) ?? '""'),
  };
}

export const getTenderlyConfig = (): TenderlyConfig | null => {
  if (!isDevelopment()) return null;

  try {
    const config = {
      accountSlug: JSON.parse(localStorage.getItem(JSON.stringify(tenderlyLsKeys.accountSlug)) ?? '""'),
      projectSlug: JSON.parse(localStorage.getItem(JSON.stringify(tenderlyLsKeys.projectSlug)) ?? '""'),
      accessKey: JSON.parse(localStorage.getItem(JSON.stringify(tenderlyLsKeys.accessKey)) ?? '"'),
      enabled: JSON.parse(localStorage.getItem(JSON.stringify(tenderlyLsKeys.enabled)) ?? "false") == true,
    };

    if (!config.accessKey || !config.accountSlug || !config.projectSlug || !config.enabled) {
      return null;
    }

    return config;
  } catch (e) {
    return null;
  }
};
