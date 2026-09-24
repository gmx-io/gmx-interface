import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let savedScrollBarWidth = 0;

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      lockCount++;
      
      if (lockCount === 1) {
        savedScrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        savedScrollY = window.scrollY;
        
        document.body.style.position = 'fixed';
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        
        if (savedScrollBarWidth > 0) {
          document.body.style.paddingRight = `${savedScrollBarWidth}px`;
        }
      }

      return () => {
        lockCount--;
        
        if (lockCount === 0) {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          
          window.scrollTo(0, savedScrollY);
        }
      };
    }
  }, [isLocked]);
}
