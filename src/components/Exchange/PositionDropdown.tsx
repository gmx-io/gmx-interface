import { autoUpdate, useFloating, flip, offset, shift, FloatingPortal } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import { BiSelectMultiple } from "react-icons/bi";
import { HiDotsVertical } from "react-icons/hi";
import { RiShareBoxFill } from "react-icons/ri";

import Button from "components/Button/Button";

import EditIcon from "img/ic_edit.svg?react";
import increaseLimit from "img/ic_increaselimit_16.svg";
import increaseMarket from "img/ic_increasemarket_16.svg";
import triggerClose from "img/ic_triggerclose_16.svg";

import "./PositionDropdown.css";

type Props = {
  handleEditCollateral?: () => void;
  handleShare?: () => void;
  handleMarketSelect?: () => void;
  handleMarketIncreaseSize?: () => void;
  handleLimitIncreaseSize?: () => void;
  handleStopMarketIncreaseSize?: () => void;
  handleTriggerClose?: () => void;
};

export default function PositionDropdown({
  handleEditCollateral,
  handleShare,
  handleMarketSelect,
  handleMarketIncreaseSize,
  handleLimitIncreaseSize,
  handleStopMarketIncreaseSize,
  handleTriggerClose,
}: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset({ mainAxis: 8 }), flip(), shift()],
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  });

  return (
    <Menu>
      <Menu.Button as="div" ref={refs.setReference}>
        <Button variant="ghost">
          <HiDotsVertical
            fontSize={13}
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
                <BiSelectMultiple fontSize={16} />
                <p>
                  <Trans>Select Market</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleEditCollateral && (
            <Menu.Item>
              <div className="menu-item" onClick={handleEditCollateral}>
                <EditIcon width={16} height={16} />
                <p>
                  <Trans>Edit Collateral</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleMarketIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleMarketIncreaseSize}>
                <img src={increaseMarket} className="size-16" alt="Increase Limit" height={16} />
                <p>
                  <Trans>Increase Size (Market)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleLimitIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleLimitIncreaseSize}>
                <img src={increaseLimit} className="size-16" alt="Increase Limit" height={16} />
                <p>
                  <Trans>Increase Size (Limit)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleStopMarketIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleStopMarketIncreaseSize}>
                <img src={increaseMarket} className="size-16" alt="Increase Stop Market" height={16} />
                <p>
                  <Trans>Increase Size (Stop Market)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleTriggerClose && (
            <Menu.Item>
              <div className="menu-item" onClick={handleTriggerClose}>
                <img src={triggerClose} className="size-16" alt="Increase Limit" height={16} />
                <p>
                  <Trans>Set TP/SL</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleShare && (
            <Menu.Item>
              <div className="menu-item" onClick={handleShare}>
                <RiShareBoxFill fontSize={16} />
                <p>
                  <Trans>Share Position</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
        </Menu.Items>
      </FloatingPortal>
    </Menu>
  );
}
