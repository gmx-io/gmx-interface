import { Menu } from "@headlessui/react";
import { HiDotsVertical } from "react-icons/hi";
import { AiOutlineEdit } from "react-icons/ai";
import { BiSelectMultiple } from "react-icons/bi";
import { FiShare2 } from "react-icons/fi";
import "./PositionDropdown.css";

function PositionDropdown({ editPosition, sharePosition, onPositionClick, position }) {
  return (
    <Menu>
      <Menu.Button as="div">
        <button className="dots">
          <HiDotsVertical fontSize={20} fontWeight={700} />
        </button>
      </Menu.Button>
      <div className="extra-options">
        <Menu.Items as="div" className="menu-items">
          <Menu.Item>
            <div className="menu-item" onClick={() => editPosition(position)}>
              <AiOutlineEdit fontSize={16} />
              <p>Edit Collateral</p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={() => onPositionClick(position)}>
              <BiSelectMultiple fontSize={16} />
              <p>Select Market</p>
            </div>
          </Menu.Item>
          <Menu.Item>
            <div className="menu-item" onClick={() => sharePosition(position)}>
              <FiShare2 fontSize={16} />
              <p>Share Position</p>
            </div>
          </Menu.Item>
        </Menu.Items>
      </div>
    </Menu>
  );
}

export default PositionDropdown;
