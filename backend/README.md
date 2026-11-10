# Backend Nada Nusantara

Backend menggunakan Hono + TypeScript. Bun dipakai untuk menjalankan server selama pengembangan lokal. Cloudflare Workers menjalankan file Hono yang sama ketika aplikasi dipublikasikan.

Endpoint:

- `GET /api/health`: memeriksa apakah API berjalan.
- `GET /api/instruments`: mengembalikan daftar ringkas lima alat musik.

Tidak ada akun, database, atau data pengguna yang disimpan.
