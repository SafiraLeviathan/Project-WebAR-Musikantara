import type { Instrument } from '../types/instrument';

const asset = '/assets';

// targetIndex mengikuti urutan lima kartu pada paket target Musikantara.mind.
// Urutan ini diambil dari urutan aset pada arsip sumber dan wajib dikonfirmasi saat QA kamera.
export const INSTRUMENTS: Instrument[] = [
  {
    id: 'angklung',
    name: 'Angklung',
    region: 'Jawa Barat',
    family: 'Alat musik bambu',
    description: 'Angklung dibuat dari tabung-tabung bambu yang disusun pada sebuah rangka. Setiap tabung memiliki ukuran berbeda dan menghasilkan nada tertentu. Bunyi muncul ketika rangka digoyangkan sehingga tabung bergetar dan saling beradu.',
    playingMethod: 'Pegang rangka angklung, lalu goyangkan ke kiri dan kanan secara teratur. Dalam permainan kelompok, setiap pemain biasanya memegang nada yang berbeda.',
    learningNote: 'Dengarkan perubahan nada ketika angklung digoyangkan. Ritme dan kerja sama antarpemain menentukan susunan melodinya.',
    image: `${asset}/asset_2d/Angklung_NoBG.png`,
    arCard: `${asset}/kartu_ar/Angklung.png`,
    model: `${asset}/asset_3d/Angklung.glb`,
    audio: `${asset}/sfx_alat_musik/angklung.wav`,
    targetIndex: 0
  },
  {
    id: 'bonang',
    name: 'Bonang',
    region: 'Jawa',
    family: 'Alat musik pukul',
    description: 'Bonang merupakan bagian dari perangkat gamelan. Instrumen ini tersusun dari gong-gong kecil berbentuk pencu yang diletakkan mendatar pada rancakan. Setiap gong menghasilkan nada berbeda ketika dipukul.',
    playingMethod: 'Pukul bagian pencu menggunakan dua tabuh khusus. Pemain mengatur pola pukulan untuk membentuk melodi dan pola ritmis dalam sajian gamelan.',
    learningNote: 'Perhatikan susunan gong kecil dan perbedaan tinggi-rendah nadanya. Pola bonang saling melengkapi dengan instrumen gamelan lain.',
    image: `${asset}/asset_2d/Bonang_NoBG.png`,
    arCard: `${asset}/kartu_ar/Bonang.png`,
    model: `${asset}/asset_3d/Bonang.glb`,
    audio: `${asset}/sfx_alat_musik/bonang.wav`,
    targetIndex: 1
  },
  {
    id: 'kendang',
    name: 'Kendang',
    region: 'Jawa dan Sunda',
    family: 'Alat musik membranofon',
    description: 'Kendang adalah alat musik berbentuk tabung dengan membran pada kedua sisinya. Kendang dimainkan dengan tangan dan berperan penting dalam mengatur irama, tempo, serta perubahan dinamika dalam pertunjukan.',
    playingMethod: 'Pukul kedua sisi membran menggunakan telapak tangan dan jari. Perbedaan tekanan serta posisi pukulan menghasilkan warna bunyi yang beragam.',
    learningNote: 'Coba bedakan bunyi pukulan pada sisi membran yang berbeda. Pola kendang sering menjadi penanda perubahan irama.',
    image: `${asset}/asset_2d/Kendang_NoBG.png`,
    arCard: `${asset}/kartu_ar/Kendang.png`,
    model: `${asset}/asset_3d/Kendang.glb`,
    audio: `${asset}/sfx_alat_musik/kendang.wav`,
    targetIndex: 2
  },
  {
    id: 'suling',
    name: 'Suling',
    region: 'Beragam daerah di Indonesia',
    family: 'Alat musik tiup',
    description: 'Suling tradisional umumnya dibuat dari bambu dan memiliki lubang-lubang nada di sepanjang badannya. Aliran udara dari tiupan bergetar pada bagian pangkal, lalu pemain mengubah nada dengan membuka dan menutup lubang.',
    playingMethod: 'Tiup bagian pangkal suling dengan aliran udara yang stabil. Atur lubang nada menggunakan jari untuk menghasilkan melodi.',
    learningNote: 'Kestabilan embusan napas dan ketepatan penutupan lubang sangat memengaruhi kejernihan nada.',
    image: `${asset}/asset_2d/Suling_NoBG.png`,
    arCard: `${asset}/kartu_ar/Suling.png`,
    model: `${asset}/asset_3d/Suling.glb`,
    audio: `${asset}/sfx_alat_musik/suling.wav`,
    targetIndex: 3
  },
  {
    id: 'tifa',
    name: 'Tifa',
    region: 'Papua dan Maluku',
    family: 'Alat musik pukul',
    description: 'Tifa merupakan alat musik pukul berbentuk tabung memanjang dengan satu sisi membran. Badannya dibuat dari kayu yang dilubangi, kemudian salah satu ujungnya ditutup dengan kulit sebagai bidang pukul.',
    playingMethod: 'Pukul bagian membran menggunakan telapak tangan atau jari. Pola dan kekuatan pukulan membentuk irama pengiring.',
    learningNote: 'Amati bentuk badan tifa dan membrannya. Bunyi yang dihasilkan dapat berbeda mengikuti ukuran, bahan, dan teknik pukulan.',
    image: `${asset}/asset_2d/Tifa_NoBG.png`,
    arCard: `${asset}/kartu_ar/Tifa.png`,
    model: `${asset}/asset_3d/Tifa.glb`,
    audio: `${asset}/sfx_alat_musik/tifa.wav`,
    targetIndex: 4
  }
];

export function getInstrument(id: string | null | undefined): Instrument {
  return INSTRUMENTS.find((instrument) => instrument.id === id) ?? INSTRUMENTS[0]!;
}
