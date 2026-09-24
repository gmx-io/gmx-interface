import './NetworkSelector.scss';

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { Popover } from '@headlessui/react';
import { t } from '@lingui/macro';
import { useCallback, useState, type PointerEvent } from 'react';
import { useMedia } from 'react-use';

import IconChevronDown from '@/img/network/chevron-down.svg?react';
import IconChevronUp from '@/img/network/chevron-up.svg?react';

import { CURRENT_NETWORK, NETWORKS, type NetworkOption } from './networks';
import OpenGmxModal from './OpenGmxModal';

function NetworkIcon({ network }: { network: NetworkOption }) {
  if (network.id === 'solana') {
    return (
      <span className="NetworkSelector-solana-icon">
        <img src={network.icon} alt="" width={14} height={12} />
      </span>
    );
  }

  return (
    <img
      className="NetworkSelector-icon"
      src={network.icon}
      alt=""
      width={20}
      height={20}
    />
  );
}

export default function NetworkSelector() {
  const hideChevron = useMedia('(max-width: 1024px)');
  const [pendingNetwork, setPendingNetwork] = useState<NetworkOption | null>(
    null
  );

  const { refs, floatingStyles } = useFloating({
    middleware: [offset({ mainAxis: 8 }), flip(), shift()],
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
  });

  const suppressPointerDown = useCallback((e: PointerEvent) => {
    e.stopPropagation();
  }, []);

  const handleSelect = useCallback(
    (network: NetworkOption, close: () => void) => {
      close();
      if (network.isCurrent) {
        return;
      }
      setPendingNetwork(network);
    },
    []
  );

  return (
    <div className="NetworkSelector">
      <Popover>
        {(popoverProps) => (
          <>
            <Popover.Button
              type="button"
              className="NetworkSelector-trigger header-button-container"
              ref={refs.setReference}
              data-qa="network-selector-button"
              aria-label={t`Network`}
            >
              <NetworkIcon network={CURRENT_NETWORK} />
              {!hideChevron &&
                (popoverProps.open ? (
                  <IconChevronUp
                    className="NetworkSelector-chevron"
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                ) : (
                  <IconChevronDown
                    className="NetworkSelector-chevron"
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                ))}
            </Popover.Button>
            {popoverProps.open && (
              <FloatingPortal>
                <Popover.Panel
                  static
                  className="NetworkSelector-dropdown"
                  ref={refs.setFloating}
                  style={floatingStyles}
                  onPointerDown={suppressPointerDown}
                  data-qa="network-selector-dropdown"
                >
                  <div className="NetworkSelector-heading">{t`Network`}</div>
                  <div className="NetworkSelector-list">
                    {NETWORKS.map((network) => (
                      <button
                        key={network.id}
                        type="button"
                        className={
                          network.isCurrent
                            ? 'NetworkSelector-item NetworkSelector-item-active'
                            : 'NetworkSelector-item'
                        }
                        onClick={() =>
                          handleSelect(network, popoverProps.close)
                        }
                      >
                        <NetworkIcon network={network} />
                        <span className="NetworkSelector-name">
                          {network.name}
                        </span>
                        {network.isCurrent && (
                          <span
                            className="NetworkSelector-indicator"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </Popover.Panel>
              </FloatingPortal>
            )}
          </>
        )}
      </Popover>
      <OpenGmxModal
        isVisible={Boolean(pendingNetwork)}
        setIsVisible={(visible) => {
          if (!visible) {
            setPendingNetwork(null);
          }
        }}
        networkName={pendingNetwork?.name ?? ''}
      />
    </div>
  );
}
