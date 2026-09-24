import React, { useEffect, useRef } from 'react';
import './countPanel.scss';

interface CountPanelProps {
    amount: string;
    showCountPanel?: boolean;
    onClose?: () => void;
}

const CountPanel: React.FC<CountPanelProps> = ({ amount, showCountPanel, onClose }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };

        if (showCountPanel) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCountPanel, onClose]);

    return (
        <>
            {
                showCountPanel &&
                <div className={`count-panel-wrapper`} ref={panelRef}>
                    <div className="count-panel">
                        <span className="amount">{amount}</span>
                    </div>
                </div >

            }
        </>
    );
};

export default CountPanel;