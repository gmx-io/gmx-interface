import { CSSProperties, useEffect, useMemo, useRef } from "react";

import type { ChartContextMenuState } from "./useChartContextMenu";

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
    <div
      ref={menuRef}
      className="fixed z-[1000] min-w-[240px] -translate-x-full rounded-4 border border-stroke-primary bg-fill-surfaceElevated py-4 shadow-[0_4px_16px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      style={menuStyle}
    >
      {menuState.items.map((item, index) => (
        <button
          key={index}
          type="button"
          className="bg-transparent text-body-small block w-full cursor-pointer whitespace-nowrap border-none px-14 py-10 text-left text-textIcon-primary transition-colors duration-100 hover:bg-button-background"
          onClick={() => item.click()}
        >
          {item.text}
        </button>
      ))}
    </div>
  );
}
