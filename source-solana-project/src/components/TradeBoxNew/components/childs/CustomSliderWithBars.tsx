import React, { useMemo } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface CustomSliderWithBarsProps {
  value: number;
  onChange: (value: number) => void;
  onBeforeChange?: () => void;
  onAfterChange?: () => void;
}

const CustomSliderWithBars: React.FC<CustomSliderWithBarsProps> = ({ 
  value, 
  onChange, 
  onBeforeChange, 
  onAfterChange 
}) => {
  const totalBars = 100;
  const barSpacing = 3;
  const barHeight = 10;

  const bars = useMemo(() => {
    return Array.from({ length: totalBars }, (_, index) => {
      const barValue = index + 1;
      const isActive = barValue <= value;
      
      return {
        id: index,
        value: barValue,
        isActive,
        color: isActive ? '#FA7B4E' : '#535353'
      };
    });
  }, [value]);

  const trackStyle = {
    backgroundColor: 'transparent',
    height: barHeight,
  };

  const railStyle = {
    backgroundColor: 'transparent',
    height: barHeight + 4,
  };

  const handleStyle = {
    borderColor: '#FA7B4E',
    backgroundColor: '#181818',
    borderWidth: 2,
    width: 14,
    height: 14,
    marginTop: -5,
  };

    return (
    <div 
      className="slider-container" 
      style={{ 
        flex: 1,
        padding: '10px 0',
        width: '100%',
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: barHeight + 4,
        }}
      >
        <div 
          className="bars-wrapper"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: barHeight,
            borderRadius: 2,
            overflow: 'hidden',
            pointerEvents: 'none', 
          }}
        >
          <div 
            className="bars-container"
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              gap: `${barSpacing}px`,
            }}
          >
            {bars.map((bar) => (
              <div
                key={bar.id}
                className="slider-bar"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: barHeight,
                  backgroundColor: bar.color,
                  transition: 'background-color 0.2s ease',
                  borderRadius: 1, 
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ 
          position: 'absolute',
          top: -2,
          left: 0,
          width: '100%',
          height: barHeight + 4,
          cursor: 'pointer',
        }}>
          <Slider
            min={0}
            max={100}
            value={value}
            onChange={onChange}
            onBeforeChange={onBeforeChange}
            onAfterChange={onAfterChange}
            trackStyle={trackStyle}
            railStyle={railStyle}
            handleStyle={handleStyle}
          />
        </div>
      </div>

  
      <div 
        className="slider-marks"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          margin: '5px 0 0',
          fontSize: '12px',
          color: '#A3A3A3',
        }}
      >
        <span>0%</span>
        <span>20%</span>
        <span>40%</span>
        <span>60%</span>
        <span>80%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

export default CustomSliderWithBars;