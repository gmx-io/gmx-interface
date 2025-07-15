import React from "react";

interface PumpIconProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

const PumpIcon: React.FC<PumpIconProps> = ({ className = "", width = 40, height = 40, alt = "Pump icon" }) => {
  return (
    <figure className={className}>
      <picture>
        <source srcSet="/src/img/ic_pump_40.svg" type="image/svg+xml" />
        <img src="/src/img/ic_pump_40.png" alt={alt} width={width} height={height} />
      </picture>
    </figure>
  );
};

export default PumpIcon;
