import { getSyntheticsCollateralEditAddressKey, getSyntheticsCollateralEditAddressMapKey } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SUPPORTED_CHAIN_IDS } from "sdk/configs/chains";
import { getTokens } from "sdk/configs/tokens";
import { Address } from "viem";
import { parsePositionKey } from "../positions";

export type PositionEditorState = ReturnType<typeof usePositionEditorState>;

// start script to migrate getSyntheticsCollateralEditAddressKey to getSyntheticsCollateralEditAddressMapKey

for (const chainId of SUPPORTED_CHAIN_IDS) {
  const mapKey = getSyntheticsCollateralEditAddressMapKey(chainId);
  const alreadyExists = localStorage.getItem(JSON.stringify(mapKey));
  if (alreadyExists) {
    continue;
  }
  const map = {};
  for (const token of getTokens(chainId)) {
    const key = getSyntheticsCollateralEditAddressKey(chainId, token.address);
    const rawValue = localStorage.getItem(JSON.stringify(key));
    if (!rawValue) {
      continue;
    }
    map[token.address] = JSON.parse(rawValue);

    localStorage.removeItem(JSON.stringify(key));
  }

  localStorage.setItem(JSON.stringify(mapKey), JSON.stringify(map));
}

export function usePositionEditorState(chainId: number) {
  const [editingPositionKey, setEditingPositionKey] = useState<string>();
  const [collateralInputValue, setCollateralInputValue] = useState("");
  const [selectedCollateralAddressMap, setSelectedCollateralAddressMap] = useLocalStorageSerializeKey<
    Partial<Record<Address, Address>>
  >(getSyntheticsCollateralEditAddressMapKey(chainId), {});

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
  }, [chainId]);

  return useMemo(
    () => ({
      editingPositionKey,
      setEditingPositionKey,
      collateralInputValue,
      setCollateralInputValue,
      selectedCollateralAddressMap,
      setSelectedCollateralAddress,
    }),
    [collateralInputValue, editingPositionKey, selectedCollateralAddressMap, setSelectedCollateralAddress]
  );
}
