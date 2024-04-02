import { useEffect, useMemo, useState } from "react";

export type PositionEditorState = ReturnType<typeof usePositionEditorState>;

export function usePositionEditorState(chainId: number) {
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  useEffect(() => {
    setEditingPositionKey(undefined);
  }, [chainId]);

  return useMemo(
    () => ({
      editingPositionKey,
      setEditingPositionKey,
    }),
    [editingPositionKey, setEditingPositionKey]
  );
}
