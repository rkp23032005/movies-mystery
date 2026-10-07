import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '');

export function useSocket(roomCode, handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers; // always call the latest callbacks (avoids stale closures)

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !roomCode) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-room', roomCode));

    // Register all handlers passed in
    Object.keys(handlers).forEach((event) =>
      socket.on(event, (...args) => handlersRef.current[event]?.(...args))
    );

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  return socketRef;
}
