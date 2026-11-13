# Verifikasi target MindAR

Database asli `assets/targets/musikantara.mind` menggunakan format MindAR target data versi 2. Metadata menunjukkan lima entri target. Seluruh entri dicocokkan dengan lima file kartu AR asli menggunakan pipeline descriptor FREAK dan prosedur pencocokan MindAR, bukan dengan asumsi urutan nama file.

| MindAR target index | File kartu AR | Instrumen | Hasil pencocokan fitur |
|---:|---|---|---:|
| 0 | `assets/kartu_ar/Angklung.png` | Angklung | 186 / 188 |
| 1 | `assets/kartu_ar/Bonang.png` | Bonang | 135 / 138 |
| 2 | `assets/kartu_ar/Kendang.png` | Kendang | 140 / 141 |
| 3 | `assets/kartu_ar/Suling.png` | Suling | 105 / 107 |
| 4 | `assets/kartu_ar/Tifa.png` | Tifa | 91 / 91 |

Kelima pasangan memiliki kecocokan dominan terhadap kartu yang tepat. Database asli dipertahankan; tidak dilakukan regenerasi `.mind`.

## Titik integrasi kode

- Pemetaan index disimpan pada `worker/data/instruments.ts` lewat properti `arTargetIndex`.
- `ARScanPage.tsx` membuat satu anchor MindAR untuk setiap record, menggunakan `arTargetIndex` yang diverifikasi.
- Model GLB dimuat secara lazy ketika target terkait ditemukan, sehingga startup AR tidak perlu memuat seluruh model 3D sekaligus.

**Batas verifikasi:** pemeriksaan ini memverifikasi struktur database dan kecocokan fitur kartu terhadap target. Ini bukan bukti bahwa deteksi kamera fisik telah berhasil di semua perangkat. Pengujian live webcam dan kartu cetak berstatus NOT TESTED.
