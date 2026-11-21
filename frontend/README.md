# Travel Quest: frontend

React + TypeScript + Vite + Tailwind CSS. Mobile first, with a desktop layout.

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # add VITE_GOOGLE_MAPS_API_KEY
npm run dev
```

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: type-check and build
- `npm run lint`: run oxlint
- `npm run preview`: serve the production build

## Structure

- `src/components/`: shared UI (`layout/`, `ui/`)
- `src/features/`: one folder per product area (see `src/features/README.md`)
- `src/lib/`: config and helpers
- `src/pages/`: one component per route
- `src/styles/`: Tailwind entry and design tokens
