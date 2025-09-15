import { useCallback, useEffect, useMemo, useState } from "react";
import { Address } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  getSyntheticsCollateralEditAddressMapKey,
  getSyntheticsCollateralEditTokenIsFromGmxAccountMapKey,
} from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useIsGmxAccount } from "domain/multichain/useIsGmxAccount";
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
  const [storedIsCollateralTokenFromGmxAccount, setStoredIsCollateralTokenFromGmxAccount] =
    useLocalStorageSerializeKey<boolean>(getSyntheticsCollateralEditTokenIsFromGmxAccountMapKey(chainId), false);

  const [isCollateralTokenFromGmxAccount, setIsCollateralTokenFromGmxAccount] = useIsGmxAccount({
    chainId,
    srcChainId,
    storedIsGmxAccount: storedIsCollateralTokenFromGmxAccount,
    setStoredIsGmxAccount: setStoredIsCollateralTokenFromGmxAccount,
  });

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
    setStoredIsCollateralTokenFromGmxAccount(srcChainId !== undefined);
  }, [setStoredIsCollateralTokenFromGmxAccount, srcChainId]);

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
