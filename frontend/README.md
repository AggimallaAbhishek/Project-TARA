# Project TARA Frontend

React + Vite frontend for threat analysis workflows.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment Variables

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:8000/api`)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID used by login
- `VITE_DEBUG_API` - Optional API interceptor debug logs (`true`/`false`)

## Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
