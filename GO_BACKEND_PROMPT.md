# WhatsApp Admin Panel — Go Backend Implementation Prompt

## Context

You are working inside an existing Go project: **`fellocoder_clients_backend`**.

This is a multi-tenant backend running on EC2, connected to AWS RDS (PostgreSQL).
It already has clients, blogs, and contact-form features using the packages below.
You must **add** the WhatsApp admin panel features **without breaking anything existing**.

### Existing project structure

```
cmd/server/main.go               — entry point, reads env, wires store + server
internal/
  domain/                        — plain structs + helpers (no DB deps)
    models.go                    — ContactSubmission, BlogPost, BlogPostUpdate
    client.go                    — Client, NewAPIKey, HashAPIKey
    strings.go                   — NewID, LooksLikeEmail, Slugify
  httpapi/
    server.go                    — http.ServeMux, all route registration, Store interface
    auth.go                      — apiKeyMW (X-API-Key), adminMW (X-Admin-Key)
    middleware.go                 — CORS, logging, recover, request-id, max-body
  store/
    pgstore/store.go             — Postgres implementation (build tag: postgres)
    jsonstore/                   — file-based fallback
  email/                         — SMTP lead emailer
migrations/
  001_init.sql                   — existing tables (contact_submissions, blog_posts)
```

### Existing routes (keep unchanged)

```
GET  /healthz
GET  /readyz
POST /api/v1/admin/clients        (X-Admin-Key)
GET  /api/v1/admin/clients        (X-Admin-Key)
POST /api/v1/contact-submissions  (X-API-Key)
GET  /api/v1/contact-submissions  (X-API-Key)
POST /api/v1/blogs                (X-API-Key)
GET  /api/v1/blogs                (X-API-Key)
GET  /api/v1/blogs/{id}           (X-API-Key)
PUT  /api/v1/blogs/{id}           (X-API-Key)
DELETE /api/v1/blogs/{id}         (X-API-Key)
```

### Existing env vars (keep)
```
ADDR, ADMIN_KEY, DATA_DIR, CORS_ALLOW_ORIGINS, MAX_BODY_BYTES, STORE
```

---

## Database schema already on RDS

The following tables **already exist** on the RDS instance (PostgreSQL). Do not recreate them,
but reference them for all new code.

```sql
-- tenants: one row per agency (FelloCoder is slug='fellocoder')
CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(100) UNIQUE,
  whatsapp_number  VARCHAR(20),
  whatsapp_creds   TEXT,   -- JSON {"accessToken":"...","phoneNumberId":"..."} (Phase 2)
  openai_key       TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- users: admin users that log in to the dashboard
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- bcrypt
  role          VARCHAR(50) DEFAULT 'agency_admin',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- messages: all WhatsApp messages (sent + received)
CREATE TABLE messages (
  id            VARCHAR(255) PRIMARY KEY,
  from_number   VARCHAR(50),
  to_number     VARCHAR(50),
  message_text  TEXT,
  timestamp     BIGINT,        -- Unix seconds
  message_type  VARCHAR(50) DEFAULT 'text',
  status        VARCHAR(50) DEFAULT 'received',
  is_sent       BOOLEAN DEFAULT FALSE,
  tenant_id     UUID REFERENCES tenants(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- conversations: per-contact settings
CREATE TABLE conversations (
  phone_number       VARCHAR(50) NOT NULL,
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  auto_reply_enabled BOOLEAN DEFAULT FALSE,
  auto_reply_message TEXT DEFAULT 'Thank you for your message! We''ll get back to you soon.',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (phone_number, tenant_id)
);

-- settings: global key/value per tenant
CREATE TABLE settings (
  key       VARCHAR(255) NOT NULL,
  value     TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  PRIMARY KEY (key, tenant_id)
);

-- magic_links: client portal single-use tokens
CREATE TABLE magic_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(255) UNIQUE NOT NULL,
  client_phone VARCHAR(50),
  client_name  VARCHAR(255),
  client_email VARCHAR(255),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  tenant_id    UUID REFERENCES tenants(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- milestones: project milestones per client
CREATE TABLE milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50) NOT NULL,
  title        VARCHAR(500) NOT NULL,
  status       VARCHAR(50) DEFAULT 'pending',  -- pending | complete
  completed_at TIMESTAMPTZ,
  tenant_id    UUID REFERENCES tenants(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- client_files: file references (S3 URLs) per client
CREATE TABLE client_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50) NOT NULL,
  file_name    VARCHAR(500) NOT NULL,
  file_url     TEXT NOT NULL,
  tenant_id    UUID REFERENCES tenants(id),
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## New environment variables to add

```
# WhatsApp Business API (Meta)
WHATSAPP_ACCESS_TOKEN   # Bearer token for Meta Graph API
WHATSAPP_PHONE_NUMBER_ID # e.g. 852119087983190
WHATSAPP_API_VERSION    # default: v19.0

# JWT auth for admin dashboard
JWT_SECRET              # random 32+ char secret
JWT_EXPIRY              # default: 168h (7 days)

# Webhook security
WEBHOOK_SECRET          # shared secret; callers must send X-Webhook-Secret header

# Client portal base URL (for magic link generation)
PORTAL_BASE_URL         # e.g. https://agents.fellocoder.com
```

---

## New API routes to implement

All new routes live under `/api/` (not `/api/v1/`). They must be registered in
`internal/httpapi/server.go` alongside the existing routes.

### Authentication — JWT cookie

Auth uses an **httpOnly cookie** named `admin_token` containing a signed JWT.
This is different from the existing X-API-Key/X-Admin-Key header auth.

**JWT payload:**
```json
{
  "userId":     "uuid",
  "tenantId":   "uuid",
  "tenantSlug": "fellocoder",
  "email":      "user@example.com",
  "role":       "agency_admin"
}
```

**Cookie settings:**
- `HttpOnly: true`
- `Secure: true` (always — EC2 is behind HTTPS nginx)
- `SameSite: None` (frontend on Vercel, backend on EC2 = cross-origin)
- `MaxAge: 7 days`
- `Path: /`

**New middleware `jwtCookieMW`:** reads `admin_token` cookie, verifies JWT,
attaches `AuthPayload{UserID, TenantID, TenantSlug, Email, Role}` to request context.

---

### Route list

#### `POST /api/auth/login`
No auth required.
Request: `{ "email": "string", "password": "string" }`
- Query `users` JOIN `tenants` WHERE email = $1 AND is_active = true
- Verify password with bcrypt against `password_hash`
- Sign JWT with `JWT_SECRET`
- Set `admin_token` httpOnly cookie
- Response `200`: `{ "success": true }`
- Response `401`: `{ "success": false, "error": "Invalid credentials" }`

#### `GET /api/auth/verify`
No auth required (just validates cookie).
- If valid cookie + JWT: `200 { "success": true, "authenticated": true, "tenantId": "...", "tenantSlug": "...", "role": "...", "email": "..." }`
- If missing/invalid: `401 { "success": false, "authenticated": false }`

#### `POST /api/auth/logout`
No auth required.
- Clear `admin_token` cookie (set MaxAge=0, same SameSite/Secure flags)
- Response `200`: `{ "success": true }`

---

#### `GET /api/messages`
Requires `jwtCookieMW`.
- Query: `SELECT id, from_number, to_number, message_text, timestamp, message_type, status, is_sent FROM messages WHERE tenant_id = $tenantId ORDER BY timestamp DESC LIMIT 200`
- Response `200`: `{ "success": true, "messages": [ { "id", "from", "to", "text", "timestamp", "type", "status", "isSent" } ] }`

Map DB columns → JSON: `from_number→from`, `to_number→to`, `message_text→text`, `message_type→type`, `is_sent→isSent`.

---

#### `POST /api/send-message`
Requires `jwtCookieMW`.
Request: `{ "to": "phone_number", "message": "text" }`

1. POST to Meta WhatsApp API:
   ```
   POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages
   Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
   Content-Type: application/json

   {
     "messaging_product": "whatsapp",
     "recipient_type": "individual",
     "to": "<to>",
     "type": "text",
     "text": { "preview_url": false, "body": "<message>" }
   }
   ```
2. On success, INSERT into `messages`:
   ```sql
   INSERT INTO messages (id, from_number, to_number, message_text, timestamp, message_type, status, is_sent, tenant_id)
   VALUES ($msgId, $phoneNumberId, $to, $message, $unixNow, 'text', 'sent', true, $tenantId)
   ON CONFLICT (id) DO NOTHING
   ```
   Use `"sent_" + unix_millis + "_" + tenantId` as message ID.
3. Response `200`: `{ "success": true, "messageId": "..." }`
4. If Meta API fails: `500 { "success": false, "error": "..." }`

---

#### `GET /api/auto-reply-status`
Requires `jwtCookieMW`.
- `SELECT value FROM settings WHERE key = 'auto_reply_enabled' AND tenant_id = $tenantId`
- If not found, treat as `false`
- Response `200`: `{ "success": true, "enabled": true|false }`

#### `POST /api/auto-reply-status`
Requires `jwtCookieMW`.
Request: `{ "enabled": true|false }`
- `INSERT INTO settings (key, value, tenant_id) VALUES ('auto_reply_enabled', $val, $tenantId) ON CONFLICT (key, tenant_id) DO UPDATE SET value = EXCLUDED.value`
- Response `200`: `{ "success": true, "enabled": true|false }`

---

#### `GET /api/verify-phone`
Requires `jwtCookieMW`.
- GET `https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}?fields=verified_name,display_phone_number`
  with `Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}`
- On success: `200 { "success": true, "data": { "verified_name": "...", "display_phone_number": "..." } }`
- On error: `500 { "success": false, "error": "..." }`

---

#### `GET /api/conversations/settings?contact=PHONE`
**No auth required** — called by n8n to check per-contact settings.
- `SELECT auto_reply_enabled, auto_reply_message FROM conversations WHERE phone_number = $contact AND tenant_id = $tenantId`
- Look up tenant by matching `whatsapp_number` from the `tenants` table against `WHATSAPP_PHONE_NUMBER_ID` env var OR use a `tenant_slug` query param (default: first active tenant or use env var `DEFAULT_TENANT_SLUG`).
- Actually simplest: add a `tenant_slug` query param (optional, default to `DEFAULT_TENANT_SLUG` env var which defaults to `fellocoder`)
- If no row found, return defaults: `{ "auto_reply_enabled": false, "auto_reply_message": "..." }`
- Response `200`:
  ```json
  {
    "success": true,
    "settings": {
      "auto_reply_enabled": false,
      "auto_reply_message": "Thank you..."
    }
  }
  ```

#### `POST /api/conversations/settings`
Requires `jwtCookieMW`.
Request: `{ "phone_number": "string", "auto_reply_enabled": bool, "auto_reply_message": "string" (optional) }`
- Upsert into `conversations`:
  ```sql
  INSERT INTO conversations (phone_number, tenant_id, auto_reply_enabled, auto_reply_message, updated_at)
  VALUES ($1, $2, $3, $4, NOW())
  ON CONFLICT (phone_number, tenant_id) DO UPDATE SET
    auto_reply_enabled = EXCLUDED.auto_reply_enabled,
    auto_reply_message = EXCLUDED.auto_reply_message,
    updated_at = NOW()
  ```
- Response `200`: `{ "success": true }`

---

#### `POST /api/n8n/receive`
**No auth required** — called by n8n to store every incoming/outgoing WhatsApp message.

Request:
```json
{
  "message_id": "wamid.xxx",
  "from":       "919xxxxxx",
  "to":         "852119087983190",
  "text":       "Hello",
  "timestamp":  1700000000,
  "type":       "text",
  "is_sent":    false
}
```

Logic:
1. Resolve `tenant_id` by matching the `to` (if is_sent=false) or `from` (if is_sent=true) phone number against `tenants.whatsapp_number`. If not found, use `DEFAULT_TENANT_SLUG` env var to look up tenant.
2. INSERT:
   ```sql
   INSERT INTO messages (id, from_number, to_number, message_text, timestamp, message_type, is_sent, status, tenant_id)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
   ON CONFLICT (id) DO NOTHING
   ```
   `status = 'sent'` if `is_sent=true`, else `'received'`.
3. Response `200`: `{ "success": true }`

---

#### `POST /api/portal/generate-link`
Requires `jwtCookieMW`.
Request: `{ "client_phone": "string", "client_name": "string", "client_email": "string" (optional) }`
- Generate token: 32 random bytes as hex string
- INSERT into `magic_links (token, client_phone, client_name, client_email, expires_at, tenant_id)`
  - `expires_at = NOW() + 7 days`
- Portal URL: `{PORTAL_BASE_URL}/portal/{token}`
- Response `200`: `{ "success": true, "url": "https://...", "token": "..." }`

---

#### `GET /api/portal/verify-link?token=TOKEN`
**No auth required** — called by the client portal page.
- `SELECT * FROM magic_links WHERE token = $1`
- If not found: `404 { "success": false, "error": "Link not found" }`
- If `expires_at < NOW()`: `410 { "success": false, "error": "Link has expired" }`
- Fetch in parallel (all scoped by `client_phone` AND `tenant_id` from the link):
  - Messages: `SELECT id, from_number, to_number, message_text AS text, timestamp, message_type AS type, status, is_sent FROM messages WHERE (from_number=$1 OR to_number=$1) AND tenant_id=$2 ORDER BY timestamp ASC`
  - Milestones: `SELECT id, title, status, completed_at, created_at FROM milestones WHERE client_phone=$1 AND tenant_id=$2 ORDER BY created_at ASC`
  - Files: `SELECT id, file_name, file_url, uploaded_at FROM client_files WHERE client_phone=$1 AND tenant_id=$2 ORDER BY uploaded_at DESC`
- Response `200`:
  ```json
  {
    "success": true,
    "client_phone": "...",
    "client_name": "...",
    "messages": [...],
    "milestones": [...],
    "files": [...]
  }
  ```

---

#### `POST /api/webhooks/milestone-complete`
Requires `X-Webhook-Secret` header matching `WEBHOOK_SECRET` env var.
Request:
```json
{
  "client_phone":    "string",
  "milestone_title": "string",
  "client_name":     "string (optional)",
  "notify_whatsapp": false,
  "tenant_slug":     "fellocoder (optional, default: DEFAULT_TENANT_SLUG)"
}
```
1. Resolve `tenant_id` from `tenants.slug`
2. INSERT:
   ```sql
   INSERT INTO milestones (client_phone, title, status, completed_at, tenant_id)
   VALUES ($1, $2, 'complete', NOW(), $3)
   ON CONFLICT DO NOTHING
   RETURNING id
   ```
3. If `notify_whatsapp=true`: POST to Meta WhatsApp API sending message:
   `"Hi {name}! Your milestone "{milestone_title}" has been completed."`
4. Response `200`: `{ "success": true, "milestone_id": "uuid" }`

---

#### `POST /api/webhooks/file-uploaded`
Requires `X-Webhook-Secret` header matching `WEBHOOK_SECRET` env var.
Request:
```json
{
  "client_phone":    "string",
  "file_name":       "string",
  "file_url":        "string",
  "client_name":     "string (optional)",
  "notify_whatsapp": false,
  "tenant_slug":     "fellocoder (optional)"
}
```
1. Resolve `tenant_id` from `tenants.slug`
2. INSERT:
   ```sql
   INSERT INTO client_files (client_phone, file_name, file_url, tenant_id)
   VALUES ($1, $2, $3, $4)
   RETURNING id
   ```
3. If `notify_whatsapp=true`: POST to Meta WhatsApp API:
   `"Hi {name}! A new file has been uploaded: {file_name}."`
4. Response `200`: `{ "success": true, "file_id": "uuid" }`

---

## CORS update

The new routes need `Access-Control-Allow-Credentials: true` for the browser to send
the httpOnly cookie cross-origin (agents.fellocoder.com frontend → clients.fellocoder.com backend).

Update the `corsMW` in `internal/httpapi/middleware.go`:
- Add `w.Header().Set("access-control-allow-credentials", "true")`
- Ensure CORS origin is NOT `*` when credentials are used (reflect request origin or use specific list)
- Add these allowed headers: `x-webhook-secret, x-api-key, x-admin-key`

---

## Go packages to add (go.mod)

```
golang.org/x/crypto         — bcrypt for password verification
github.com/golang-jwt/jwt/v5 — JWT sign/verify
```

(The existing project uses `github.com/jackc/pgx/v5` for Postgres — keep that.)

---

## Implementation guide

### Files to create

| File | Purpose |
|------|---------|
| `internal/domain/whatsapp.go` | New domain structs: Message, Conversation, Setting, MagicLink, Milestone, ClientFile, AuthPayload |
| `internal/httpapi/whatsapp.go` | All new HTTP handlers (auth, messages, portal, webhooks, n8n) |
| `internal/httpapi/jwt_middleware.go` | `jwtCookieMW` — verifies admin_token cookie, attaches AuthPayload to ctx |
| `internal/store/pgstore/whatsapp.go` | Postgres implementations for all new Store methods (build tag: postgres) |
| `internal/store/jsonstore/whatsapp.go` | Stub implementations returning `errors.New("not supported")` |
| `migrations/002_whatsapp_tables.sql` | No-op (tables already on RDS) — just a comment-only file for documentation |

### Files to modify

| File | Change |
|------|--------|
| `internal/httpapi/server.go` | Add new Store interface methods + register new routes |
| `internal/httpapi/middleware.go` | Update corsMW to support credentials + add x-webhook-secret header |
| `cmd/server/main.go` | Read new env vars (JWT_SECRET, WHATSAPP_ACCESS_TOKEN, etc.) and pass to Config |

### New Store interface methods to add

```go
// --- WhatsApp messages ---
InsertMessage(ctx context.Context, m domain.Message) error
ListMessages(ctx context.Context, tenantID string, limit int) ([]domain.Message, error)

// --- Conversations ---
UpsertConversation(ctx context.Context, c domain.Conversation) error
GetConversation(ctx context.Context, phone, tenantID string) (domain.Conversation, bool, error)

// --- Settings ---
GetSetting(ctx context.Context, key, tenantID string) (string, bool, error)
UpsertSetting(ctx context.Context, key, value, tenantID string) error

// --- Tenants ---
GetTenantBySlug(ctx context.Context, slug string) (domain.Tenant, bool, error)
GetTenantByWhatsAppNumber(ctx context.Context, number string) (domain.Tenant, bool, error)

// --- Users ---
GetUserByEmail(ctx context.Context, email string) (domain.User, bool, error)

// --- Magic links ---
InsertMagicLink(ctx context.Context, ml domain.MagicLink) error
GetMagicLinkByToken(ctx context.Context, token string) (domain.MagicLink, bool, error)

// --- Portal data ---
ListMessagesByPhone(ctx context.Context, phone, tenantID string) ([]domain.Message, error)
ListMilestonesByPhone(ctx context.Context, phone, tenantID string) ([]domain.Milestone, error)
ListFilesByPhone(ctx context.Context, phone, tenantID string) ([]domain.ClientFile, error)

// --- Webhooks ---
InsertMilestone(ctx context.Context, m domain.Milestone) (string, error) // returns UUID
InsertClientFile(ctx context.Context, f domain.ClientFile) (string, error) // returns UUID
```

### New Config fields to add

```go
type Config struct {
    // ... existing fields ...
    JWTSecret           string
    JWTExpiry           time.Duration
    WhatsAppAccessToken string
    WhatsAppPhoneID     string
    WhatsAppAPIVersion  string   // default "v19.0"
    WebhookSecret       string
    PortalBaseURL       string
    DefaultTenantSlug   string   // default "fellocoder"
}
```

---

## Key behaviours to preserve

1. All existing `/api/v1/` routes continue working unchanged.
2. The Postgres build tag (`-tags postgres`) is required to use pgstore. Add the new whatsapp store methods under the same build tag in `internal/store/pgstore/whatsapp.go`.
3. All new data queries are scoped by `tenant_id` — never return cross-tenant data.
4. The `GET /api/conversations/settings` and `POST /api/n8n/receive` endpoints are unauthenticated (called by n8n), but must still resolve to the correct tenant.
5. Webhook endpoints authenticate via `X-Webhook-Secret` header, not JWT cookie.
6. The `GET /api/portal/verify-link` endpoint is unauthenticated (used by the client portal page).
