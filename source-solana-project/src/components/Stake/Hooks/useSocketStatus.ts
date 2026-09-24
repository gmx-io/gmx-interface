import { useState, useEffect } from 'react';
import {
  socketStatus,
  startStakeWsClient,
  subscribeToStatusChange,
} from '../wsClient';

export const useSocketStatus = () => {
  const [isConnected, setIsConnected] = useState(socketStatus.isConnected);

  useEffect(() => {
    setIsConnected(socketStatus.isConnected);
    console.log('socketStatus initial check:', socketStatus.isConnected);
    startStakeWsClient();

    const unsubscribe = subscribeToStatusChange((newStatus) => {
      setIsConnected(newStatus.isConnected);
      console.log('socketStatus updated via subscription:', newStatus.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []); 

  // Error reported when retrying for three times
  return { isConnected };
}
