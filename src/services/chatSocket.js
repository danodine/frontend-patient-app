/**
 * Socket.IO client for real-time chat (chat:newMessage, chat:messageRead).
 * Connect when authenticated; disconnect on logout.
 * Does not hold a reference to the store — the app passes dispatch/callbacks when subscribing.
 */
import { io } from "socket.io-client";
import { BASE_URL } from "../../config";

let socket = null;

export const chatSocket = {
  connect(token) {
    if (socket?.connected) return socket;
    if (socket) socket.disconnect();
    socket = io(BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  on(event, callback) {
    if (socket) socket.on(event, callback);
  },

  off(event) {
    if (socket) socket.off(event);
  },

  getSocket() {
    return socket;
  },
};
