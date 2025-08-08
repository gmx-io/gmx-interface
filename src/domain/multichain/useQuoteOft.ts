import { Contract, Provider } from "ethers";
import useSWR from "swr";

import type { AnyChainId } from "config/chains";
import { IStargateAbi } from "config/multichain";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { IStargate } from "typechain-types-stargate";
import type {
  SendParamStruct,
  OFTLimitStruct,
  OFTFeeDetailStruct,
  OFTReceiptStruct,
} from "typechain-types-stargate/interfaces/IStargate";

import type { QuoteOft } from "./types";

export function useQuoteOft({
  sendParams,
  fromStargateAddress,
  fromChainProvider,
  fromChainId,
  toChainId,
}: {
  sendParams: SendParamStruct | undefined;
  fromStargateAddress: string | undefined;
  fromChainProvider: Provider | undefined;
  fromChainId: AnyChainId | undefined;
  toChainId: AnyChainId | undefined;
}): QuoteOft | undefined {
  const quoteOftCondition =
    sendParams !== undefined &&
    fromStargateAddress !== undefined &&
    fromChainProvider !== undefined &&
    toChainId !== undefined &&
    fromChainId !== undefined &&
    fromChainId !== toChainId;

  const quoteOftQuery = useSWR<QuoteOft | undefined>(
    quoteOftCondition ? ["quoteOft", sendParams.dstEid, sendParams.to, sendParams.amountLD, fromStargateAddress] : null,
    {
      fetcher: async () => {
        if (!quoteOftCondition) {
          return;
        }

        const iStargateInstance = new Contract(
          fromStargateAddress,
          IStargateAbi,
          fromChainProvider
        ) as unknown as IStargate;

        const [limit, oftFeeDetails, receipt]: [OFTLimitStruct, OFTFeeDetailStruct[], OFTReceiptStruct] =
          await iStargateInstance.quoteOFT(sendParams);

        return {
          limit,
          oftFeeDetails,
          receipt,
        };
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );

  const quoteOft = quoteOftQuery.data;

  return quoteOft;
}
