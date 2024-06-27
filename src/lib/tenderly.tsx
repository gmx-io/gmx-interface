import { Contract, Wallet } from "ethers";
import { helperToast } from "./helperToast";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { isDevelopment } from "config/env";
import { getGasLimit, setGasPrice } from "./contracts";

export const sendToTenderly = async (
  chainId: number,
  contract: Contract,
  wallet: Wallet,
  method: string,
  params: any,
  opts: any
) => {
  const config = getTenderlyConfig();

  if (!config) {
    return;
  }

  if (!contract.runner?.provider) {
    throw new Error("No provider found");
  }

  const blockNumber = await contract.runner?.provider?.getBlockNumber();

  if (!blockNumber) {
    throw new Error("No block number found");
  }

  const gasPriceData: any = {};
  await setGasPrice({}, contract.runner.provider, chainId);

  const simulationParams = buildSimpleSimulationRequest(
    chainId,
    {
      from: wallet.address,
      to: typeof contract.target === "string" ? contract.target : await contract.target.getAddress(),
      gas: opts.gasLimit ? opts.gasLimit : await getGasLimit(contract, method, params, opts.value),
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

  try {
    if (!response.ok) throw new Error(`Failed to send transaction to Tenderly: ${response.statusText}`);
    const json = await response.json();
    helperToast.success(
      <>
        <ExternalLink
          href={`https://dashboard.tenderly.co/${config.accountSlug}/${config.projectSlug}/simulator/${json.simulation.id}`}
        >
          View TX
        </ExternalLink>{" "}
        in Tenderly.
      </>,
      {
        delay: 10000,
      }
    );
  } catch (e) {
    helperToast.error(`Failed to send transaction to Tenderly: ${e.message}`);
  }
};

// https://docs.tenderly.co/reference/api#/operations/simulateTransaction
function buildSimpleSimulationRequest(
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
