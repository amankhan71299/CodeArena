'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if the user is authenticated
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      path: '/socket.io',
      // We rely on the default ['polling', 'websocket'] transport order.
      // Forcing ['websocket'] first often causes a harmless but noisy 'websocket error' 
      // during the initial cross-origin handshake before it falls back to polling.
    });

    let pollErrorLogged = false;

    socketInstance.on('connect_error', (err) => {
      if (err.message === 'xhr poll error') {
        if (!pollErrorLogged) {
          // Log exactly once as a normal info log instead of a noisy warning
          console.log('[Socket.IO] Waiting for backend to become available...');
          pollErrorLogged = true;
        }
      } else {
        console.warn(`[Socket.IO] connect_error: ${err.message}`, err.description || '');
      }
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket.IO] Connected! ID: ${socketInstance.id}, Transport: ${socketInstance.io.engine.transport.name}`);
      
      socketInstance.io.engine.on('upgrade', () => {
        console.log(`[Socket.IO] Upgraded transport to: ${socketInstance.io.engine.transport.name}`);
      });
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected. Reason: ${reason}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
