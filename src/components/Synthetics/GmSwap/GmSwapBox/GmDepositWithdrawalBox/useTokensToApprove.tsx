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

  marketToken: TokenData;
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

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
  });

  const tokensToApprove = useMemo(
    function getTokensToApprove() {
      const addresses: string[] = [];

      const shouldApproveMarketToken =
        marketTokenAmount !== undefined &&
        marketTokenAmount > 0 &&
        marketToken &&
        getNeedTokenApprove(tokensAllowanceData, marketToken.address, marketTokenAmount);

      const shouldApproveGlvToken =
        glvTokenAmount !== undefined &&
        glvTokenAmount > 0 &&
        glvToken &&
        getNeedTokenApprove(tokensAllowanceData, glvToken.address, glvTokenAmount);

      const shouldApproveLongToken =
        longTokenAmount !== undefined &&
        longTokenAmount > 0 &&
        longToken &&
        getNeedTokenApprove(tokensAllowanceData, longToken.address, longTokenAmount);

      const shouldApproveShortToken =
        shortTokenAmount !== undefined &&
        shortTokenAmount > 0 &&
        shortToken &&
        getNeedTokenApprove(tokensAllowanceData, shortToken.address, shortTokenAmount);

      if (operation === Operation.Deposit) {
        if (shouldApproveLongToken) {
          addresses.push(longToken.address);
        }

        if (shouldApproveShortToken) {
          addresses.push(shortToken.address);
        }

        if (glvInfo && isMarketTokenDeposit && shouldApproveMarketToken) {
          addresses.push(marketToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
        if (glvInfo && shouldApproveGlvToken) {
          addresses.push(glvToken.address);
        } else if (!glvInfo && shouldApproveMarketToken) {
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
    isAllowanceLoaded: Boolean(tokensAllowanceData),
  };
};
