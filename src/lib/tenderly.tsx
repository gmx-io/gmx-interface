import { BaseContract } from "ethers";

import { isDevelopment } from "config/env";

import ExternalLink from "components/ExternalLink/ExternalLink";

import { getGasLimit, getGasPrice } from "./contracts";
import { helperToast } from "./helperToast";

const sentReports: {
  url: string;
  comment: string;
}[] = [];

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

  const gasPriceData = await getGasPrice(contract.runner.provider, chainId);

  let gas: undefined | bigint = undefined;

  // estimateGas might fail cos of incorrect tx params,
  // have to simulate tx without gasLimit in that case
  try {
    gas = opts.gasLimit ? opts.gasLimit : await getGasLimit(contract, method, params, opts.value);
  } catch (e) {
    //
  }

  const simulationParams = buildSimulationRequest(
    chainId,
    {
      from: account,
      to: typeof contract.target === "string" ? contract.target : await contract.target.getAddress(),
      gas,
      input: await contract.interface.encodeFunctionData(method, params),
      value: opts.value ? Number(opts.value) : 0,
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
  try {
    if (!response.ok) throw new Error(`Failed to send transaction to Tenderly: ${response.statusText}`);

    const json = await response.json();
    const url = `https://dashboard.tenderly.co/${config.accountSlug}/${config.projectSlug}/simulator/${json.simulation.id}`;
    sentReports.push({ url, comment: opts.comment });
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

  return { success };
};

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
    /*
    api doesn't support these yet
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    */
  },
  blockNumber: number
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
    save: true,
    save_if_fails: true,
    simulation_type: "quick",
    block_number: blockNumber,
  };
}

export const tenderlyLsKeys = {
  accountSlug: "tenderlyAccountSlug",
  projectSlug: "tenderlyProjectSlug",
  accessKey: "tenderlyAccessKey",
  enabled: "tenderlySimulationEnabled",
};

export const getTenderlyConfig = (): {
  accountSlug: string;
  projectSlug: string;
  accessKey: string;
  enabled: boolean;
} | null => {
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
