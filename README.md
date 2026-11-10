# Nada Nusantara

Aplikasi WebAR edukasi alat musik tradisional Indonesia. Pengunjung dapat membuka katalog, mendengarkan contoh suara, memindai kartu AR untuk melihat model 3D, dan mengendalikan model dengan gestur tangan.

## Status project

Source code awal sudah disiapkan untuk proses local QA. Sebelum dianggap siap produksi, tim wajib menyelesaikan kompilasi kartu AR, memasang dependensi, menjalankan pemeriksaan aset, serta menguji kamera dan gestur pada perangkat nyata. File target MindAR (`assets/targets/nada-nusantara.mind`) belum termasuk dalam ZIP aset awal dan harus dibuat dari lima kartu yang tersedia.

## Pembagian dua anggota

| Paket | Penanggung jawab | Isi |
|---|---|---|
| ZIP 1 - Frontend | Anggota 1 | React, tampilan mobile-first, katalog, detail musik, pemutar suara, AR, kalibrasi dan gestur tangan |
| ZIP 2 - Backend & Deployment | Anggota 2 | Hono API, server lokal Bun, konfigurasi Cloudflare Workers, pemeriksaan aset, panduan, dan GitHub Actions |

Kedua ZIP memiliki folder yang berbeda. Ekstrak keduanya ke folder root repositori yang sama. Folder `assets/` dari ZIP aset tetap berada di root repositori.

## Kebutuhan awal

- Bun versi 1.3 atau lebih baru.
- Browser modern (Chrome atau Edge disarankan untuk QA awal).
- Kamera depan/belakang dan izin kamera.
- Koneksi internet saat pertama kali memuat MediaPipe WASM/model dan font Google.
- Git untuk mengirim perubahan ke GitHub.

## 1. Siapkan aset kartu AR

MindAR membutuhkan file hasil kompilasi gambar. Langkah ini hanya dilakukan satu kali setiap kali desain kartu berubah.

1. Buka [MindAR Image Targets Compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile/).
2. Unggah lima file berikut **dengan urutan persis ini**:
   - `assets/kartu-ar/Angklung.png`
   - `assets/kartu-ar/Bonang.png`
   - `assets/kartu-ar/Kendang.png`
   - `assets/kartu-ar/Suling.png`
   - `assets/kartu-ar/Tifa.png`
3. Jalankan proses kompilasi dan unduh hasil berformat `.mind`.
4. Ubah nama file menjadi `nada-nusantara.mind`.
5. Simpan file tersebut di `assets/targets/nada-nusantara.mind`.

Urutan ini penting karena aplikasi mencocokkan target ke model 3D berdasarkan nomor urut. Jangan menukar urutan gambar setelah file `.mind` dibuat.

Folder `assets/` berada di root repositori dan Vite menyalin isinya ke folder hasil build. Karena itu, URL gambar dan model di browser dimulai dengan `/asset-2d/`, `/asset-3d/`, `/kartu-ar/`, `/sfx-alat-musik/`, atau `/targets/`. Jangan memindahkan folder aset ke dalam `frontend/`.

## 2. Gabungkan source code

Pastikan folder awal repositori berisi folder `assets/` dari ZIP aset. Setelah itu, ekstrak ZIP 1 dan ZIP 2 ke folder yang sama, bukan ke dalam subfolder baru.

Struktur akhirnya seperti ini:

```text
nada-nusantara/
├── assets/
│   ├── asset-2d/
│   ├── asset-3d/
│   ├── kartu-ar/
│   ├── sfx-alat-musik/
│   └── targets/
│       └── nada-nusantara.mind
├── frontend/
├── backend/
├── scripts/
├── .github/
├── package.json
├── wrangler.jsonc
└── README.md
```

## 3. Jalankan untuk QA lokal

Buka terminal di folder root repositori, lalu jalankan:

```bash
bun install
bun run check:assets
bun run typecheck
bun run dev
```

Buka `http://localhost:5173`. API lokal tersedia di `http://localhost:8788/api/health`.

Perintah `bun install` akan membuat file kunci dependensi `bun.lock` pada pemasangan pertama. Simpan file itu ke GitHub supaya seluruh anggota tim memakai versi dependensi yang sama.

Untuk memeriksa hasil build dan perilaku Worker di komputer:

```bash
bun run preview
```

Buka `http://localhost:8787`.

**Catatan kamera:** browser mensyaratkan konteks aman untuk kamera. `localhost` dapat digunakan untuk uji di komputer yang sama. Akses dari ponsel melalui alamat IP lokal biasa (HTTP) dapat ditolak browser. Untuk uji kamera ponsel, gunakan alamat HTTPS, misalnya URL preview Cloudflare setelah deployment uji.

## 4. Pemeriksaan sebelum deployment

Periksa semua hal berikut:

- Beranda dan lima kartu alat musik tampil.
- Setiap detail memuat gambar dan suara yang sesuai.
- Kamera belakang ponsel dapat dibuka melalui HTTPS.
- Kelima kartu terbaca dan menampilkan model 3D yang benar.
- Model bisa digeser, diputar, diperbesar, dan diperkecil.
- Kalibrasi gestur mendeteksi tangan dan kubus uji bergerak.
- Pengaturan kalibrasi bekerja dalam pemindaian AR.
- Muat ulang halaman mengembalikan pengaturan ke nilai awal.
- Tidak ada overflow horizontal pada layar kecil.
- Uji juga menggunakan webcam desktop.

Jangan menyatakan siap produksi sebelum semua butir tersebut lolos.

## 5. Deploy ke Cloudflare Workers Free Plan

1. Buat akun Cloudflare dan buka dashboard Workers & Pages.
2. Pastikan file `assets/targets/nada-nusantara.mind` sudah tersedia.
3. Di terminal root repositori, jalankan:

```bash
bunx wrangler login
bun run deploy
```

4. Ikuti proses login Cloudflare pada browser.
5. Setelah selesai, Wrangler menampilkan alamat project `*.workers.dev`. Buka alamat tersebut menggunakan browser HTTPS.
6. Uji halaman utama, `/api/health`, izin kamera, kelima kartu AR, dan gestur di ponsel serta desktop.

Konfigurasi `wrangler.jsonc` mengirim permintaan `/api/*` ke Hono. File antarmuka dan aset lain dilayani sebagai static assets Cloudflare Workers.

### Deployment otomatis dari GitHub (opsional)

Workflow `.github/workflows/deploy.yml` menjalankan pemeriksaan dan deployment setiap ada perubahan ke branch `main`. Tambahkan dua Repository Secrets di GitHub:

- `CLOUDFLARE_API_TOKEN`: token Cloudflare dengan izin edit Workers.
- `CLOUDFLARE_ACCOUNT_ID`: Account ID dari dashboard Cloudflare.

Jika salah satu secret belum diisi, workflow tidak akan dapat melakukan deployment.

## 6. Perintah yang sering dipakai

| Perintah | Fungsi |
|---|---|
| `bun install` | Memasang semua kebutuhan project |
| `bun run dev` | Menjalankan frontend dan backend lokal |
| `bun run typecheck` | Memeriksa kode TypeScript |
| `bun run check:assets` | Memeriksa kelengkapan dan ukuran aset |
| `bun run build` | Membuat versi siap deploy |
| `bun run preview` | Menjalankan hasil build melalui Worker lokal |
| `bun run deploy` | Memeriksa aset, build, lalu deploy ke Cloudflare |

## Cara kerja fitur penting

- **Tanpa akun:** semua pengunjung dapat membuka aplikasi langsung.
- **AR:** MindAR membaca file target `.mind`; Three.js memuat model `.glb` yang sesuai.
- **Gestur:** MediaPipe membaca titik tangan dari video kamera di perangkat. Saat gestur cubit terdeteksi, pergerakan tangan menggeser model, perubahan jarak jari mengubah ukuran, dan sudut tangan memutar model.
- **Kalibrasi:** nilai preferensi berada dalam state React pada halaman yang sedang dibuka. Tidak dikirim ke API dan tidak ditulis ke storage browser.
- **Backend:** Hono menyediakan endpoint pemeriksaan layanan dan daftar alat musik. Tidak ada database, akun, atau penyimpanan data pribadi.

## Batasan yang perlu diketahui

- Kamera membutuhkan HTTPS pada alamat publik serta izin dari pengguna.
- Deteksi gestur berjalan di perangkat; kecepatan bergantung pada kemampuan kamera dan perangkat.
- Model MediaPipe dan WASM dimuat dari CDN saat dibutuhkan. Perangkat perlu koneksi internet ketika pertama kali menggunakannya.
- Lima model 3D dan lima file audio cukup besar. Untuk jaringan lambat, waktu pemuatan pertama bisa lebih panjang.
- File target `.mind` harus dikompilasi dari kartu yang digunakan. Jika desain kartu berubah, kompilasi ulang.
- Bun adalah alat pengembangan lokal. Cloudflare Workers menjalankan backend pada runtime Cloudflare.

## Referensi teknis

- [MindAR: Compile target images](https://hiukim.github.io/mind-ar-js-doc/quick-start/compile/)
- [MindAR: Three.js image tracking](https://hiukim.github.io/mind-ar-js-doc/more-examples/threejs-image/)
- [MediaPipe Hand Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Web)
- [Hono on Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers-vite)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
