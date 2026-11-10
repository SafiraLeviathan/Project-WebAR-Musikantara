export interface Instrument {
  id: string
  name: string
  region: string
  family: string
  intro: string
  description: string
  imagePath: string
  cardPath: string
  modelPath: string
  audioPath: string
  targetIndex: number
  facts: string[]
}

// Urutan targetIndex harus sama dengan urutan kartu ketika membuat file .mind.
// Urutan: Angklung, Bonang, Kendang, Suling, lalu Tifa.
export const instruments: Instrument[] = [
  {
    id: 'angklung',
    name: 'Angklung',
    region: 'Jawa Barat',
    family: 'Alat musik bambu',
    intro: 'Bunyi bambu yang dimainkan bersama.',
    description:
      'Angklung dibuat dari tabung-tabung bambu yang disusun pada sebuah rangka. Bunyi muncul saat rangkanya digoyangkan.',
    imagePath: '/asset-2d/Angklung_NoBG.png',
    cardPath: '/kartu-ar/Angklung.png',
    modelPath: '/asset-3d/Angklung.glb',
    audioPath: '/sfx-alat-musik/SUARA_ANGKLUNG.wav',
    targetIndex: 0,
    facts: ['Terbuat dari bambu', 'Dimainkan dengan cara digoyangkan', 'Sering dimainkan secara berkelompok'],
  },
  {
    id: 'bonang',
    name: 'Bonang',
    region: 'Jawa',
    family: 'Alat musik gamelan',
    intro: 'Gong kecil yang memberi pola nada.',
    description:
      'Bonang terdiri dari gong-gong kecil berpencu yang diletakkan berjajar. Pemain memukul pencunya menggunakan alat pemukul khusus.',
    imagePath: '/asset-2d/Bonang_NoBG.png',
    cardPath: '/kartu-ar/Bonang.png',
    modelPath: '/asset-3d/Bonang.glb',
    audioPath: '/sfx-alat-musik/Bonang_Gamelan_Degung_koleksi_Jurusan_Karawitan_ISBI_Bandung.wav',
    targetIndex: 1,
    facts: ['Bagian dari perangkat gamelan', 'Terbuat dari logam', 'Dimainkan dengan cara dipukul'],
  },
  {
    id: 'kendang',
    name: 'Kendang',
    region: 'Jawa dan Sunda',
    family: 'Alat musik perkusi',
    intro: 'Irama yang mengatur gerak musik.',
    description:
      'Kendang merupakan alat musik berbentuk tabung dengan membran pada sisinya. Pemain memukul membran untuk mengatur irama.',
    imagePath: '/asset-2d/Kendang_NoBG.png',
    cardPath: '/kartu-ar/Kendang.png',
    modelPath: '/asset-3d/Kendang.glb',
    audioPath: '/sfx-alat-musik/Kendang_Gamelan_Degung_koleksi_Jurusan_Karawitan_ISBI_Bandung.wav',
    targetIndex: 2,
    facts: ['Memiliki membran yang direntangkan', 'Umumnya dimainkan dengan tangan', 'Membantu mengatur irama musik'],
  },
  {
    id: 'suling',
    name: 'Suling',
    region: 'Nusantara',
    family: 'Alat musik tiup',
    intro: 'Melodi lembut dari aliran udara.',
    description:
      'Suling tradisional umumnya dibuat dari bambu. Pemain meniup lubang tiup dan mengatur lubang nada dengan jari.',
    imagePath: '/asset-2d/Suling_NoBG.png',
    cardPath: '/kartu-ar/Suling.png',
    modelPath: '/asset-3d/Suling.glb',
    audioPath: '/sfx-alat-musik/Suling_Lubang_Empat_atau_Suling_Degung_koleksi_Jurusan_Karawitan_ISBI_Bandung.wav',
    targetIndex: 3,
    facts: ['Banyak dibuat dari bambu', 'Dimainkan dengan cara ditiup', 'Nada diatur melalui lubang jari'],
  },
  {
    id: 'tifa',
    name: 'Tifa',
    region: 'Papua dan Maluku',
    family: 'Alat musik perkusi',
    intro: 'Tabuhan khas dari Indonesia timur.',
    description:
      'Tifa adalah alat musik pukul berbentuk tabung dengan membran pada salah satu ujungnya. Bentuk dan hiasannya dapat berbeda menurut daerah.',
    imagePath: '/asset-2d/Tifa_NoBG.png',
    cardPath: '/kartu-ar/Tifa.png',
    modelPath: '/asset-3d/Tifa.glb',
    audioPath: '/sfx-alat-musik/SUARA_TIFA.wav',
    targetIndex: 4,
    facts: ['Dikenal di Papua dan Maluku', 'Dimainkan dengan cara dipukul', 'Memiliki bentuk dan ragam hias khas daerah'],
  },
]

export const defaultGestureSettings = {
  pinchThreshold: 0.095,
  movementSensitivity: 1.2,
  zoomSensitivity: 1,
}

export type GestureSettings = typeof defaultGestureSettings
