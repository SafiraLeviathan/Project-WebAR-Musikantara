# Backend Musikantara

Hono + TypeScript untuk Cloudflare Workers. API:

- `GET /api/health`
- `GET /api/instruments`
- `GET /api/instruments/:id`

Konfigurasi deployment ada di `wrangler.jsonc`. Folder asset yang diunggah ditetapkan ke `../frontend/dist` setelah frontend dibangun.
