import React, { FC } from 'react';
import { StyledButton } from './styles';
    
export const GradientButton: FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { fontWeight?: string, fontSize?:string, padding?:string }
> = (props) => {
  return (
    <StyledButton fontWeight={props.fontWeight} fontSize={props.fontSize} padding={props.padding} {...props}>
      {props.children}
    </StyledButton>
  );
};
