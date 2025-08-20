import uniq from "lodash/uniq";
import { useMemo } from "react";

import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo } from "domain/synthetics/markets";
import { getNeedTokenApprove, TokenData, useTokensAllowanceData } from "domain/synthetics/tokens";

import { Operation } from "../types";

interface Props {
  routerAddress: string;
  glvInfo: GlvInfo | undefined;
  operation: Operation;

  marketToken: TokenData | undefined;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  glvTokenAddress: string | undefined;

  marketTokenAmount: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  glvTokenAmount: bigint | undefined;

  isMarketTokenDeposit?: boolean;
}

export const useTokensToApprove = ({
  routerAddress,
  glvInfo,
  operation,
  marketToken,
  marketTokenAmount,
  longTokenAddress,
  longTokenAmount,
  shortTokenAddress,
  shortTokenAmount,
  glvTokenAddress,
  glvTokenAmount,
  isMarketTokenDeposit,
}: Props) => {
  const chainId = useSelector(selectChainId);
  const payTokenAddresses = useMemo(
    function getPayTokenAddresses() {
      if (!marketToken) {
        return [];
      }

      const addresses: string[] = [];

      if (operation === Operation.Deposit) {
        if (longTokenAmount !== undefined && longTokenAmount > 0 && longTokenAddress) {
          addresses.push(longTokenAddress);
        }
        if (shortTokenAmount !== undefined && shortTokenAmount > 0 && shortTokenAddress) {
          addresses.push(shortTokenAddress);
        }
        if (glvInfo && isMarketTokenDeposit) {
          if (marketTokenAmount !== undefined && marketTokenAmount > 0) {
            addresses.push(marketToken.address);
          }
        }
      } else if (operation === Operation.Withdrawal) {
        addresses.push(glvTokenAddress ? glvTokenAddress : marketToken.address);
      }

      return uniq(addresses);
    },
    [
      operation,
      marketToken,
      longTokenAmount,
      longTokenAddress,
      shortTokenAmount,
      shortTokenAddress,
      glvInfo,
      glvTokenAddress,
      isMarketTokenDeposit,
      marketTokenAmount,
    ]
  );

  const {
    tokensAllowanceData,
    isLoading: isAllowanceLoading,
    isLoaded: isAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
  });

  const tokensToApprove = useMemo(
    function getTokensToApprove() {
      const addresses: string[] = [];

      const shouldApproveMarketToken = getNeedTokenApprove(
        tokensAllowanceData,
        marketToken?.address,
        marketTokenAmount,
        []
      );

      const shouldApproveGlvToken = getNeedTokenApprove(tokensAllowanceData, glvTokenAddress, glvTokenAmount, []);

      const shouldApproveLongToken = getNeedTokenApprove(tokensAllowanceData, longTokenAddress, longTokenAmount, []);

      const shouldApproveShortToken = getNeedTokenApprove(tokensAllowanceData, shortTokenAddress, shortTokenAmount, []);

      if (operation === Operation.Deposit) {
        if (shouldApproveLongToken && longTokenAddress) {
          addresses.push(longTokenAddress);
        }

        if (shouldApproveShortToken && shortTokenAddress) {
          addresses.push(shortTokenAddress);
        }

        if (glvInfo && isMarketTokenDeposit && shouldApproveMarketToken && marketToken) {
          addresses.push(marketToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
        if (glvInfo && shouldApproveGlvToken && glvTokenAddress) {
          addresses.push(glvTokenAddress);
        } else if (!glvInfo && shouldApproveMarketToken && marketToken?.address) {
          addresses.push(marketToken.address);
        }
      }

      return uniq(addresses);
    },
    [
      glvInfo,
      glvTokenAddress,
      glvTokenAmount,
      isMarketTokenDeposit,
      longTokenAddress,
      longTokenAmount,
      marketToken,
      marketTokenAmount,
      operation,
      shortTokenAddress,
      shortTokenAmount,
      tokensAllowanceData,
    ]
  );

  return {
    tokensToApprove,
    payTokenAddresses,
    isAllowanceLoading,
    isAllowanceLoaded,
  };
};
