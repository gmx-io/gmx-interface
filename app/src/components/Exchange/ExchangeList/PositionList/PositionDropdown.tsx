import './PositionDropdown.scss';

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { Menu } from '@headlessui/react';
import { Trans } from '@lingui/macro';
import Select from '@/img/positionDropDown/Select.svg?react'
import Edit from '@/img/positionDropDown/Edit.svg?react'
import IncreaseMarket from '@/img/positionDropDown/CircleChevronUp.svg?react'
import IncreaseLimit from '@/img/positionDropDown/BoxArrowUp.svg?react'
import TpSl from '@/img/positionDropDown/BoxArrowDown.svg?react'
import External from '@/img/positionDropDown/External.svg?react'
import { HiDotsVertical } from 'react-icons/hi';
type Props = {
  handleEditCollateral?: () => void;
  handleShare?: () => void;
  handleMarketSelect?: () => void;
  handleMarketIncreaseSize?: () => void;
  handleLimitIncreaseSize?: () => void;
  handleTriggerClose?: () => void;
};

export default function PositionDropdown({
  handleEditCollateral,
  handleShare,
  handleMarketSelect,
  handleMarketIncreaseSize,
  handleLimitIncreaseSize,
  handleTriggerClose,
}: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset({ mainAxis: 10 }), flip(), shift()],
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
  });

  return (
    <Menu>
      <Menu.Button as="div" ref={refs.setReference}>
        <button className="PositionDropdown-dots-icon">
          <HiDotsVertical fontSize={20} fontWeight={700} />
        </button>
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          className="PositionDropdown-menu-items menu-items rounded-8 border border-[#535353] bg-[#181818]"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          {handleMarketSelect && (
            <Menu.Item>
              <div className="menu-item" onClick={handleMarketSelect}>
                <Select fontSize={16} />
                <p>
                  <Trans>Select Market</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleEditCollateral && (
            <Menu.Item>
              <div className="menu-item" onClick={handleEditCollateral}>
                <Edit fontSize={16} />
                <p>
                  <Trans>Edit Collateral</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleMarketIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleMarketIncreaseSize}>
                <IncreaseMarket fontSize={16} />
                <p>
                  <Trans>Increase Size (Market)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleLimitIncreaseSize && (
            <Menu.Item>
              <div className="menu-item" onClick={handleLimitIncreaseSize}>
                <IncreaseLimit fontSize={16} />
                <p>
                  <Trans>Increase Size (Limit)</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleTriggerClose && (
            <Menu.Item>
              <div className="menu-item" onClick={handleTriggerClose}>
                <TpSl fontSize={16} />
                <p>
                  <Trans>Set TP/SL</Trans>
                </p>
              </div>
            </Menu.Item>
          )}
          {handleShare && (
            <Menu.Item>
              <div className="menu-item" onClick={handleShare}>
                <External fontSize={16} />
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
