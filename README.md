# WMSHR

Private monorepo for the WMSHR product.

## Structure

- `apps/home` - public portal website.
- `apps/mobile` - mobile app project.
- `packages/shared` - shared constants, types, and utilities.
- `docs` - product and implementation documents.
- `supabase` - Supabase project files and migrations.

## Development

Install dependencies from the repository root, then run the app you need.

```bash
npm install
npm run dev:home
npm run dev:mobile
```

Local web ports:

- `apps/home` runs on `http://localhost:3001`.

Useful checks:

```bash
npm run lint
npm run build
```

## Deployment Model

- `https://dutylix.com` serves `apps/home`.

Environment files are intentionally not committed. Copy each `.env.example` file before local development.
