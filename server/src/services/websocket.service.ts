import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { 
  WebSocketMessage, 
  StocksUpdateMessage, 
  AlertMessage, 
  ScrapingStatusMessage 
} from '@/types/api.interface';
import { StockData, StockUpdate, ScrapingResult } from '@/types/stock.interface';
import { StockService } from './stock.service';

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  connectedAt: Date;
}

export class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout;
  private stockService: StockService;

  constructor(port: number, stockService: StockService) {
    this.stockService = stockService;
    this.wss = new WebSocket.Server({ 
      port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          windowBits: 13,
          memLevel: 7,
        },
        zlibInflateOptions: {
          chunkSize: 1024,
          windowBits: 13,
          memLevel: 7,
        },
        concurrencyLimit: 10,
        threshold: 1024,
      }
    });

    this.setupServer();
    this.startHeartbeat();
    
    console.log(`WebSocket server started on port ${port}`);
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = uuidv4();
      const client: ConnectedClient = {
        id: clientId,
        ws,
        isAlive: true,
        connectedAt: new Date()
      };

      this.clients.set(clientId, client);
      console.log(`Client ${clientId} connected. Total clients: ${this.clients.size}`);

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'CONNECTION',
        payload: { 
          clientId, 
          message: 'Connected successfully',
          serverTime: new Date()
        },
        timestamp: new Date()
      });

      // Automatically send current data to new clients
      setTimeout(() => {
        this.sendCurrentDataToClient(clientId);
      }, 1000); // Wait 1 second for connection to stabilize

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`Error parsing message from client ${clientId}:`, error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      ws.on('close', (code: number, reason: Buffer) => {
        console.log(`Client ${clientId} disconnected. Code: ${code}, Reason: ${reason.toString()}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
        }
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private async handleClientMessage(clientId: string, message: any): Promise<void> {
    console.log(`Received message from client ${clientId}:`, message);
    
    switch (message.type) {
      case 'PING':
        this.sendToClient(clientId, {
          type: 'CONNECTION',
          payload: { message: 'pong' },
          timestamp: new Date()
        });
        break;
        
      case 'REQUEST_LATEST_DATA':
        // Send current stock data immediately
        await this.sendCurrentDataToClient(clientId);
        break;
        
      default:
        console.warn(`Unknown message type from client ${clientId}:`, message.type);
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  private async sendCurrentDataToClient(clientId: string): Promise<void> {
    try {
      const stocks = await this.stockService.getLatestStocks();
      const updates = await this.stockService.getStockUpdates();
      
      if (stocks.length > 0) {
        const message: StocksUpdateMessage = {
          type: 'STOCKS_UPDATE',
          payload: {
            stocks,
            updates,
            scrapingResult: {
              success: true,
              data: stocks,
              timestamp: new Date(),
              totalStocks: stocks.length
            }
          },
          timestamp: new Date()
        };
        
        this.sendToClient(clientId, message);
        console.log(`Sent current data (${stocks.length} stocks) to client ${clientId}`);
      } else {
        this.sendToClient(clientId, {
          type: 'CONNECTION',
          payload: { message: 'No current data available' },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`Error sending current data to client ${clientId}:`, error);
      this.sendError(clientId, 'Failed to fetch current data');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`Removing inactive client ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // 30 seconds
  }

  public broadcastStockUpdate(stocks: StockData[], updates: StockUpdate[], scrapingResult: ScrapingResult): void {
    const message: StocksUpdateMessage = {
      type: 'STOCKS_UPDATE',
      payload: {
        stocks,
        updates,
        scrapingResult
      },
      timestamp: new Date()
    };

    this.broadcast(message);
    console.log(`Broadcasted stock update to ${this.clients.size} clients`);
  }

  public broadcastAlert(stock: StockData, update: StockUpdate, alertType: string, alertMessage: string): void {
    const message: AlertMessage = {
      type: 'ALERT',
      payload: {
        stock,
        update,
        alertType,
        message: alertMessage
      },
      timestamp: new Date()
    };

    this.broadcast(message);
    console.log(`Broadcasted alert for ${stock.symbol} to ${this.clients.size} clients`);
  }

  public sendScrapingStatus(status: 'STARTED' | 'SUCCESS' | 'ERROR', message: string, nextRun?: Date): void {
    const statusMessage: ScrapingStatusMessage = {
      type: 'SCRAPING_STATUS',
      payload: {
        status,
        message,
        nextRun
      },
      timestamp: new Date()
    };

    this.broadcast(statusMessage);
  }

  private broadcast(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    const deadClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageString);
        } catch (error) {
          console.error(`Error sending message to client ${clientId}:`, error);
          deadClients.push(clientId);
        }
      } else {
        deadClients.push(clientId);
      }
    });

    // Clean up dead connections
    deadClients.forEach(clientId => {
      this.clients.delete(clientId);
    });
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send message to client ${clientId}: client not found or connection closed`);
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      this.clients.delete(clientId);
    }
  }

  private sendError(clientId: string, errorMessage: string): void {
    this.sendToClient(clientId, {
      type: 'ERROR',
      payload: { error: errorMessage },
      timestamp: new Date()
    });
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public getClientInfo(): Array<{id: string, connectedAt: Date, isAlive: boolean}> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      isAlive: client.isAlive
    }));
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Close all client connections
      this.clients.forEach((client) => {
        client.ws.close();
      });

      // Close the server
      this.wss.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
} 