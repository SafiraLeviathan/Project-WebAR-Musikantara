# Musikantara

Aplikasi edukasi WebAR untuk mengenal lima alat musik tradisional Indonesia: Angklung, Bonang, Kendang, Suling, dan Tifa. Frontend menggunakan React, Vite, TypeScript, Three.js, MindAR Image Tracking, serta MediaPipe Tasks Vision. API menggunakan Hono dan berjalan di Cloudflare Workers.

> **Status paket:** source code dan aset telah disusun menjadi dua paket tim yang saling melengkapi. Pengujian webcam, kartu AR fisik, dan tracking tangan belum dapat dilakukan di lingkungan pembuatan ini. `npm install` juga belum berhasil dijalankan karena koneksi DNS ke `registry.npmjs.org` gagal (`EAI_AGAIN`), sehingga `package-lock.json` belum dapat dihasilkan atau diverifikasi di sini. Jalankan `npm install` pada komputer yang memiliki akses npm registry setelah kedua paket digabung; perintah tersebut akan membuat lockfile lokal yang lengkap.

## Versi dan kompatibilitas dependency

Versi package utama dikunci secara eksplisit pada `package.json`. Three.js dipatok pada `0.150.1` bersama `@types/three` `0.150.1` karena MindAR `1.2.5` masih mengakses API renderer `sRGBEncoding` / `outputEncoding`; API tersebut dihapus pada Three.js r152. Memasang Three.js yang lebih baru tanpa patch terhadap library MindAR dapat menyebabkan kegagalan saat modul AR dimuat.

Node.js minimal yang ditetapkan proyek adalah `22.12.0`. Setelah dependency berhasil dipasang, `npm install` membuat `package-lock.json` yang harus disimpan dan di-commit bersama konfigurasi root.

## Isi proyek

```text
Musikantara/
├── apps/
│   └── web/
│       └── src/
│           ├── components/       # Icon dan kanvas Three.js
│           ├── pages/            # Beranda, AR, kalibrasi, perpustakaan, detail
│           ├── features/
│           │   └── gestures/     # Transformasi gesture ke objek 3D
│           ├── hooks/            # Kamera, MediaPipe, kalibrasi sesi
│           ├── services/         # Pemanggilan API Hono
│           ├── styles/           # UI responsif
│           └── types/            # Tipe aplikasi dan deklarasi MindAR
├── assets/                       # Satu salinan sumber asli yang disediakan
│   ├── asset_2d/
│   ├── asset_3d/
│   ├── kartu_ar/
│   ├── sfx_alat_musik/
│   └── targets/
├── worker/
│   ├── data/                     # Data instrumen statis
│   ├── routes/                   # Endpoint instrumen
│   ├── types/
│   └── index.ts                  # Entrypoint Hono Worker
├── tests/
│   ├── frontend/
│   └── worker/
├── docs/
├── scripts/sync-assets.mjs
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── wrangler.jsonc
└── .gitignore
```

`assets/` adalah salinan sumber kanonis. `npm run assets:sync` menyalin aset ke `public/assets` untuk disajikan oleh Vite. File hasil salinan dan WASM MediaPipe dihasilkan saat menjalankan perintah, bukan disimpan sebagai salinan kedua dalam ZIP.

## Dua kontribusi tim

### Member 1: Frontend dan konfigurasi bersama

File ini dimiliki oleh ZIP `Musikantara-Member-1-Frontend.zip`:

- `apps/web/` seluruh source React, halaman, hooks, AR, MediaPipe, Three.js, dan CSS.
- `assets/` aset asli 2D, 3D, kartu AR, audio, dan MindAR.
- `tests/frontend/` pengujian unit transformasi gestur.
- `scripts/`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `.gitignore`.
- `README.md`, dokumentasi utama, serta manifest Member 1.

### Member 2: Backend Hono

File ini dimiliki oleh ZIP `Musikantara-Member-2-Backend.zip`:

- `worker/` entry point Worker, route API, data instrumen, dan tipe backend.
- `tests/worker/` pengujian endpoint Hono.
- Dokumentasi dan manifest Member 2.

Tidak ada file path yang sama di antara kedua ZIP. Ekstrak keduanya ke folder root proyek yang sama. File backend menambahkan `worker/` dan `tests/worker/` ke proyek Member 1.

## Integrasi ZIP

1. Unduh dan ekstrak `Musikantara-Member-1-Frontend.zip` ke folder proyek.
2. Unduh dan ekstrak `Musikantara-Member-2-Backend.zip` ke folder proyek yang sama.
3. Pastikan struktur `worker/` dan `tests/worker/` telah muncul bersama folder frontend dan aset.
4. Buka terminal pada root folder Musikantara.
5. Jalankan `npm install`. Perintah ini memasang dependency dan menghasilkan `package-lock.json` berdasarkan versi yang dipasang.
6. Jalankan `npm run dev` untuk pengujian lokal.

Jangan mengekstrak masing-masing ZIP ke dua project berbeda. ZIP Member 2 adalah tambahan untuk root project yang dibuat Member 1.

## Unggah ke GitHub

Repository tujuan: <https://github.com/SafiraLeviathan/Project-WebAR-Musikantara>

### Member 1

1. Buka GitHub Desktop dan clone repository tujuan.
2. Buat branch `member-1-frontend` dari `main`.
3. Unduh dan ekstrak ZIP Member 1 ke folder sementara.
4. Salin isi hasil ekstrak ke root repository lokal. Salin isi folder, bukan folder pembungkus ZIP.
5. Periksa tab Changes. File aset yang sudah ada dan identik seharusnya tidak muncul sebagai perubahan baru.
6. Commit, push branch, lalu buat Pull Request ke `main`.
7. Setelah review dan persetujuan, merge Pull Request.

### Member 2

1. Tunggu hingga Pull Request Member 1 selesai di-merge ke `main`.
2. Di GitHub Desktop, fetch origin dan checkout `main` terbaru.
3. Buat branch `member-2-backend` dari `main` yang sudah memuat Member 1.
4. Unduh dan ekstrak ZIP Member 2 ke folder sementara.
5. Salin isi hasil ekstrak ke root repository lokal.
6. Commit, push branch, lalu buat Pull Request ke `main`.
7. Setelah review dan persetujuan, merge Pull Request.

Kedua anggota memerlukan izin **Write** atau lebih tinggi pada repository untuk mendorong branch. Jika tidak memiliki izin kolaborator, gunakan fork dan ajukan Pull Request dari fork. GitHub Desktop tidak mengintegrasikan source code dari ZIP yang belum diekstrak. Mengunggah file ZIP mentah ke GitHub tidak akan menggabungkan file sumber ke struktur aplikasi.

## Instalasi dan QA lokal di Windows

### Persiapan

- Windows 10/11.
- Node.js 22.12 atau yang lebih baru, beserta npm.
- Git dan GitHub Desktop.
- Browser Chromium/Chrome/Edge terbaru.
- Webcam untuk AR Scan dan pengenalan gestur.
- Koneksi internet saat pertama kali MediaPipe memuat model tangan dari server resmi Google.

### Perintah

Buka PowerShell atau terminal di root proyek:

```bash
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan terminal. Dengan konfigurasi default, alamatnya adalah `http://localhost:5173`.

Jalankan pemeriksaan lain:

```bash
npm run typecheck
npm test
npm run build
```

Untuk memeriksa hasil produksi secara lokal:

```bash
npm run preview
```

Buka `http://localhost:4173`. Hentikan server development atau preview dengan `Ctrl+C` pada terminal yang menjalankannya.

### Pengujian kamera dan AR

1. Buka Musikantara melalui `http://localhost:5173`, bukan `file://`.
2. Pilih menu **AR Scan**, lalu tekan **Nyalakan kamera**.
3. Izinkan akses kamera pada browser. Pada ponsel, gunakan Chrome/Edge dan pastikan deployment sudah menggunakan HTTPS.
4. Arahkan kamera ke satu kartu AR asli pada satu waktu. Jangan gunakan screenshot kartu yang tampil di layar sebagai pengganti kartu cetak saat memvalidasi hasil akhir.
5. Tunggu sampai nama instrumen muncul. Pastikan model 3D yang sesuai terlihat menempel pada target.
6. Nyalakan **Kontrol gestur tangan**. Geser tangan kiri/kanan untuk rotasi, gerakkan naik/turun untuk kemiringan, dan ubah jarak ibu jari-telunjuk untuk skala.
7. Matikan kontrol gestur, lalu pastikan pelacakan AR dan model tetap berjalan.
8. Matikan kamera sebelum meninggalkan menu.

### Pengujian kalibrasi

1. Buka **Kalibrasi** dan tekan **Aktifkan kamera**.
2. Izinkan kamera. Menu ini menggunakan video tersembunyi dan tidak merender preview video.
3. Gerakkan tangan. Dummy 3D harus merespons rotasi, kemiringan, dan pinch.
4. Ubah keempat slider dan periksa responsnya.
5. Tekan **Simpan pengaturan**, pindah ke menu lain, lalu kembali. Nilai kalibrasi tetap tersedia selama sesi tab yang sama.
6. Tekan **Reset** untuk mengembalikan nilai default.
7. Tutup sesi tab browser untuk mengakhiri penyimpanan sesi.

### Checklist QA desktop wajib

Lihat hasil awal di `docs/QA-REPORT.md`. Semua pemeriksaan perangkat nyata masih berstatus NOT TESTED dari lingkungan pembuatan ini. Setelah dependency terpasang, jalankan checklist berikut secara manual:

- Semua menu terbuka.
- Lima instrumen tampil pada perpustakaan.
- Carousel berputar setiap 30 detik.
- Kelima kartu dikenali sebagai instrumen yang benar.
- Model 3D yang sesuai tampil pada target.
- Kamera ON/OFF menghentikan dan memulai stream dengan benar.
- Audio setiap instrumen dapat diputar oleh tindakan pengguna.
- Navigasi detail instrumen berfungsi.
- Gestur tangan mengendalikan dummy dan model AR.
- Sensitivitas dan smoothing berubah sesuai slider.
- Simpan/Reset dan penyimpanan sesi berfungsi.
- Layout desktop sesuai viewport.
- Tidak ada aset gagal dimuat atau error kritis di console.
- TypeScript, test, dan production build lulus.

## Implementasi fitur

### AR dan urutan target

Database `assets/targets/musikantara.mind` asli berisi lima target. Indeks diverifikasi terhadap lima gambar kartu yang disediakan. Rangkuman pemetaan ada di `docs/AR-TARGET-MAPPING.md` dan `docs/AR-TARGET-MAPPING.json`.

### Kamera dan MediaPipe

- MindAR menginisialisasi stream kamera AR satu kali.
- MediaPipe menggunakan elemen video `MindARThree.video` yang sama saat gesture AR dinyalakan. Tidak ada stream kedua untuk mode ini.
- Kalibrasi meminta satu stream kamera terpisah ketika menu diaktifkan. Video disembunyikan di luar area tampilan; UI hanya menampilkan dummy 3D.
- WASM MediaPipe disalin dari package lokal melalui `assets:sync`. File model `hand_landmarker.task` dimuat dari URL resmi Google saat tracking diaktifkan, sehingga koneksi internet diperlukan saat pemuatan model.
- Kalibrasi hanya disimpan di `sessionStorage`, tidak memakai `localStorage`, cookie, atau database.

### API

- `GET /api/health`
- `GET /api/instruments`
- `GET /api/instruments/:id`

Data instrumen disimpan statis di `worker/data/instruments.ts`.

## Deploy Cloudflare Workers

Deployment **belum dilakukan**. Setelah integrasi dan local QA berhasil:

1. Buat atau buka akun Cloudflare.
2. Pastikan `wrangler.jsonc` memakai nama Worker yang tersedia dan konfigurasi aset mengarah ke `dist/client`.
3. Pastikan Node.js dan npm terpasang, lalu jalankan `npm install`.
4. Login:

   ```bash
   npx wrangler login
   ```

5. Build dan cek:

   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

6. Deploy:

   ```bash
   npm run deploy
   ```

7. Salin alamat HTTPS `*.workers.dev` yang dilaporkan Wrangler.
8. Buka alamat tersebut di ponsel dan izinkan kamera belakang.
9. Uji semua lima kartu, model 3D, audio, dan kontrol gestur.

Jangan simpan token atau kredensial Cloudflare di repository. Jangan membuat `.dev.vars` berisi rahasia lalu mengunggahnya. Konfigurasi ini tidak membutuhkan secret untuk endpoint katalog statis.

## QA berulang

Kirim catatan QA dengan informasi berikut dalam teks biasa:

- Halaman/menu yang bermasalah.
- Langkah untuk mengulang masalah.
- Hasil yang diharapkan dan hasil aktual.
- Browser, perangkat, ukuran layar, dan apakah berjalan di localhost atau HTTPS.
- Screenshot atau pesan console bila tersedia.

Setiap revisi berikutnya akan disiapkan sebagai `Musikantara-QA-Patch-01.zip`, kemudian `Musikantara-QA-Patch-02.zip`, dan seterusnya. Patch berisi file sumber lengkap yang berubah, path relatif asli, `PATCH-INSTRUCTIONS.txt`, daftar file pengganti, file baru, dan file yang perlu dihapus. File yang tidak berubah tidak disertakan kecuali dibutuhkan untuk mengganti proyek lengkap secara aman.

## Keterbatasan yang diketahui

- Dependency installation dan lockfile belum dapat diverifikasi karena DNS npm registry gagal pada lingkungan pembuatan ini. Jalankan `npm install` pada komputer dengan akses registry.
- Pengenalan tangan memerlukan koneksi untuk mengambil model `.task` resmi Google saat pertama kali digunakan.
- Kamera fisik, kelima kartu cetak, dan tracking model di kondisi nyata belum diuji.
- Deployment Cloudflare belum dijalankan; domain HTTPS perlu dibuat dari akun Cloudflare pemilik proyek.
