import { Hono } from 'hono'
import api from './routes/api'

const app = new Hono()

app.route('/api', api)

app.get('/api', (context) => context.json({ ok: true, message: 'Nada Nusantara API siap digunakan.' }))

app.notFound((context) => context.json({ ok: false, message: 'Halaman tidak ditemukan.' }, 404))

app.onError((error, context) => {
  console.error('API error:', error)
  return context.json({ ok: false, message: 'Terjadi kendala pada layanan.' }, 500)
})

export { app }
export default app
