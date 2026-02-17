import { autoUpdate, useFloating, flip, offset, shift, FloatingPortal } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";

import Button from "components/Button/Button";

import EditIcon from "img/ic_edit.svg?react";
import IncreaseLimit from "img/ic_increaselimit_16.svg?react";
import IncreaseMarket from "img/ic_increasemarket_16.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import SelectIcon from "img/ic_select.svg?react";
import ShareIcon from "img/ic_share.svg?react";
import TriggerClose from "img/ic_triggerclose_16.svg?react";
import IncreaseStopMarket from "img/tokens/ic_box_chevron_up.svg?react";

import "./PositionDropdown.css";

type Props = {
  handleEditCollateral?: () => void;
  handleShare?: () => void;
  handleMarketSelect?: () => void;
  handleMarketIncreaseSize?: () => void;
  handleLimitIncreaseSize?: () => void;
  handleStopMarketIncreaseSize?: () => void;
  handleTwapIncreaseSize?: () => void;
  handleTriggerClose?: () => void;
  disabled?: boolean;
};

export default function PositionDropdown({
  handleEditCollateral,
  handleShare,
  handleMarketSelect,
  handleMarketIncreaseSize,
  handleLimitIncreaseSize,
  handleStopMarketIncreaseSize,
  handleTwapIncreaseSize,
  handleTriggerClose,
  disabled,
}: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset({ mainAxis: 8 }), flip(), shift()],
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  });

  if (disabled) {
    return (
      <Button variant="ghost" disabled>
        <MenuDotsIcon fontSize={14} fontWeight={500} className="text-typography-secondary" />
      </Button>
    );
  }

  return (
    <Menu>
      <Menu.Button as="div" ref={refs.setReference}>
        <Button variant="ghost">
          <MenuDotsIcon
            fontSize={14}
            fontWeight={500}
            className="text-typography-secondary hover:text-typography-primary"
          />
        </Button>
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          className="PositionDropdown-menu-items menu-items"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          {handleMarketSelect && (
            <Menu.Item>
              <div className="menu-item" onClick={handleMarketSelect}>
                <SelectIcon className="size-16" />
                <p>
                  <Trans>Select market</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleEditCollateral && (
            <Menu.Item>
              <div className="menu-item" onClick={handleEditCollateral}>
                <EditIcon width={16} height={16} />
                <p>
                  <Trans>Edit collateral</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleMarketIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleMarketIncreaseSize}>
                <IncreaseMarket className="size-16" />
                <p>
                  <Trans>Increase size (Market)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleLimitIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleLimitIncreaseSize}>
                <IncreaseLimit className="size-16" />
                <p>
                  <Trans>Increase size (Limit)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleStopMarketIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleStopMarketIncreaseSize}>
                <IncreaseStopMarket className="size-16" />
                <p>
                  <Trans>Increase size (Stop Market)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleTwapIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleTwapIncreaseSize}>
                <IncreaseMarket className="size-16" />
                <p>
                  <Trans>Increase size (TWAP)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleTriggerClose && (
            <Menu.Item>
              <div className="menu-item" onClick={handleTriggerClose}>
                <TriggerClose className="size-16" />
                <p>
                  <Trans>Set TP/SL</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleShare && (
            <Menu.Item>
              <div className="menu-item" onClick={handleShare}>
                <ShareIcon className="size-16" />
                <p>
                  <Trans>Share position</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
        </Menu.Items>
      </FloatingPortal>
    </Menu>
  );
}
