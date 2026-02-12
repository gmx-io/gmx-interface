import { CSSProperties, useEffect, useMemo, useRef } from "react";

import type { ChartContextMenuState } from "./useChartContextMenu";

import "./ChartContextMenu.scss";

interface ChartContextMenuProps {
  menuState: ChartContextMenuState;
  onClose: () => void;
}

export function ChartContextMenu({ menuState, onClose }: ChartContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const menuStyle = useMemo<CSSProperties>(
    () => ({
      left: menuState.x - 14,
      top: menuState.y,
    }),
    [menuState.x, menuState.y]
  );

  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuState.isOpen, onClose]);

  if (!menuState.isOpen) {
    return null;
  }

  return (
    <div ref={menuRef} className="ChartContextMenu" style={menuStyle}>
      {menuState.items.map((item, index) => (
        <button key={index} className="ChartContextMenu-item" onClick={() => item.click()}>
          {item.text}
        </button>
      ))}
    </div>
  );
}
