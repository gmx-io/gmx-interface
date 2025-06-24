import { Contract, Provider } from "ethers";
import useSWR from "swr";

import type { AnyChainId } from "config/chains";
import { IStargateAbi } from "config/multichain";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import type { IStargate } from "typechain-types-stargate";
import type { SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";

import type { QuoteSend } from "./types";

export function useQuoteSend({
  sendParams,
  fromStargateAddress,
  fromChainProvider,
  fromChainId,
  toChainId,
  composeGas,
}: {
  sendParams: SendParamStruct | undefined;
  fromStargateAddress: string | undefined;
  fromChainProvider: Provider | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
  composeGas?: bigint;
}) {
  const quoteSendCondition =
    sendParams !== undefined &&
    fromStargateAddress !== undefined &&
    fromChainProvider !== undefined &&
    toChainId !== undefined &&
    fromChainId !== undefined &&
    fromChainId !== toChainId;

  const quoteSendQuery = useSWR<QuoteSend | undefined>(
    quoteSendCondition
      ? ["quoteSend", sendParams.dstEid, sendParams.to, sendParams.amountLD, fromStargateAddress, composeGas]
      : null,
    {
      fetcher: async () => {
        if (!quoteSendCondition) {
          return;
        }

        const iStargateInstance = new Contract(
          fromStargateAddress,
          IStargateAbi,
          fromChainProvider
        ) as unknown as IStargate;

        const result = await iStargateInstance.quoteSend(sendParams, false);

        return {
          nativeFee: result.nativeFee,
          lzTokenFee: result.lzTokenFee,
        };
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  const quoteSend = quoteSendQuery.data;

  return quoteSend;
}
