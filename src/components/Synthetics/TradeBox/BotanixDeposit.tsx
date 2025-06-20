import { encodeFunctionData, zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { useChainId } from "lib/chains";
import { sendWalletTransaction } from "lib/transactions";
import useWallet from "lib/wallets/useWallet";
import MulticallABI from "sdk/abis/Multicall.json";
import StBTCABI from "sdk/abis/StBTC.json";
import ERC20ABI from "sdk/abis/Token.json";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import Button from "components/Button/Button";

export function BotanixDeposit({
  fromTokenAmount,
  fromTokenAddress,
}: {
  fromTokenAmount: bigint;
  fromTokenAddress: string | undefined;
}) {
  const { chainId } = useChainId();
  const { account, signer } = useWallet();

  const onDeposit = () => {
    const calls = [
      {
        contractAddress: getContract(chainId, "StBTC"),
        abi: StBTCABI.abi,
        functionName: "directDeposit",
        args: [fromTokenAmount, account],
      },
    ]

    const callData = encodeFunctionData({
      abi: MulticallABI.abi,
      functionName: "aggregate",
      args: [
        Object.values(calls).map((call) => ({
          target: call.contractAddress,
          callData: encodeFunctionData(call),
        })),
      ],
    });

    sendWalletTransaction({
      chainId,
      signer: signer!,
      to: getContract(chainId, "StBTC"),
      callData: encodeFunctionData({
        abi: StBTCABI.abi,
        functionName: "directDeposit",
        args: [fromTokenAmount, account],
      }),
      value: fromTokenAmount,
    });
  };

  const onRedeem = () => {
    sendWalletTransaction({
      chainId,
      signer: signer!,
      to: getContract(chainId, "StBTC"),
      callData: encodeFunctionData({
        abi: StBTCABI.abi,
        functionName: "redeem",
        args: [fromTokenAmount, account, account],
      }),
      value: fromTokenAmount,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="primary" className="w-full" onClick={onDeposit}>
        Deposit
      </Button>
      <Button variant="primary" className="w-full" onClick={onRedeem}>
        Redeem
      </Button>
    </div>
  );
}
