import { Contract, Wallet } from "ethers";

const config = {
  accountName: "andev",
  projectName: "project",
  accessKey: "2ahoM-hOAzXL8-s5SBjA4DMp7ULUclhK",
};

export const sendToTenderly = async (
  chainId: number,
  contract: Contract,
  wallet: Wallet,
  method: string,
  params: any,
  opts: any
) => {
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

  const headers = {
    "Content-Type": "application/json",
    "X-Access-Key": config.accessKey,
  };
  const response = await fetch(
    `https://api.tenderly.co/api/v1/account/${config.accountName}/project/${config.projectName}/simulate`,
    {
      headers,
      method: "POST",
      body: JSON.stringify(simulationParams),
    }
  );
  return response.json();
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
