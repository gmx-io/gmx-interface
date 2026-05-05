import { Trans } from "@lingui/macro";
import { useHistory } from "react-router-dom";

import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import type { ArbitraryExpressError } from "domain/multichain/arbitraryRelayParams";
import { useChainId } from "lib/chains";
import { convertTokenAddress } from "sdk/configs/tokens";
import type { TokenData } from "sdk/utils/tokens/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";

export function OutOfTokenErrorAlert({
  errors,
  token,
  onClose,
}: {
  errors: ArbitraryExpressError | undefined;
  token: TokenData | undefined;
  onClose: () => void;
}) {
  const history = useHistory();
  const { chainId } = useChainId();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  if (!errors?.isOutOfTokenError || !token) {
    return null;
  }

  return (
    <AlertInfoCard type="error" hideClose>
      <div>
        <Trans>
          Claiming requires{" "}
          <Amount
            amount={errors.isOutOfTokenError.requiredAmount ?? 0n}
            decimals={token.decimals}
            isStable={token.isStable}
            symbol={token.symbol}
            showZero
          />{" "}
          while you have{" "}
          <Amount
            amount={token.gmxAccountBalance ?? 0n}
            decimals={token.decimals}
            isStable={token.isStable}
            symbol={token.symbol}
            showZero
          />
          .{" "}
          <span
            className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
            onClick={() => {
              onClose();
              history.push(`/trade/swap?to=${token.symbol}`);
            }}
          >
            Swap
          </span>{" "}
          or{" "}
          <span
            className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
            onClick={() => {
              onClose();
              setDepositViewTokenAddress(convertTokenAddress(chainId, token.address, "native"));
              setGmxAccountModalOpen("deposit");
            }}
          >
            deposit
          </span>{" "}
          more {token.symbol} to your GMX Account.
        </Trans>
      </div>
    </AlertInfoCard>
  );
}
