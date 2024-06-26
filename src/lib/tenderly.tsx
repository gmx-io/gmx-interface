import { Contract, Wallet } from "ethers";
import { helperToast } from "./helperToast";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { isDevelopment } from "config/env";

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

  const blockNumber = await contract.runner?.provider?.getBlockNumber();

  if (!blockNumber) {
    throw new Error("No block number found");
  }

  const simulationParams = buildSimpleSimulationRequest(
    chainId,
    {
      from: wallet.address,
      to: typeof contract.target === "string" ? contract.target : await contract.target.getAddress(),
      gas: 0, // FIXME
      input: await contract.interface.encodeFunctionData(method, params),
      gas_price: "0", // FIXME
      value: opts.value ? Number(opts.value) : 0,
    },
    blockNumber
  );

  helperToast.info("Sending transaction to Tenderly...");
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

// similar to https://github.com/Tenderly/tenderly-sdk/blob/67e9a6c1e8116f3d9ae52958046e26c1f0ad55f1/lib/executors/Simulator.ts#L148
function buildSimpleSimulationRequest(
  chainId,
  transaction: {
    from: string;
    to: string;
    value: number;
    input: string;
    gas?: number;
    gas_price?: string;
    max_fee_per_gas?: string;
    max_priority_fee_per_gas?: string;
  },
  blockNumber: number
) {
  return {
    network_id: chainId.toString(),
    from: transaction.from,
    to: transaction.to,
    gas: transaction.gas,
    gas_price: transaction.gas_price,
    max_fee_per_gas: transaction.max_fee_per_gas,
    max_priority_fee_per_gas: transaction.max_priority_fee_per_gas,
    value: transaction.value,
    input: transaction.input,
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
