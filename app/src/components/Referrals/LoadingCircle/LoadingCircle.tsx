import React from 'react';
import loadingSvg from '@/img/Loading.svg';

interface LoadingComponentProps {
    text?: string;
}

const LoadingComponent: React.FC<LoadingComponentProps> = ({ text
}) => {
    return (
        <div>
            <img
                src={loadingSvg}
                alt="Loading"
                className="animate-spin"
                style={{ width: '1.6rem', height: '1.6rem' }}
            />
        </div>
    );
};

export default LoadingComponent;

