const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const WS_URL   = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let socket = null;
let connectPromise = null;

export function connectSocket() {
  if (socket) return Promise.resolve(socket);
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    if (USE_MOCK) {
      const { createMockSocket } = await import('../mocks/socket-mock.js');
      socket = createMockSocket();
    } else {
      const { io } = await import('socket.io-client');
      socket = io(WS_URL, {
        withCredentials: true,     // session cookie on handshake
        transports: ['websocket'],
        autoConnect: true,
      });
    }
    return socket;
  })();

  return connectPromise;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  if (socket?.disconnect) socket.disconnect();
  socket = null;
  connectPromise = null;
}