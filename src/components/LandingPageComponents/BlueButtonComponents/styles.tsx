import styled from 'styled-components';

export const StyledButton = styled.button<{ fontWeight?: string, fontSize?:string, padding?:string, boderColor?:string, bgColor?:string }>`
  font-family: 'Montserrat';

  background: ${({ bgColor }) => (bgColor ? bgColor : '#00b4c9ff')};
  border-radius: 7px;
  border: 1px solid ${({ boderColor }) => (boderColor ? boderColor : 'none')};
  font-weight: ${({ fontWeight }) => (fontWeight ? fontWeight : 'normal')};
  font-size: ${({ fontSize }) => (fontSize ? fontSize : '16px')};
  padding:${({ padding }) => (padding ? padding : '1.5rem 6rem')}; 
  @media (max-width: 1440px) {
      padding: 1.5rem 6rem;   
      font-size:12px;   
    }
  }
  @media (max-width: 425px) {
    padding: 1rem 4rem;   
    font-size: 12px;   
  }
  @media (max-width: 375px) { 
    padding: 1rem 3rem;   
    font-size: 12px;  
  }
  @media (max-width: 320px) { 
    display: flex;
    justify-content: center;
    padding: 0.5rem 5rem;   
    font-size: 8px;  
    width:70%;
    text-align:center;
  }
  
}
`