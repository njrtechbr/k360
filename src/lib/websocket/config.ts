// Configurações do WebSocket server
export const WEBSOCKET_CONFIG = {
  // Porta do servidor WebSocket (desenvolvimento)
  PORT: process.env.WEBSOCKET_PORT
    ? parseInt(process.env.WEBSOCKET_PORT)
    : 8080,

  // URL do WebSocket para o cliente
  CLIENT_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080",

  // Configurações de reconexão
  RECONNECT_INTERVAL: 3000, // 3 segundos
  MAX_RECONNECT_ATTEMPTS: 5,

  // Configurações de ping/pong
  PING_INTERVAL: 30000, // 30 segundos
  PONG_TIMEOUT: 5000, // 5 segundos

  // Configurações de rate limiting
  MAX_MESSAGES_PER_MINUTE: 60,

  // Configurações de broadcast
  BROADCAST_DEBOUNCE: 1000, // 1 segundo
} as const;

// Tipos de eventos suportados
export const WEBSOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  UPDATE: "update",
  ERROR: "error",
  PING: "ping",
  PONG: "pong",
  SUBSCRIBE: "subscribe",
  UNSUBSCRIBE: "unsubscribe",
} as const;

// Tipos de atualizações do dashboard
export const DASHBOARD_UPDATE_TYPES = {
  EVALUATION: "evaluation",
  XP: "xp",
  ACHIEVEMENT: "achievement",
  FULL_REFRESH: "full_refresh",
} as const;
