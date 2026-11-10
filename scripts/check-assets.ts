import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const assetRoot = join(root, 'assets')
const requiredFiles = [
  'asset-2d/Angklung_NoBG.png',
  'asset-2d/Bonang_NoBG.png',
  'asset-2d/Kendang_NoBG.png',
  'asset-2d/Suling_NoBG.png',
  'asset-2d/Tifa_NoBG.png',
  'asset-3d/Angklung.glb',
  'asset-3d/Bonang.glb',
  'asset-3d/Kendang.glb',
  'asset-3d/Suling.glb',
  'asset-3d/Tifa.glb',
  'kartu-ar/Angklung.png',
  'kartu-ar/Bonang.png',
  'kartu-ar/Kendang.png',
  'kartu-ar/Suling.png',
  'kartu-ar/Tifa.png',
  'sfx-alat-musik/SUARA_ANGKLUNG.wav',
  'sfx-alat-musik/Bonang_Gamelan_Degung_koleksi_Jurusan_Karawitan_ISBI_Bandung.wav',
  'sfx-alat-musik/Kendang_Gamelan_Degung_koleksi_Jurusan_Karawitan_ISBI_Bandung.wav',
  'sfx-alat-musik/Suling_Lubang_Empat_atau_Suling_Degung_koleksi_Jurusan_Karawitan_ISBI_Bandung.wav',
  'sfx-alat-musik/SUARA_TIFA.wav',
]

const missing = requiredFiles.filter((path) => !existsSync(join(assetRoot, path)))
if (missing.length > 0) {
  console.error('\nAset berikut belum ditemukan:')
  for (const file of missing) console.error(`- assets/${file}`)
  console.error('\nPastikan folder assets dari ZIP referensi berada di root repositori.\n')
  process.exit(1)
}

const maximumBytes = 25 * 1024 * 1024
const oversized: string[] = []
function inspectFolder(folder: string) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const fullPath = join(folder, entry.name)
    if (entry.isDirectory()) inspectFolder(fullPath)
    else if (statSync(fullPath).size > maximumBytes) oversized.push(fullPath.replace(`${root}/`, ''))
  }
}
inspectFolder(assetRoot)

if (oversized.length > 0) {
  console.error('\nAda aset yang melebihi batas 25 MiB per file Cloudflare Workers:')
  for (const file of oversized) console.error(`- ${file}`)
  process.exit(1)
}

const targetFile = join(assetRoot, 'targets', 'nada-nusantara.mind')
if (!existsSync(targetFile)) {
  console.error('\nFile target AR belum dibuat: assets/targets/nada-nusantara.mind')
  console.error('Buka MindAR Image Targets Compiler, unggah lima kartu sesuai urutan di README, lalu simpan hasilnya ke lokasi tersebut.')
  process.exit(1)
}

console.info('Pemeriksaan aset selesai: semua aset utama tersedia dan ukuran file memenuhi batas Cloudflare.')
console.info(`File target AR: ${(statSync(targetFile).size / 1024 / 1024).toFixed(2)} MiB`)
