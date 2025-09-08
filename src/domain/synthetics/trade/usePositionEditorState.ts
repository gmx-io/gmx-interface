import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Address } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  getSyntheticsCollateralEditAddressMapKey,
  getSyntheticsCollateralEditTokenIsFromGmxAccountMapKey,
} from "config/localStorage";
import { isSettlementChain } from "config/multichain";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { parsePositionKey } from "../positions";
export type PositionEditorState = ReturnType<typeof usePositionEditorState>;

export function usePositionEditorState(chainId: ContractsChainId, srcChainId: SourceChainId | undefined) {
  // const expressOrdersEnabled = useSelector(selectExpressOrdersEnabled);
  const { expressOrdersEnabled } = useSettings();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();
  const [collateralInputValue, setCollateralInputValue] = useState("");
  const [selectedCollateralAddressMap, setSelectedCollateralAddressMap] = useLocalStorageSerializeKey<
    Partial<Record<Address, Address>>
  >(getSyntheticsCollateralEditAddressMapKey(chainId), {});
  const [_isCollateralTokenFromGmxAccount, _setIsCollateralTokenFromGmxAccount] = useLocalStorageSerializeKey<boolean>(
    getSyntheticsCollateralEditTokenIsFromGmxAccountMapKey(chainId),
    false
  );

  let isCollateralTokenFromGmxAccount = false;
  if (srcChainId !== undefined) {
    isCollateralTokenFromGmxAccount = true;
  } else if (!isSettlementChain(chainId)) {
    isCollateralTokenFromGmxAccount = false;
  } else {
    isCollateralTokenFromGmxAccount = Boolean(_isCollateralTokenFromGmxAccount);
  }

  let setIsCollateralTokenFromGmxAccount: (value: boolean) => void;
  if (srcChainId !== undefined) {
    setIsCollateralTokenFromGmxAccount = noop;
  } else if (!isSettlementChain(chainId)) {
    setIsCollateralTokenFromGmxAccount = noop;
  } else {
    setIsCollateralTokenFromGmxAccount = _setIsCollateralTokenFromGmxAccount;
  }

  const setSelectedCollateralAddress = useCallback(
    (selectedCollateralAddress: Address) => {
      if (!editingPositionKey) {
        return;
      }

      const { collateralAddress } = parsePositionKey(editingPositionKey);

      setSelectedCollateralAddressMap((prev) => ({ ...prev, [collateralAddress]: selectedCollateralAddress }));
    },
    [editingPositionKey, setSelectedCollateralAddressMap]
  );

  useEffect(() => {
    setEditingPositionKey(undefined);
    setCollateralInputValue("");
    _setIsCollateralTokenFromGmxAccount(srcChainId !== undefined);
  }, [_setIsCollateralTokenFromGmxAccount, chainId, srcChainId]);

  useEffect(
    function fallbackIsCollateralTokenFromGmxAccount() {
      if (expressOrdersEnabled) {
        return;
      }

      if (isCollateralTokenFromGmxAccount && !expressOrdersEnabled) {
        setIsCollateralTokenFromGmxAccount(false);
      }
    },
    [expressOrdersEnabled, isCollateralTokenFromGmxAccount, setIsCollateralTokenFromGmxAccount]
  );

  return useMemo(
    () => ({
      editingPositionKey,
      setEditingPositionKey,
      collateralInputValue,
      setCollateralInputValue,
      selectedCollateralAddressMap,
      setSelectedCollateralAddress,
      isCollateralTokenFromGmxAccount,
      setIsCollateralTokenFromGmxAccount,
    }),
    [
      collateralInputValue,
      editingPositionKey,
      selectedCollateralAddressMap,
      setSelectedCollateralAddress,
      isCollateralTokenFromGmxAccount,
      setIsCollateralTokenFromGmxAccount,
    ]
  );
}
