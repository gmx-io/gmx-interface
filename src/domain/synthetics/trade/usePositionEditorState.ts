import { SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
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

export type PositionEditorDepositMode = "now" | "atPrice";

export type PositionEditorAtPriceOpenRequest = {
  positionKey: string;
  collateralInputValue?: string;
  triggerPriceInputValue?: string;
  replacingOrderKey?: string;
};

export function usePositionEditorState(chainId: ContractsChainId, srcChainId: SourceChainId | undefined) {
  // const expressOrdersEnabled = useSelector(selectExpressOrdersEnabled);
  const { expressOrdersEnabled } = useSettings();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();
  const [collateralInputValue, setCollateralInputValue] = useState("");
  const [depositMode, setDepositMode] = useState<PositionEditorDepositMode>("now");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState("");
  const [replacingOrderKey, setReplacingOrderKey] = useState<string>();
  const [atPriceOpenRequest, setAtPriceOpenRequest] = useState<PositionEditorAtPriceOpenRequest>();
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

  const resetAtPriceState = useCallback(() => {
    setDepositMode("now");
    setTriggerPriceInputValue("");
    setReplacingOrderKey(undefined);
    setAtPriceOpenRequest(undefined);
  }, []);

  const updateEditingPositionKey = useCallback(
    (positionKey: SetStateAction<string | undefined>) => {
      resetAtPriceState();
      setEditingPositionKey(positionKey);
    },
    [resetAtPriceState]
  );

  const openAtPrice = useCallback((request: PositionEditorAtPriceOpenRequest) => {
    setDepositMode("atPrice");
    setTriggerPriceInputValue(request.triggerPriceInputValue ?? "");
    setReplacingOrderKey(request.replacingOrderKey);
    setAtPriceOpenRequest(request);
    setEditingPositionKey(request.positionKey);
  }, []);

  const clearAtPriceOpenRequest = useCallback(() => {
    setAtPriceOpenRequest(undefined);
  }, []);

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
    updateEditingPositionKey(undefined);
    setCollateralInputValue("");
    setStoredIsCollateralTokenFromGmxAccount(srcChainId !== undefined);
  }, [updateEditingPositionKey, setStoredIsCollateralTokenFromGmxAccount, srcChainId]);

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
      setEditingPositionKey: updateEditingPositionKey,
      collateralInputValue,
      setCollateralInputValue,
      selectedCollateralAddressMap,
      setSelectedCollateralAddress,
      isCollateralTokenFromGmxAccount,
      setIsCollateralTokenFromGmxAccount,
      depositMode,
      setDepositMode,
      triggerPriceInputValue,
      setTriggerPriceInputValue,
      replacingOrderKey,
      setReplacingOrderKey,
      atPriceOpenRequest,
      clearAtPriceOpenRequest,
      openAtPrice,
    }),
    [
      collateralInputValue,
      editingPositionKey,
      updateEditingPositionKey,
      selectedCollateralAddressMap,
      setSelectedCollateralAddress,
      isCollateralTokenFromGmxAccount,
      setIsCollateralTokenFromGmxAccount,
      depositMode,
      triggerPriceInputValue,
      replacingOrderKey,
      atPriceOpenRequest,
      clearAtPriceOpenRequest,
      openAtPrice,
    ]
  );
}
