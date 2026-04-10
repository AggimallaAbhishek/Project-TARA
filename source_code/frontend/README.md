# Project TARA Frontend

React + Vite frontend for threat analysis workflows.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

- `VITE_API_BASE_URL` - Required backend API base URL
- `VITE_GOOGLE_CLIENT_ID` - Optional Google OAuth client ID (frontend env takes precedence, backend `/api/auth/config` is fallback)
- `VITE_DEBUG_API` - Optional API interceptor debug logs (`true`/`false`)

## Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest in watch mode
- `npm run test:run` - Run Vitest once
