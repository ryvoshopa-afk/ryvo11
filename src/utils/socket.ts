import { io, Socket } from "socket.io-client";

// Connect to the current window origin in both development and production
const socketUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export const socket: Socket = io(socketUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
export default socket;
