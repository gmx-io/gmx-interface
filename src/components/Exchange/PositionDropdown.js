import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import { HiDotsVertical } from "react-icons/hi";
import { AiOutlineEdit } from "react-icons/ai";
import { BiSelectMultiple } from "react-icons/bi";
import { RiShareBoxFill } from "react-icons/ri";
import "./PositionDropdown.css";

function PositionDropdown({ handleEditCollateral, handleShare, handleMarketSelect }) {
  return (
    <Menu>
      <Menu.Button as="div">
        <button className="PositionDropdown-dots-icon">
          <HiDotsVertical fontSize={20} fontWeight={700} />
        </button>
      </Menu.Button>
      <div className="PositionDropdown-extra-options">
        <Menu.Items as="div" className="menu-items">
          <Menu.Item>
            <div className="menu-item" onClick={handleEditCollateral}>
              <AiOutlineEdit fontSize={16} />
              <p>
                <Trans>Edit Collateral</Trans>
              </p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={handleMarketSelect}>
              <BiSelectMultiple fontSize={16} />
              <p>
                <Trans>Select Market</Trans>
              </p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={handleShare}>
              <RiShareBoxFill fontSize={16} />
              <p>
                <Trans>Share Position</Trans>
              </p>
            </div>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default PositionDropdown;
