import { isSettlementChain } from "config/multichain";
import { useChainId } from "lib/chains";

import { AddressDropdownWithMultichain } from "./AddressDropdownWithMultichain";
import { AddressDropdownWithoutMultichain } from "./AddressDropdownWithoutMultichain";

type Props = {
  account: string;
};

export function AddressDropdown({ account }: Props) {
  const { chainId } = useChainId();

  if (!isSettlementChain(chainId)) {
    return <AddressDropdownWithoutMultichain account={account} />;
  }

  return <AddressDropdownWithMultichain account={account} />;
}
