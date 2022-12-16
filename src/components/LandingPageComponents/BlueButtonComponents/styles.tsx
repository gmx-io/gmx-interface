import styled from 'styled-components';

export const StyledButton = styled.button<{ fontWeight?: string, fontSize?:string, padding?:string }>`
  font-family: 'Montserrat';
  padding: 1.5rem 6rem;
  background: #00b4c9ff;
  border-radius: 7px;
  font-weight: ${({ fontWeight }) => (fontWeight ? fontWeight : 'normal')};
  font-size: ${({ fontSize }) => (fontSize ? fontSize : '16px')};
  padding:${({ padding }) => (padding ? padding : '1.5rem 6rem')};
`