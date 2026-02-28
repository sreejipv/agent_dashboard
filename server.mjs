// server.js
// Express server wrapping all Vercel API handlers.
// Run this on EC2 (same VPC as RDS) so it can connect to private RDS.
//
// Usage:
//   node server.js
//   pm2 start ecosystem.config.cjs
//
// Required env vars (same as Vercel deployment):
//   DATABASE_URL            postgresql://user:pass@rds-host:5432/dbname?sslmode=require
//   JWT_SECRET              secret for signing auth JWTs
//   WHATSAPP_ACCESS_TOKEN   Meta WhatsApp API token
//   WHATSAPP_PHONE_ID       WhatsApp phone number ID
//   WEBHOOK_SECRET          shared secret for external portal webhooks
//   NEXT_PUBLIC_BASE_URL    base URL of the Vercel frontend (used for magic-link generation)
//
// Optional env vars:
//   PORT                    (default: 3001)
//   CORS_ALLOW_ORIGINS      comma-separated list, e.g. https://agent-dashboard-teh2.vercel.app
//                           defaults to reflecting the request origin (development-safe)
//   NODE_ENV                set to 'production' on EC2

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authLogin from './api/auth/login.js';
import authLogout from './api/auth/logout.js';
import authVerify from './api/auth/verify.js';
import messages from './api/messages.js';
import sendMessage from './api/send-message.js';
import autoReplyStatus from './api/auto-reply-status.js';
import verifyPhone from './api/verify-phone.js';
import conversationsSettings from './api/conversations/settings.js';
import n8nReceive from './api/n8n/receive.js';
import portalGenerateLink from './api/portal/generate-link.js';
import portalVerifyLink from './api/portal/verify-link.js';
import webhookMilestoneComplete from './api/webhooks/milestone-complete.js';
import webhookFileUploaded from './api/webhooks/file-uploaded.js';

const PORT = process.env.PORT || 3001;

// When CORS_ALLOW_ORIGINS is set, restrict to those origins.
// When unset, origin: true reflects the request origin (safe for dev; set in production).
const rawOrigins = (process.env.CORS_ALLOW_ORIGINS || '').trim();
const corsOrigin = rawOrigins
  ? rawOrigins.split(',').map((s) => s.trim()).filter(Boolean)
  : true;

const app = express();

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Health check
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// Auth
app.all('/api/auth/login', authLogin);
app.all('/api/auth/logout', authLogout);
app.all('/api/auth/verify', authVerify);

// Core
app.all('/api/messages', messages);
app.all('/api/send-message', sendMessage);
app.all('/api/auto-reply-status', autoReplyStatus);
app.all('/api/verify-phone', verifyPhone);

// Conversations
app.all('/api/conversations/settings', conversationsSettings);

// n8n
app.all('/api/n8n/receive', n8nReceive);

// Portal
app.all('/api/portal/generate-link', portalGenerateLink);
app.all('/api/portal/verify-link', portalVerifyLink);

// Webhooks
app.all('/api/webhooks/milestone-complete', webhookMilestoneComplete);
app.all('/api/webhooks/file-uploaded', webhookFileUploaded);

app.listen(PORT, () => {
  console.log(`[server] WhatsApp admin backend listening on :${PORT}`);
  console.log(`[server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[server] CORS origin: ${JSON.stringify(corsOrigin)}`);
});
