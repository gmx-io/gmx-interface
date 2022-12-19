import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import { StyledButton } from './styles';
    
export const GradientButton: FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { fontWeight?: string, fontSize?:string, padding?:string, boderColor?:string, 
  bgColor?:string }
> = (props) => {
  return (
    
    <StyledButton fontWeight={props.fontWeight} fontSize={props.fontSize} padding={props.padding} boderColor={props.boderColor}
    bgColor={props.bgColor} {...props}>
      {props.children}
    </StyledButton>
    
  );
};
