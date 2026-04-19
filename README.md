# Collaborative Java Workspace Frontend

React + TypeScript frontend for the Collaborative Java Workspace platform.

It provides:

- authentication (signup/login/me)
- dashboard and room navigation
- Java editor experience
- backend-powered analysis and optimization UI
- collaborative room file flows (open/create/upload/download/version history)

## Tech Stack

- React 18
- TypeScript
- Vite 5
- Tailwind CSS + shadcn/ui
- TanStack Query
- Vitest + Testing Library

## Prerequisites

- Node.js 20+ (or latest LTS)
- npm (or Bun if preferred)
- Backend API running (default `http://127.0.0.1:8081`)

## Environment Setup

Create local env file from template:

```powershell
Copy-Item .env.example .env
```

Available variables:

- `VITE_API_BASE_URL`

Behavior:

- Leave it empty (`VITE_API_BASE_URL=`) to use same-origin `/api` with Vite dev proxy.
- Set it (example: `http://127.0.0.1:8081`) to call backend directly.

Production deployment example:

- `VITE_API_BASE_URL=https://collaborative-java-workspace-backend.onrender.com`

## Run Locally

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Default frontend URL: `http://localhost:8080`

## Scripts

- `npm run dev` - start Vite dev server on port 8080
- `npm run build` - production build
- `npm run build:dev` - development-mode build
- `npm run preview` - preview built app
- `npm run lint` - run ESLint
- `npm run test` - run unit tests once
- `npm run test:watch` - watch mode tests

## Backend Integration

By default, Vite proxies requests from `/api/*` to `http://127.0.0.1:8081`.

Proxy config is defined in `vite.config.ts`.

## Notes

- Do not commit `.env`.
- Commit `.env.example` only with safe public placeholders.
- If auth calls fail during local development, confirm backend is healthy at `http://localhost:8081/actuator/health`.
