import app from './index'

const port = Number(Bun.env.PORT ?? 8788)

Bun.serve({
  port,
  fetch: app.fetch,
})

console.info(`Nada Nusantara API berjalan di http://localhost:${port}`)
