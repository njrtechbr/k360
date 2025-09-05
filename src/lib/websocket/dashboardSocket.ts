import { WebSocket, WebSocketServer } from 'ws';
import { DashboardUpdate, WebSocketMessage } from '@/types/dashboard';

class DashboardSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.initializeServer();
  }

  private initializeServer() {
    // Em desenvolvimento, criamos um servidor WebSocket separado
    // Em produção, isso seria integrado com o servidor Next.js
    if (process.env.NODE_ENV === 'development') {
      this.wss = new WebSocketServer({ port: 8080 });
      
      this.wss.on('connection', (ws: WebSocket) => {
        this.handleConnection(ws);
      });

      console.log('Dashboard WebSocket server iniciado na porta 8080');
    }
  }

  handleConnection(socket: WebSocket): void {
    console.log('Nova conexão WebSocket estabelecida');
    
    this.clients.add(socket);

    // Enviar mensagem de boas-vindas
    const welcomeMessage: WebSocketMessage = {
      type: 'connect',
      payload: { message: 'Conectado ao dashboard em tempo real' },
      timestamp: new Date()
    };
    
    socket.send(JSON.stringify(welcomeMessage));

    // Configurar handlers de eventos
    socket.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(socket, message);
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });

    socket.on('close', () => {
      console.log('Conexão WebSocket fechada');
      this.clients.delete(socket);
    });

    socket.on('error', (error) => {
      console.error('Erro na conexão WebSocket:', error);
      this.clients.delete(socket);
    });
  }

  private handleMessage(socket: WebSocket, message: any): void {
    // Processar mensagens recebidas do cliente
    console.log('Mensagem recebida:', message);
    
    // Aqui podemos implementar diferentes tipos de mensagens
    switch (message.type) {
      case 'ping':
        socket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date()
        }));
        break;
      
      case 'subscribe':
        // Cliente se inscrevendo em atualizações específicas
        console.log('Cliente inscrito em:', message.payload);
        break;
        
      default:
        console.log('Tipo de mensagem não reconhecido:', message.type);
    }
  }

  broadcastToAll(message: DashboardUpdate): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
    
    console.log(`Broadcast enviado para ${this.clients.size} clientes`);
  }

  // Métodos para diferentes tipos de eventos
  onEvaluationCreated(evaluation: any): void {
    const update: DashboardUpdate = {
      type: 'evaluation',
      data: evaluation,
      timestamp: new Date()
    };
    
    this.broadcastToAll(update);
  }

  onXpEventCreated(xpEvent: any): void {
    const update: DashboardUpdate = {
      type: 'xp',
      data: xpEvent,
      timestamp: new Date()
    };
    
    this.broadcastToAll(update);
  }

  onAchievementUnlocked(achievement: any): void {
    const update: DashboardUpdate = {
      type: 'achievement',
      data: achievement,
      timestamp: new Date()
    };
    
    this.broadcastToAll(update);
  }

  // Método para forçar atualização completa
  triggerFullRefresh(): void {
    const update: DashboardUpdate = {
      type: 'full_refresh',
      data: { message: 'Atualizando todos os dados' },
      timestamp: new Date()
    };
    
    this.broadcastToAll(update);
  }

  // Método para obter estatísticas do servidor
  getStats() {
    return {
      connectedClients: this.clients.size,
      serverRunning: this.wss !== null,
      port: 8080
    };
  }

  // Método para fechar o servidor
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.clients.clear();
    console.log('Dashboard WebSocket server fechado');
  }
}

// Singleton instance
export const dashboardSocketServer = new DashboardSocketServer();

export default DashboardSocketServer;