import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.emit('register_user', user._id);

    newSocket.on('notification_chat', (data) => {
      // Check if we are currently looking at this chat room
      // If the URL is exactly '/chat', we might still want to increment if they aren't in that specific room, 
      // but for simplicity we will always increment and let ChatTab clear it when opened.
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const clearUnread = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};
