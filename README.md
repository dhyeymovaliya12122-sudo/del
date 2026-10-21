# WhatsApp Automation Engine — Phase 1 · 2 · 3

> **Production-grade, multi-tenant WhatsApp engine** — stateless session storage, proxy circuit breaking, zero-egress media, real-time multi-node WebSockets, async Redis Streams ingestion, Docker Swarm orchestration, and a pixel-perfect WhatsApp-style React dashboard.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│               Cloudflare WAF + Edge Guard (X-Hub-Signature)          │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ POST /webhook/:tenantId/:accountId
                              ▼
                   ┌──────────────────────┐
                   │   Redis Stream        │  XADD wa:webhooks:incoming
                   │  (Async Buffer)       │  ← 200 OK returned immediately
                   └──────────┬───────────┘
                              │ Consumer Group (XREADGROUP)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NestJS API Gateway Cluster (Stateless)                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │ HMAC Guard   │  │ Session Hydrator│  │  Proxy Circuit Breaker │   │
│  └──────────────┘  └────────────────┘  └────────────────────────┘   │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │ Socket.io WS │  │ BullMQ Queues  │  │  R2 Media Streamer      │   │
│  └──────────────┘  └────────────────┘  └────────────────────────┘   │
│  ┌──────────────┐  ┌────────────────┐                                │
│  │ Orchestration│  │  Auto-Healer   │                                │
│  └──────────────┘  └────────────────┘                                │
└────┬─────────────────────┬───────────────────────┬──────────────────┘
     │                     │                       │
┌────▼──────┐   ┌──────────▼────────┐   ┌──────────▼───────────┐
│ PostgreSQL │   │ Redis             │   │ Docker Swarm / Coolify│
│ (Auth/Logs)│   │ Streams + PubSub  │   │ (Container Instances) │
└───────────┘   │ Queues + Cache    │   └──────────────────────┘
                └───────────────────┘
                                              ┌──────────────┐
                                              │ Cloudflare R2│
                                              │ (Zero-Egress)│
                                              └──────────────┘
```

---

## Feature Matrix

| Phase | Feature | Description |
|---|---|---|
| **1** | Proxy Binding Layer | Per-account SOCKS5/HTTP proxy isolation |
| **1** | Stateless Auth Hydration | AES-256 encrypted sessions in PostgreSQL → ephemeral RAM |
| **1** | HMAC Security Guard | X-Hub-Signature-256 webhook validation, Cloudflare WAF |
| **2** | Proxy Circuit Breaker | 3-state Redis CB; auto-pauses BullMQ queues on proxy failure |
| **2** | Rate-Limited Queues | Per-account BullMQ queues, sliding-window token bucket (anti-ban) |
| **2** | Zero-Egress Media | Inbound WhatsApp media streamed directly to Cloudflare R2 |
| **2** | Multi-Node WebSockets | `@socket.io/redis-adapter` syncing events across cluster nodes |
| **3** | Redis Streams Buffer | Webhooks → XADD → 200 OK immediately; consumer group drains async |
| **3** | Docker Swarm Orchestration | Programmatic container provision/destroy/scale via Docker Engine API |
| **3** | Coolify Orchestration | Alternative managed deployment via Coolify REST API |
| **3** | Auto-Healing Worker | Cron detects stalled containers every 60s; force-restarts + audit log |
| **3** | React Dashboard | WhatsApp-style UI: account list, live chat, instance manager, health metrics |

---

## Quick Start

### Development (all services)

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your secrets

# 2. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 3. Install dependencies
npm install

# 4. Start NestJS API (hot-reload)
npm run start:dev
```

### Frontend Dashboard

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Opens at http://localhost:5173
```

### Full Stack (Docker)

```bash
# Core services
docker-compose up -d

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d

# With Redis Insight GUI
docker-compose --profile dev up -d
```

### Enabling Docker Swarm Orchestration

```bash
# Initialize Swarm on your server
docker swarm init

# Set in .env
ORCHESTRATOR_TYPE=swarm
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

### Switching to Coolify

```bash
# Set in .env
ORCHESTRATOR_TYPE=coolify
COOLIFY_API_URL=https://coolify.yourdomain.com/api/v1
COOLIFY_API_TOKEN=your_token
COOLIFY_PROJECT_ID=your_project_uuid
COOLIFY_SERVER_ID=your_server_uuid
```

---

## Project Structure

```
whatsapp/
├── frontend/                         # React 18 + Vite Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar/              # Account list, status dots, CB chips
│   │   │   ├── ChatPane/             # Live message thread + send bar
│   │   │   ├── HealthDashboard/      # Metrics cards + circuit breaker table
│   │   │   └── InstanceManager/      # Provision/destroy/scale containers
│   │   ├── services/api.ts           # Axios + Socket.io client layer
│   │   └── styles/global.css         # WhatsApp dark theme design system
│   ├── Dockerfile.frontend           # Nginx multi-stage build
│   └── nginx.conf                    # API + WS proxy config
│
├── src/
│   ├── modules/
│   │   ├── proxy-binding/            # Phase 1: Per-account proxy routing
│   │   ├── session-hydration/        # Phase 1: Stateless auth hydration
│   │   ├── security-guard/           # Phase 1: HMAC + WAF guard
│   │   ├── proxy-circuit-breaker/    # Phase 2: 3-state CB + queue pause
│   │   ├── media-pipeline/           # Phase 2: R2 zero-egress streams
│   │   ├── message-queue/            # Phase 2: BullMQ rate-limited queues
│   │   ├── realtime-gateway/         # Phase 2: Socket.io + Redis adapter
│   │   ├── webhook-ingestion/        # Phase 3: Redis Streams buffer
│   │   └── orchestration/            # Phase 3: Docker Swarm + Coolify + Auto-heal
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── init.sql              # Phase 1-3 schema (all tables + triggers)
│   │   └── cache/                    # Redis connection module
│   └── config/                       # Per-phase environment configs
│
├── infra/
│   └── prometheus.yml                # Metrics scrape config
├── docker-compose.yml                # Full stack (API + Frontend + DB + Monitoring)
├── Dockerfile                        # NestJS multi-stage build
└── .env.example                      # All Phase 1-3 environment variables
```

---

## API Endpoints

### Orchestration
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/orchestration/provision` | Spin up new WhatsApp engine container |
| `DELETE` | `/api/v1/orchestration/destroy/:serviceId` | Destroy container |
| `POST` | `/api/v1/orchestration/:serviceId/restart` | Restart container |
| `POST` | `/api/v1/orchestration/:serviceId/heal` | Manual auto-heal trigger |
| `POST` | `/api/v1/orchestration/:serviceId/scale` | Scale replicas |
| `GET` | `/api/v1/orchestration/instances` | List all instances |

### Message Queue
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/message-queue/send` | Enqueue outbound message |
| `GET` | `/api/v1/message-queue/:accountId/stats` | Queue depth stats |
| `POST` | `/api/v1/message-queue/:accountId/pause` | Pause account queue |
| `GET` | `/api/v1/message-queue/rate-limits` | All active rate limits |

### Circuit Breaker
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/proxy-circuit-breaker` | All circuit states |
| `POST` | `/api/v1/proxy-circuit-breaker/:proxyId/reset` | Force close circuit |
| `POST` | `/api/v1/proxy-circuit-breaker/:proxyId/trip` | Force open (testing) |

### Webhook Stream
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/webhook/:tenantId/:accountId` | Meta webhook receiver (async buffer) |
| `GET` | `/api/v1/webhook/stream/health` | Stream lag + consumer group stats |

---

## Socket.io Events (Client → Server)
| Event | Payload | Description |
|---|---|---|
| `subscribe` | `{ tenantId, accountId, channel }` | Join tenant-scoped room |

## Socket.io Events (Server → Client)
| Event | Description |
|---|---|
| `message:incoming` | New inbound WhatsApp message |
| `message:status` | Delivery status update (sent/delivered/read) |
| `media:ready` | R2 upload complete, presigned URL available |
| `proxy:circuit-breaker` | Circuit state change alert |

---

## Environment Variables

Copy `.env.example` → `.env`. Key variables by phase:

| Variable | Phase | Description |
|---|---|---|
| `SESSION_ENCRYPTION_KEY` | 1 | 32-byte AES-256 key for session encryption |
| `WEBHOOK_HMAC_SECRET` | 1 | Meta app secret for X-Hub-Signature-256 |
| `PROXY_CIRCUIT_BREAKER_THRESHOLD` | 2 | Failures before circuit opens (default: 3) |
| `BULLMQ_MAX_MSG_PER_SECOND` | 2 | Per-account send rate limit (default: 3) |
| `R2_ACCOUNT_ID` | 2 | Cloudflare account ID for R2 storage |
| `ORCHESTRATOR_TYPE` | 3 | `swarm` or `coolify` |
| `REDIS_STREAM_MAX_LEN` | 3 | Max webhook stream length (default: 100,000) |
| `HEAL_STALL_THRESHOLD_MS` | 3 | Auto-heal trigger after N ms with 0 replicas |
