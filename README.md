# WMSHR

Private monorepo for the WMSHR product.

## Apps

- `home` - public website / landing frontend.
- `wmshr-admin` - admin web app and local API server.
- `wmshr-app` - mobile app project.

## Development

Install and run commands inside each app directory.

```bash
cd home && npm install && npm run dev
cd wmshr-admin && npm install && npm run dev
cd wmshr-app && npm install && npm run start
```

Environment files are intentionally not committed. Copy each `.env.example` file before local development.
