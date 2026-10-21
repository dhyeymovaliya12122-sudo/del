# QR Scan Data Flow Architecture: Account Chat History Lifecycle

This document specifies the complete **3-Tier System Architecture** and **6-Step End-to-End Data Fetching Sequence** for retrieving an account's chat history via optical QR code scan or session pairing in the WhatsApp Engine platform.

---

## 1. System Architecture: 3-Tier Layer Breakdown

```mermaid
flowchart LR
    subgraph L1["Tier 1: Client Application (Mobile / Web)"]
        Scanner["Device Camera / Optical Decoder (ZXing WASM)"]
        UIStore["Zustand Chat Store & Virtualized Timeline"]
    end

    subgraph L2["Tier 2: Backend API & Gateway"]
        Gateway["API Gateway / Guards (JwtAuthGuard, AccountIsolationGuard)"]
        Controller["WhatsappWebController (GET /api/v1/whatsapp/chats)"]
        Service["WhatsappWebService (L1/L2 Redis Cache & Pagination)"]
    end

    subgraph L3["Tier 3: Database & Persistent Storage"]
        DB[("Database Cluster (SQLite WAL / PostgreSQL)")]
        Idx["Compound Index (idx_whatsapp_messages_fifo_ttl & account_id)"]
    end

    Scanner -->|1. Scans & Decodes QR| UIStore
    UIStore -->|2. Authenticated HTTP GET| Gateway
    Gateway -->|3. Validates JWT & Tenant Isolation| Controller
    Controller --> Service
    Service -->|4. Lean Projection SQL Query| DB
    DB -.->|5. Buffer Pool Recordset Rows| Service
    Service -.->|6. 200 OK JSON Payload| UIStore
```

### Layer 1: Client Application (Mobile / Web Scanner)
- **Role**: Uses device camera hardware to decode the optical QR matrix into an account token and pairing URI.
- **Security**: Attaches the user's secure **JWT Bearer Token** in HTTP headers to verify identity and tenancy.
- **Rendering**: Receives the normalized JSON chat collection, updates the global store ([useChatStore](frontend/src/stores/chatStore.ts)), resolves display names via [contactResolver.ts](frontend/src/utils/contactResolver.ts), and renders the virtualized conversation timeline.

### Layer 2: Backend API (API Gateway & Controller)
- **Role**: Validates permissions, enforces tenant boundaries, and manages rate limiting before touching the database.
- **Security Gateways**:
  - `JwtAuthGuard`: Verifies token signature, expiration, and user identity.
  - `AccountIsolationGuard`: Asserts that the authenticated user has explicit read access to the target WhatsApp `accountId`.
- **Controller/Service**: [WhatsappWebController](src/modules/accounts/controllers/whatsapp-web.controller.ts) & [WhatsappWebService](src/modules/accounts/services/whatsapp-web.service.ts). Checks L1 in-memory TTL cache and L2 Redis cache before hitting the storage engine.

### Layer 3: Database & Storage Layer
- **Role**: Holds the conversation records (`whatsapp_chats`) and message logs (`whatsapp_messages`).
- **Optimization**: Compound B-Tree indexing (`account_id`, `created_at ASC`, `last_message_timestamp DESC`), WAL mode, and lean field projection to ensure sub-10ms query execution.

---

## 2. End-to-End Data Fetching Sequence (6 Steps)

### Step 1: Scan and Decode (Client Scanner)
The user's camera focuses on the QR code. The scanning library decodes the optical image into a text string containing the account identifier and pairing token:

```json
{
  "action": "DECODE_QR",
  "target_entity": "ACCOUNT_CHAT_HISTORY",
  "account_id": "ba7a9a17-07d0-44f6-9f38-324b5a779e8f",
  "pairing_token": "WA_PAIR_98765_SECURE_TOKEN",
  "raw_text": "https://whatsapp.enterprise.io/auth/pair?accountId=ba7a9a17-07d0-44f6-9f38-324b5a779e8f&scope=history:read",
  "timestamp": 1759320290000
}
```

---

### Step 2: Construct API Request (Client → API Gateway)
The client app constructs an authenticated HTTPS GET request with pagination parameters and the user's JWT token:

```http
GET /api/v1/whatsapp/chats?accountId=ba7a9a17-07d0-44f6-9f38-324b5a779e8f&limit=50&offset=0 HTTP/1.1
Host: api.enterprise-whatsapp.io
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
X-Tenant-ID: default-tenant
User-Agent: WhatsAppEngine-Client/2.4.0 (Web/Mobile)
```

---

### Step 3: Auth Validation & Routing (API Gateway → Backend Controller)
The request hits the API Gateway. The server executes guard pipeline checks:
- **JWT Verification**: Validates cryptographic signature and token expiration.
- **Account Access Check**: Verifies in `user_account_access` table that `userId` has permission to read `accountId`.
- **Rate Limiting**: Verifies throughput limits.

```json
{
  "authenticated_user": "usr_7721",
  "user_role": "SUPER_ADMIN",
  "tenant_id": "default-tenant",
  "target_account": "ba7a9a17-07d0-44f6-9f38-324b5a779e8f",
  "guard_pipeline": [
    "JwtAuthGuard: PASSED (Signature valid, not expired)",
    "AccountIsolationGuard: PASSED (User has access to account)",
    "ThrottlerGuard: PASSED (Remaining: 994/1000 req/min)"
  ],
  "upstream_route": "WhatsappWebController.getChats()"
}
```

---

### Step 4: Database Query (Backend Controller → Database)
Upon L1/L2 cache miss, [WhatsappWebService](src/modules/accounts/services/whatsapp-web.service.ts) executes an index-optimized query with lean projection (avoiding heavy BLOB columns):

```sql
SELECT 
  chat.id AS id,
  chat.account_id AS account_id,
  chat.name AS name,
  chat.subtitle AS subtitle,
  chat.is_group AS is_group,
  chat.unread_count AS unread_count,
  chat.last_message_text AS last_message_text,
  chat.last_message_timestamp AS last_message_timestamp,
  chat.last_message_status AS last_message_status,
  chat.pinned AS pinned,
  chat.avatar_url AS avatar_url
FROM whatsapp_chats chat
WHERE chat.account_id = 'ba7a9a17-07d0-44f6-9f38-324b5a779e8f'
ORDER BY chat.pinned DESC, chat.last_message_timestamp DESC
LIMIT 50 OFFSET 0;
```

---

### Step 5: Recordset Return (Database → Backend Controller)
The database storage engine returns raw rows from its buffer pool cache in ~4.8ms:

```json
[
  {
    "id": "12036304@g.us",
    "account_id": "ba7a9a17-07d0-44f6-9f38-324b5a779e8f",
    "name": "Operations HQ",
    "subtitle": "Dhyey: Server deployment complete",
    "is_group": true,
    "unread_count": 2,
    "last_message_text": "Server deployment verified on port 3000.",
    "last_message_timestamp": 1759320290000,
    "pinned": true
  },
  {
    "id": "14155552671@s.whatsapp.net",
    "account_id": "ba7a9a17-07d0-44f6-9f38-324b5a779e8f",
    "name": "Sarah Connor",
    "subtitle": "Can you send the contract document?",
    "is_group": false,
    "unread_count": 0,
    "last_message_text": "Can you send the contract document?",
    "last_message_timestamp": 1759318120000,
    "pinned": false
  }
]
```

---

### Step 6: JSON Response & Data Rendering (Backend → Client)
The backend serializes the recordset into an HTTP `200 OK` response. The client app parses the JSON and renders the chat list:

```typescript
// 1. Client fetches all account chat history
const response = await fetch('/api/v1/whatsapp/chats?accountId=' + accountId, {
  headers: { Authorization: `Bearer ${jwtToken}` }
});
const chatHistory = await response.json();

// 2. Hydrate Global State Store
useChatStore.getState().setChats(chatHistory);

// 3. Resolve Real Contact Names & Format Timestamps
const resolvedChats = chatHistory.map(chat => ({
  ...chat,
  displayName: resolveChatDisplayName(chat.id, chat.name),
  formattedTime: formatDistanceToNow(chat.lastMessageTimestamp)
}));

// 4. Render Virtualized Timeline
renderChatTimeline(resolvedChats);
```

---

## 3. UI Component References

The UI components implementing this architecture:
- [WhatsAppQRScanDataFlowView.tsx](frontend/src/components/WhatsAppWeb/WhatsAppQRScanDataFlowView.tsx): Full-page interactive sequence diagram and architecture explorer.
- [WhatsAppQRDataFlowModal.tsx](frontend/src/components/WhatsAppWeb/WhatsAppQRDataFlowModal.tsx): Contextual modal accessible from the QR scanner.
- [WhatsAppNavRail.tsx](frontend/src/components/WhatsAppWeb/WhatsAppNavRail.tsx): Nav rail route `qr_data_flow`.
- [CommandPalette.tsx](frontend/src/components/common/CommandPalette.tsx): Command palette shortcut `Ctrl+K` → **⚡ QR Scan Data Flow (Account Chat History)**.
