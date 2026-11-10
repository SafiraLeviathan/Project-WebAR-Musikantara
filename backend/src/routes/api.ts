import { Hono } from 'hono'

const api = new Hono()

const publicInstruments = [
  { id: 'angklung', name: 'Angklung', region: 'Jawa Barat', targetIndex: 0 },
  { id: 'bonang', name: 'Bonang', region: 'Jawa', targetIndex: 1 },
  { id: 'kendang', name: 'Kendang', region: 'Jawa dan Sunda', targetIndex: 2 },
  { id: 'suling', name: 'Suling', region: 'Nusantara', targetIndex: 3 },
  { id: 'tifa', name: 'Tifa', region: 'Papua dan Maluku', targetIndex: 4 },
]

api.use('*', async (context, next) => {
  await next()
  context.header('Cache-Control', 'no-store')
  context.header('X-Content-Type-Options', 'nosniff')
  context.header('Referrer-Policy', 'strict-origin-when-cross-origin')
})

api.get('/health', (context) => {
  return context.json({
    ok: true,
    name: 'Nada Nusantara API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

api.get('/instruments', (context) => {
  return context.json({ count: publicInstruments.length, data: publicInstruments })
})

api.notFound((context) => context.json({ ok: false, message: 'Alamat API tidak ditemukan.' }, 404))

export default api
