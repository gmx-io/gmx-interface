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
  longToken: TokenData | undefined;
  shortToken: TokenData | undefined;
  glvToken: TokenData | undefined;

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
  longToken,
  longTokenAmount,
  shortToken,
  shortTokenAmount,
  glvToken,
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
        if (longTokenAmount !== undefined && longTokenAmount > 0 && longToken) {
          addresses.push(longToken.address);
        }
        if (shortTokenAmount !== undefined && shortTokenAmount > 0 && shortToken) {
          addresses.push(shortToken.address);
        }
        if (glvInfo && isMarketTokenDeposit) {
          if (marketTokenAmount !== undefined && marketTokenAmount > 0) {
            addresses.push(marketToken.address);
          }
        }
      } else if (operation === Operation.Withdrawal) {
        addresses.push(glvToken ? glvToken.address : marketToken.address);
      }

      return uniq(addresses);
    },
    [
      operation,
      marketToken,
      longTokenAmount,
      longToken,
      shortTokenAmount,
      shortToken,
      glvInfo,
      glvToken,
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
        marketTokenAmount
      );

      const shouldApproveGlvToken = getNeedTokenApprove(tokensAllowanceData, glvToken?.address, glvTokenAmount);

      const shouldApproveLongToken = getNeedTokenApprove(tokensAllowanceData, longToken?.address, longTokenAmount);

      const shouldApproveShortToken = getNeedTokenApprove(tokensAllowanceData, shortToken?.address, shortTokenAmount);

      if (operation === Operation.Deposit) {
        if (shouldApproveLongToken && longToken?.address) {
          addresses.push(longToken?.address);
        }

        if (shouldApproveShortToken && shortToken?.address) {
          addresses.push(shortToken.address);
        }

        if (glvInfo && isMarketTokenDeposit && shouldApproveMarketToken && marketToken) {
          addresses.push(marketToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
        if (glvInfo && shouldApproveGlvToken && glvToken?.address) {
          addresses.push(glvToken.address);
        } else if (!glvInfo && shouldApproveMarketToken && marketToken?.address) {
          addresses.push(marketToken.address);
        }
      }

      return uniq(addresses);
    },
    [
      longToken,
      longTokenAmount,
      marketToken,
      marketTokenAmount,
      operation,
      shortToken,
      shortTokenAmount,
      glvToken,
      glvTokenAmount,
      glvInfo,
      tokensAllowanceData,
      isMarketTokenDeposit,
    ]
  );

  return {
    tokensToApprove,
    payTokenAddresses,
    isAllowanceLoading,
    isAllowanceLoaded,
  };
};
