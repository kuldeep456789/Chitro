# 💬 Chitro — Real-Time Chat Application

A full-stack, real-time messaging platform built with **NestJS**, **Next.js**, **Socket.IO**, **Prisma**, and **Neon PostgreSQL**.

The project is cleanly divided into two independent directories:
- **`backend/`** — NestJS REST API & Socket.IO Gateway with its own `node_modules`
- **`frontend/`** — Next.js 14 Web Application with its own `node_modules`

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the App](#-running-the-app)
- [API Endpoints](#-api-endpoints)
- [Socket.IO Events](#-socketio-events)
- [Architecture](#-architecture)
- [Testing](#-testing)

---

## ✨ Features

| Category | Details |
|----------|---------|
| **Authentication** | Email + OTP verification via Nodemailer, JWT access/refresh tokens, session rotation |
| **Real-Time Messaging** | Socket.IO WebSocket gateway with room-based message broadcasting |
| **Direct Chats** | Deterministic `pairKey` deduplication — no duplicate conversations |
| **Group Chats** | Atomic group creation with OWNER/ADMIN/MEMBER roles |
| **Message Idempotency** | `clientMessageId` prevents duplicate messages on retry |
| **Typing Indicators** | Live typing status broadcast to conversation members |
| **Message History** | Cursor-based pagination for efficient scroll loading |
| **Security** | OTP stored as SHA-256 hash, JWT-protected routes, unauthorized room subscription blocked |
| **Resilient DB** | Auto-retry connection logic for Neon PostgreSQL cold starts |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Lucide Icons, Tailwind CSS |
| **Backend** | NestJS 10, TypeScript, Socket.IO |
| **Database** | Neon PostgreSQL (serverless Postgres) |
| **ORM** | Prisma 6 |
| **Auth** | JWT (access + refresh tokens), bcrypt, SHA-256 OTP hashing |
| **Email** | Nodemailer with Gmail SMTP |

---

## 📁 Project Structure

```
Chatflow/
├── backend/                      # NestJS API & WebSocket Gateway
│   ├── prisma/
│   │   └── schema.prisma         # Database schema (8 models)
│   ├── src/
│   │   ├── main.ts               # App bootstrap (port 4000)
│   │   ├── app.module.ts         # Root module
│   │   ├── auth/                 # Register, OTP verify, login, JWT guard
│   │   ├── users/                # User search, profile
│   │   ├── conversations/        # Direct chat, group chat, message history
│   │   ├── gateway/              # Socket.IO real-time gateway
│   │   ├── mail/                 # Nodemailer service + HTML email template
│   │   ├── health/               # Health check endpoint
│   │   └── prisma/               # Prisma service with retry logic
│   ├── .env                      # Environment variables
│   ├── .env.example              # Template for env setup
│   ├── package.json              # Backend dependencies
│   ├── node_modules/             # Backend-only dependencies
│   └── test-*.js                 # E2E test scripts
│
├── frontend/                     # Next.js Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/           # Login, Register, OTP Verify screens
│   │   │   ├── chats/            # Chat list screen
│   │   │   ├── chats/[id]/       # Active conversation screen
│   │   │   └── profile/          # User profile screen
│   │   ├── hooks/                # useSocket, useMessages custom hooks
│   │   ├── lib/                  # API client, auth context
│   │   └── components/           # Reusable UI components
│   ├── package.json              # Frontend dependencies
│   └── node_modules/             # Frontend-only dependencies
│
├── package.json                  # Root runner scripts (--prefix)
└── README.md
```

> **Why are `node_modules` separated?**
> Each folder (`backend/` and `frontend/`) has its own independent `node_modules` and `package-lock.json`. This avoids monorepo hoisting confusion and ensures both can be deployed, containerized, or run independently with standard `npm install`.

---

## 📦 Prerequisites

Make sure you have the following installed:

- **Node.js** ≥ 18.x — [Download](https://nodejs.org/)
- **npm** ≥ 9.x (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)
- A **Neon PostgreSQL** database — [Sign up free](https://neon.tech/)
- A **Gmail account** with an [App Password](https://support.google.com/accounts/answer/185833) for sending OTP emails

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Chatflow.git
cd Chatflow
```

### 2. Install Dependencies

You can install all dependencies from the root:

```bash
npm run install:all
```

Or install inside each folder individually:

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Set Up Environment Variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual Neon connection string and credentials (see [Environment Variables](#-environment-variables) below).

### 4. Set Up the Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 5. Run the Application

From the project root:

```bash
# Terminal 1 — Start the Backend API (port 4000)
npm run dev:backend

# Terminal 2 — Start the Frontend (port 3000)
npm run dev:frontend
```

🎉 Open **http://localhost:3000** in your browser!

---

## 🔐 Environment Variables

Create `backend/.env` using the template below:

```env
# Server
PORT=4000
NODE_ENV=development

# Database — Neon PostgreSQL connection string
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# JWT Auth Secrets (use long random strings)
JWT_ACCESS_SECRET="your-random-access-secret-at-least-32-chars"
JWT_REFRESH_SECRET="your-random-refresh-secret-at-least-32-chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Gmail SMTP (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-gmail-app-password"
EMAIL_FROM="Chitro Security <no-reply@chitro.app>"

# Frontend URL (for CORS)
CLIENT_URL="http://localhost:3000"
```

> **How to get a Gmail App Password:**
> 1. Go to [Google Account Security](https://myaccount.google.com/security)
> 2. Enable **2-Step Verification** if not already enabled
> 3. Go to **App passwords** → Select "Mail" → Generate
> 4. Copy the 16-character password into `SMTP_PASS`

---

## 🗄 Database Setup

Chitro uses **Prisma 6** with **Neon PostgreSQL** (serverless).

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Push schema to Neon database (creates tables)
npx prisma db push

# (Optional) Open Prisma Studio GUI
npx prisma studio
```

### Database Models

| Model | Purpose |
|-------|---------|
| `User` | User accounts with email, username, password hash, verification status |
| `OtpChallenge` | One-time password challenges (SHA-256 hashed, with expiry and attempt tracking) |
| `Session` | JWT refresh token sessions with revocation support |
| `Conversation` | Direct (1:1) or Group chats, with unique `pairKey` for direct deduplication |
| `ConversationMember` | Many-to-many join with roles (OWNER, ADMIN, MEMBER) and read tracking |
| `Message` | Chat messages with `clientMessageId` for idempotency, soft-delete support |
| `MessageReaction` | Emoji reactions on messages (unique per user+emoji+message) |

---

## ▶️ Running the App

### Option A: From Root (Convenience Scripts)

```bash
# Terminal 1: Backend API (hot reload)
npm run dev:backend

# Terminal 2: Frontend (hot reload)
npm run dev:frontend
```

### Option B: From Individual Folders

```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend
npm run dev
```

### Production Build

```bash
# From root
npm run build:backend
npm run build:frontend

# Run Backend
cd backend && npm run start:prod

# Run Frontend
cd frontend && npm start
```

---

## 📡 API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register new user (sends OTP email) | ❌ |
| `POST` | `/auth/verify-otp` | Verify OTP code | ❌ |
| `POST` | `/auth/resend-otp` | Resend OTP (60s cooldown) | ❌ |
| `POST` | `/auth/login` | Login (returns JWT tokens) | ❌ |
| `POST` | `/auth/refresh` | Rotate access token via refresh token | ❌ |
| `POST` | `/auth/logout` | Revoke session | ✅ |
| `GET` | `/auth/me` | Get current authenticated user profile | ✅ |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/users/search?q=query` | Search users by username/display name | ✅ |
| `GET` | `/users/me` | Get user profile | ✅ |
| `PATCH` | `/users/me` | Update display name, avatar, or bio | ✅ |

### Conversations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/conversations` | List user's active conversations | ✅ |
| `GET` | `/conversations/:id` | Get conversation details and members | ✅ |
| `POST` | `/conversations/direct` | Create or fetch existing direct chat (`pairKey`) | ✅ |
| `POST` | `/conversations/groups` | Atomically create group chat with members | ✅ |
| `GET` | `/conversations/:id/messages` | Get paginated message history (cursor) | ✅ |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/health` | API & database health check | ❌ |

---

## 🔌 Socket.IO Events

Connect to `ws://localhost:4000` with JWT token in handshake:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'your-jwt-access-token' },
  transports: ['websocket'],
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `conversation:subscribe` | `{ conversationId }` | Join room (requires DB membership verification) |
| `message:send` | `{ conversationId, text, clientMessageId }` | Send a message (returns ack with canonical message) |
| `typing:start` | `{ conversationId }` | Broadcast typing status |
| `typing:stop` | `{ conversationId }` | Stop typing status |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `{ id, conversationId, senderId, text, ... }` | New message broadcast to room |
| `typing:updated` | `{ conversationId, userId, username, isTyping }` | Member typing status update |
| `presence:updated` | `{ userId, isOnline }` | User online/offline update |

---

## 🏗 Architecture

```
┌─────────────────────┐               WebSocket                 ┌──────────────────────┐
│                     │ ◄─────────────────────────────────────► │  Socket.IO Gateway   │
│   Next.js Frontend  │              (real-time)                │      (port 4000)     │
│     (port 3000)     │                                         │                      │
│                     │ ───────────── REST API ───────────────► │   NestJS REST API    │
│                     │              /api/v1/*                  │      (port 4000)     │
└─────────────────────┘                                         └──────────┬───────────┘
                                                                           │
                                                                           │ Prisma ORM
                                                                           │
                                                                ┌──────────▼───────────┐
                                                                │   Neon PostgreSQL    │
                                                                │  (Serverless Cloud)  │
                                                                └──────────────────────┘
                                                                           │
                                                                ┌──────────▼───────────┐
                                                                │      Gmail SMTP      │
                                                                │  (Nodemailer Engine) │
                                                                └──────────────────────┘
```

---

## 🧪 Testing

Both automated E2E test suites run against the live Neon database and NestJS server:

```bash
cd backend

# Test 1: Full Auth lifecycle (register -> OTP -> verify -> login -> session)
node test-auth-e2e.js

# Test 2: Real-time messaging & Socket.IO (Alice + Bob live chat, deduplication, history)
node test-messaging-e2e.js
```

### Verified Test Gates

- ✅ User registration with OTP generation
- ✅ Unverified user blocked from login
- ✅ Invalid OTP rejected with attempt tracking
- ✅ 60-second resend cooldown enforced
- ✅ OTP stored as SHA-256 hash (never plaintext)
- ✅ Valid OTP verifies account and issues JWT
- ✅ JWT-protected `/auth/me` route
- ✅ User search by username
- ✅ Deterministic `pairKey` deduplication for direct chats
- ✅ Socket.IO JWT handshake authentication
- ✅ Room subscription with DB membership check
- ✅ Live message send and real-time broadcast
- ✅ Message persisted with canonical ID in Neon PostgreSQL
- ✅ `clientMessageId` idempotency on duplicate retry
- ✅ Cursor-paginated message history
- ✅ Unauthorized room subscription rejected (`Forbidden`)
- ✅ Atomic group conversation creation with roles

---

## 📱 App Screens

| Route | Screen | Description |
|-------|--------|-------------|
| `/register` | Sign Up | Email, username, password registration |
| `/verify` | OTP Verification | 6-digit code entry with auto-focus |
| `/login` | Sign In | Email + password login |
| `/chats` | Chat List | All/Direct/Groups tabs, user search, new group modal |
| `/chats/[id]` | Conversation | Real-time chat with typing indicators and date separators |
| `/profile` | Profile | User info, verification badge, sign out |

---

## 📜 License

MIT
