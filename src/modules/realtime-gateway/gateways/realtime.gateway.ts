// ─────────────────────────────────────────────────────────────────────────────
//  modules/realtime-gateway/gateways/realtime.gateway.ts
//  Phase 2: Socket.io Gateway with @socket.io/redis-adapter
//
//  The Redis adapter broadcasts to ALL connected Socket.io nodes,
//  so any container in the cluster can emit to any connected client.
//
//  Client connection URL: ws://host:3000/realtime
//
//  Auth: clients must pass a valid JWT or API key in handshake.auth.token
// ─────────────────────────────────────────────────────────────────────────────
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
  OnGatewayDisconnect, OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisAdapterFactory } from '../factories/redis-adapter.factory';

const allowedOriginsCache = new Set<string>();

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const isProd = process.env.NODE_ENV === 'production';
      const allowedEnv =
        process.env.SOCKET_IO_CORS_ORIGINS ||
        process.env.CORS_ORIGINS ||
        'http://localhost:5173';
      const allowedList = allowedEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (process.env.FRONTEND_URL) {
        allowedList.push(process.env.FRONTEND_URL.trim());
      }

      if (
        !origin ||
        allowedList.includes(origin) ||
        allowedList.includes('*') ||
        (!isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Socket.io CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly redisAdapterFactory: RedisAdapterFactory,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Attach Redis adapter on gateway init ─────────────────────────────────
  async afterInit(server: Server): Promise<void> {
    try {
      const adapter = await this.redisAdapterFactory.createAdapter();
      if (adapter) {
        server.adapter(adapter);
        this.logger.log('✅ Socket.io Redis adapter attached (multi-node sync ACTIVE)');
      } else {
        this.logger.log('ℹ️ Socket.io using default in-memory adapter (single-node / mock mode)');
      }
    } catch (err) {
      this.logger.warn(
        `⚠️  Redis adapter unavailable, falling back to in-memory adapter: ${err.message}`,
      );
    }
  }

  onModuleDestroy(): void {
    this.redisAdapterFactory.disconnect();
  }

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      const tenantId = client.handshake.auth?.tenantId ?? 'default';
      const accountId = client.handshake.auth?.accountId;

      this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId}, account: ${accountId}, user: ${payload.sub})`);

      if (tenantId) client.join(`tenant:${tenantId}`);
      if (accountId) {
        client.join(`tenant:${tenantId}:account:${accountId}`);
        client.join(`tenant:${tenantId}:account:${accountId}:messages`);
      }
    } catch {
      this.logger.warn(`Unauthorized websocket connection attempt from ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Client subscribes to a specific account channel ─────────────────────
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { tenantId: string; accountId: string; channel?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    // Always join the base account room so QR / connection events are received
    const baseRoom = `tenant:${data.tenantId}:account:${data.accountId}`;
    client.join(baseRoom);
    client.join(`${baseRoom}:messages`);

    // Also join the specific channel sub-room if provided
    if (data.channel) {
      const channelRoom = `${baseRoom}:${data.channel}`;
      client.join(channelRoom);
      this.logger.debug(`Client ${client.id} subscribed to room: ${channelRoom}`);
      client.emit('subscribed', { room: channelRoom, status: 'ok' });
    } else {
      this.logger.debug(`Client ${client.id} subscribed to account room: ${baseRoom}`);
      client.emit('subscribed', { room: baseRoom, status: 'ok' });
    }
  }

  // ── Broadcast a message event to a specific account room ─────────────────
  emitToAccount(
    tenantId: string,
    accountId: string,
    event: string,
    payload: unknown,
  ): void {
    const room = `tenant:${tenantId}:account:${accountId}`;
    this.server?.to(room).emit(event, payload);
    this.logger.debug(`[WS] Emitted '${event}' → room: ${room}`);
  }

  // ── Broadcast to entire tenant ────────────────────────────────────────────
  emitToTenant(tenantId: string, event: string, payload: unknown): void {
    const room = `tenant:${tenantId}`;
    this.server.to(room).emit(event, payload);
  }
}
