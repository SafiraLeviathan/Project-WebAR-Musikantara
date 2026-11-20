import { Hono } from 'hono';

const app = new Hono();

const instruments = [
  {
    id: 'angklung',
    name: 'Angklung',
    region: 'Jawa Barat',
    family: 'Alat musik bambu',
    summary: 'Tabung bambu pada rangka yang menghasilkan nada ketika digoyangkan.',
    image: '/assets/asset_2d/Angklung_NoBG.png',
    model: '/assets/asset_3d/Angklung.glb',
    audio: '/assets/sfx_alat_musik/angklung.wav',
    arCard: '/assets/kartu_ar/Angklung.png'
  },
  {
    id: 'bonang',
    name: 'Bonang',
    region: 'Jawa',
    family: 'Alat musik pukul',
    summary: 'Gong-gong kecil berpencu yang menjadi bagian dari perangkat gamelan.',
    image: '/assets/asset_2d/Bonang_NoBG.png',
    model: '/assets/asset_3d/Bonang.glb',
    audio: '/assets/sfx_alat_musik/bonang.wav',
    arCard: '/assets/kartu_ar/Bonang.png'
  },
  {
    id: 'kendang',
    name: 'Kendang',
    region: 'Jawa dan Sunda',
    family: 'Alat musik membranofon',
    summary: 'Gendang bermembran yang mengatur irama, tempo, dan dinamika pertunjukan.',
    image: '/assets/asset_2d/Kendang_NoBG.png',
    model: '/assets/asset_3d/Kendang.glb',
    audio: '/assets/sfx_alat_musik/kendang.wav',
    arCard: '/assets/kartu_ar/Kendang.png'
  },
  {
    id: 'suling',
    name: 'Suling',
    region: 'Beragam daerah di Indonesia',
    family: 'Alat musik tiup',
    summary: 'Seruling tradisional, umumnya dari bambu, yang dimainkan dengan tiupan dan lubang nada.',
    image: '/assets/asset_2d/Suling_NoBG.png',
    model: '/assets/asset_3d/Suling.glb',
    audio: '/assets/sfx_alat_musik/suling.wav',
    arCard: '/assets/kartu_ar/Suling.png'
  },
  {
    id: 'tifa',
    name: 'Tifa',
    region: 'Papua dan Maluku',
    family: 'Alat musik pukul',
    summary: 'Alat musik kayu berbentuk tabung dengan membran pada salah satu ujungnya.',
    image: '/assets/asset_2d/Tifa_NoBG.png',
    model: '/assets/asset_3d/Tifa.glb',
    audio: '/assets/sfx_alat_musik/tifa.wav',
    arCard: '/assets/kartu_ar/Tifa.png'
  }
] as const;

app.get('/api/health', (context) => context.json({
  ok: true,
  service: 'musikantara-api',
  version: '1.0.2'
}));

app.get('/api/instruments', (context) => context.json({
  count: instruments.length,
  instruments
}));

app.get('/api/instruments/:id', (context) => {
  const instrument = instruments.find((item) => item.id === context.req.param('id'));
  if (!instrument) return context.json({ error: 'Instrumen tidak ditemukan.' }, 404);
  return context.json(instrument);
});

app.notFound((context) => context.json({ error: 'Endpoint tidak ditemukan.' }, 404));

app.onError((error, context) => {
  console.error('Musikantara API error:', error);
  return context.json({ error: 'Terjadi kesalahan pada layanan Musikantara.' }, 500);
});

export default app;
