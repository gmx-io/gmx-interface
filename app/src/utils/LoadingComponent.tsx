import React from 'react';
import loadingSvg from '@/img/Loading.svg';

interface LoadingComponentProps {
    text?: string;
}

const LoadingComponent: React.FC<LoadingComponentProps> = ({ 
    text = 'Loading data...' 
}) => {
    return (
        <div className="flex h-full w-full items-center justify-center gap-5">
            <img 
                src={loadingSvg} 
                alt="Loading" 
                className="animate-spin"
                style={{ width: '1.6rem', height: '1.6rem' }}
            />
            <span className="text-[#A3A3A3] text-[1.2rem] font-[500]">{text}</span>
        </div>
    );
};

export default LoadingComponent;

