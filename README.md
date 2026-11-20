# MUSIKANTARA

Aplikasi edukasi alat musik tradisional Indonesia berbasis Vue, WebAR, dan kontrol gestur tangan.

## Isi project

```text
PROJECT-MUSIKANTARA-SOURCE/
├── frontend/   # Vue 3 + Vite + TypeScript, UI, WebAR, 3D, sensor gestur, dan aset
├── backend/    # Hono + TypeScript + konfigurasi Cloudflare Workers
├── scripts/    # Skrip pengembangan lokal
└── README.md
```

Frontend dan backend berada dalam satu workspace agar dua kontributor dapat mengerjakan folder masing-masing di repositori GitHub yang sama. Jangan memindahkan `frontend/` dan `backend/` keluar dari root workspace jika ingin memakai skrip build, development, dan deployment yang disediakan.

## Teknologi yang dipakai

- Vue `3.5.45`, Vite `8.3.8`, TypeScript `6.0.3`, `vue-tsc` `3.3.14`
- Hono `4.13.19` dan Wrangler `4.165.0`
- MindAR `1.2.5` untuk image tracking
- Three.js `0.187.0` untuk model dan interaksi 3D

MindAR `1.2.5` masih menggunakan nama API warna Three.js lama (`sRGBEncoding`/`outputEncoding`). Project mempertahankan Three.js `0.187.0` dan menerapkan adapter kompatibilitas kecil pada bundle browser MindAR setelah instalasi (bukan menurunkan Three.js ke versi lama). Adapter mengubah nama API tersebut ke `SRGBColorSpace`/`outputColorSpace`. Script berjalan otomatis pada `postinstall` dan sebelum `vite build`; jalankan `npm run patch:mindar --workspace frontend` secara manual jika instalasi dilakukan dengan `--ignore-scripts`.
- MediaPipe Tasks Vision `1.2.3` untuk deteksi hingga dua tangan
- Plus Jakarta Sans untuk tipografi

TypeScript dipatok pada `6.0.3`, bukan TypeScript `7.x`, karena `vue-tsc` `3.3.x` masih memanggil entry internal `typescript/lib/tsc` yang tidak lagi diekspor TypeScript 7.0.2. Ini mencegah error `ERR_PACKAGE_PATH_NOT_EXPORTED` saat pemeriksaan tipe. TypeScript 6.0.3 adalah rilis stabil pada jalur kompatibel yang dipakai project ini. Versi dependency utama dipatok di `package.json` agar versi tidak berubah diam-diam. MindAR `1.2.5` adalah rilis stabil terakhir yang tersedia di npm dan dipakai karena file target yang diterima berformat `.mind`; tanggal rilis paketnya sudah lama, sehingga integrasi ini perlu diuji pada browser aktual. Instalasi membutuhkan koneksi internet.

## Menjalankan project secara lokal

1. Install Node.js versi 22.12 atau lebih baru. Node.js 24 LTS atau 26 LTS dapat digunakan. Node.js 26 yang sudah terpasang juga didukung oleh konfigurasi project ini. Setelah instalasi, buka Terminal atau PowerShell.
2. Ekstrak ZIP project. Buka terminal pada folder `PROJECT-MUSIKANTARA-SOURCE`, yaitu folder yang berisi `package.json` utama.
3. Jalankan:

   ```bash
   npm install
   ```

   Proses ini memasang dependency frontend dan backend serta menyalin file WASM MediaPipe ke folder public. Root `package.json` memiliki override lokal khusus untuk dependency `canvas` milik MindAR. MindAR membawa `canvas` untuk compiler target berbasis Node, sedangkan Musikantara hanya membaca file `.mind` yang sudah dikompilasi melalui bundle browser MindAR. Stub lokal mencegah npm mencoba membangun binding native `canvas` yang gagal pada beberapa versi Node/Windows. Fitur scan AR tidak menggunakan stub tersebut. Stub ini hanya untuk instalasi aplikasi yang memakai file target `.mind` yang sudah tersedia, bukan untuk membuat atau mengompilasi target `.mind` baru. Jika suatu saat target perlu dikompilasi ulang, lakukan proses compiler secara terpisah dengan dependency `canvas` asli. Kamu tidak perlu memasang Visual Studio C++ Build Tools untuk menjalankan project ini.
4. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

   Skrip akan memeriksa tipe TypeScript dengan TypeScript 6.0.3, membangun frontend, lalu menyalakan Vite dan Hono Worker secara bersamaan. Skrip memanggil CLI npm melalui executable Node saat ini agar berjalan di Windows tanpa `shell: true`.
5. Buka `http://localhost:5173` pada Chrome atau Edge versi terbaru.

Untuk berhenti, tekan `Ctrl + C` pada terminal yang menjalankan project.


### Jika `npm install` sebelumnya gagal di `node_modules\canvas` (Windows)

Jika pernah terjadi kegagalan instalasi dengan pesan `node-pre-gyp`, `node-v147`, `404 Not Found`, atau `Could not find any Visual Studio installation`, gunakan ZIP revisi ini lalu bersihkan instalasi parsial sebelum memasang ulang. Tutup terminal yang menjalankan project dan proses Node milik project terlebih dahulu. Pada PowerShell di root project, jalankan:

```powershell
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }
npm cache verify
npm install
```

Pesan `EPERM` pada bagian cleanup biasanya muncul karena proses lain masih mengunci file di `node_modules`. Pastikan server Vite/Wrangler sudah berhenti. Jika masih terkunci, tutup VS Code atau File Explorer yang sedang membuka folder tersebut, lalu ulangi penghapusan. Jangan menghentikan semua proses `node.exe` jika kamu sedang menjalankan project Node lain. Peringatan `deprecated` atau `ERESOLVE overriding peer dependency` dari dependency transitif MindAR/TensorFlow bukan penyebab kegagalan fatal selama perintah selesai dengan exit code `0`. Jangan memakai `--force` atau `--legacy-peer-deps` sebagai langkah pertama.

### Jika `npm run dev` gagal pada `vue-tsc` / TypeScript

Jika muncul `ERR_PACKAGE_PATH_NOT_EXPORTED` dengan subpath `./lib/tsc`, pastikan semua workspace menggunakan TypeScript `6.0.3`. TypeScript 7.x belum cocok dengan `vue-tsc` `3.3.x` yang dipakai project ini. Source v1.0.5 tetap mengunci TypeScript ke versi tersebut pada root, frontend, dan backend. Setelah mengganti source code, hapus `node_modules` dan `package-lock.json`, lalu jalankan `npm install` kembali agar npm tidak memakai instalasi lama.

```powershell
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }
npm install
npm run dev
```

Jangan memasang TypeScript 7 secara manual atau menjalankan `npm update typescript` pada project ini sampai `vue-tsc` menyatakan dukungan TypeScript 7 secara eksplisit.

### Izin kamera

Kamera browser hanya dapat digunakan pada konteks aman, yaitu `localhost` atau alamat HTTPS. Saat membuka menu Scan AR, izinkan kamera belakang. Saat mengaktifkan kontrol gestur, izinkan kamera depan juga. Audio biasanya baru dapat diputar setelah tombol suara disentuh.

Sensor gestur mengunduh model MediaPipe dari server Google ketika pertama kali diaktifkan. Karena itu koneksi internet tetap diperlukan saat fitur gestur digunakan. File WASM MediaPipe disalin secara lokal oleh skrip instalasi. Pemrosesan frame kamera berlangsung di perangkat; dokumentasi MediaPipe menyatakan API tetap dapat mengirim metrik penggunaan/performa ke Google, bukan frame video.

## Build dan preview

```bash
npm run build
npm run preview
```

Perintah build menjalankan pemeriksaan tipe frontend dan backend, kemudian menghasilkan `frontend/dist`. Preview menjalankan hasil build melalui Wrangler di `http://127.0.0.1:8787`.

## Deployment ke Cloudflare Workers Free

1. Buat atau masuk ke akun Cloudflare pada `https://dash.cloudflare.com/`.
2. Pastikan Node.js tersedia di komputer.
3. Buka terminal pada root `PROJECT-MUSIKANTARA-SOURCE`.
4. Jalankan `npm install` jika dependency belum terpasang.
5. Jalankan:

   ```bash
   npm run deploy
   ```

6. Pada pertama kali deployment, Wrangler akan meminta otorisasi. Ikuti halaman browser untuk menghubungkan akun Cloudflare.
7. Setelah proses berhasil, terminal menampilkan alamat Worker dengan pola `https://musikantara-web.<subdomain>.workers.dev`. Buka alamat tersebut untuk mengakses aplikasi.

Setiap revisi berikutnya dapat dipublikasikan dengan menjalankan `npm run deploy` lagi dari root folder. Tidak perlu mengunggah file satu per satu ke dashboard.

Konfigurasi Worker ada di `backend/wrangler.jsonc`. File frontend hasil build dan semua aset berada di `frontend/dist` dan dipublikasikan sebagai static assets. Pada Workers Free, batas API Worker adalah 100.000 request per hari dan 10 ms CPU per request. Batas static assets Free adalah 20.000 file per versi Worker dan 25 MiB per file; kelima model GLB dalam paket ini berada di bawah batas file individual tersebut. Request `/api/*` menjalankan Hono Worker, sedangkan berkas statis dilayani sebagai assets. Endpoint API Hono tersedia di `/api/health`, `/api/instruments`, dan `/api/instruments/:id`.

## Alur kontribusi GitHub

Folder frontend dan backend memang dipisah agar pembagian tugas lebih mudah. Namun, workspace ini dirancang tetap berada dalam satu repositori GitHub dengan struktur folder di atas. Kontributor frontend mengirim perubahan pada `frontend/`, kontributor backend mengirim perubahan pada `backend/`, sementara file root seperti `package.json`, `scripts/`, dan `README.md` dipertahankan agar kedua bagian tetap dapat dibangun dan dideploy bersama.

## Catatan WebAR dan kamera

- `frontend/public/assets/targets/musikantara.mind` adalah target MindAR dari paket aset.
- Lima file GLB, gambar 2D, kartu AR, dan audio WAV disimpan di `frontend/public/assets/`.
- Repositori sumber dan ZIP aset yang diberikan tidak mencantumkan lisensi distribusi khusus untuk aset. Pastikan hak penggunaan dan publikasi aset telah dimiliki sebelum repositori atau situs dibuat publik.
- Saat ini pemetaan `targetIndex` disusun berurutan sesuai urutan lima aset yang disediakan: Angklung, Bonang, Kendang, Suling, Tifa. File `.mind` tidak menyimpan label instrumen yang dapat dibaca aplikasi. Karena itu, **urutan target harus dikonfirmasi dengan mencoba setiap kartu saat QA**. Bila ada kartu yang tertukar, ubah nilai `targetIndex` di `frontend/src/data/instruments.ts`.
- Aplikasi mencoba memakai kamera belakang untuk AR dan kamera depan untuk sensor gestur. Dukungan dua stream kamera secara bersamaan bergantung pada perangkat, browser, dan driver kamera. Jika perangkat tidak mengizinkan dua kamera aktif bersamaan, kontrol gestur akan menampilkan status gagal dan kontrol mouse/touch tetap tersedia.
- Pada laptop dengan satu webcam, kamera depan dan kamera AR bisa merujuk ke perangkat yang sama. Perilaku simultan perlu diuji pada laptop yang digunakan. Jika sensor gagal aktif, matikan toggle gestur agar kontrol mouse/touch kembali aktif.
- Mode gestur memakai satu atau dua tangan. Satu tangan menggeser, memutar, dan mengubah skala dengan pinch. Dua tangan menggunakan titik tengah untuk pan, sudut antartangan untuk rotasi, dan jarak antartangan untuk skala.
- Filter MindAR dan smoothing input gestur digunakan untuk mengurangi jitter. Hasil tetap dipengaruhi kualitas kamera, pencahayaan, jarak, permukaan kartu, dan performa perangkat.
- Sensitivitas dan pilihan mode hanya hidup selama tab/aplikasi aktif. Tidak disimpan di localStorage atau database.

## Batas verifikasi awal

Source code disiapkan untuk QA manual, bukan dinyatakan sudah lulus QA perangkat. Pengujian kamera AR, kamera depan dan belakang bersamaan, pencocokan kelima target, akurasi gestur, suara, serta responsivitas pada perangkat nyata tetap harus dilakukan sebelum menyebut aplikasi siap dipublikasikan. Daftar skenario ada di `MANUAL-QA.md`.


## Kompatibilitas Three.js dan MindAR

MindAR 1.2.5 mengimpor `sRGBEncoding`, yang telah diubah pada Three.js r152 menjadi `SRGBColorSpace`. Project ini mempertahankan Three.js 0.187.0 dan mengadaptasi bundle MindAR browser melalui `frontend/scripts/patch-mindar-compat.mjs`. Script berjalan pada postinstall dan sebelum build. Jalankan `npm run patch:mindar --workspace frontend` jika postinstall dilewati.


## Revisi v1.0.4: Perbaikan Scan AR

- Video kamera MindAR ditampilkan di atas background stage dan di bawah canvas WebGL transparan.
- Overlay bawaan MindAR (`uiLoading`, `uiScanning`, `uiError`) dimatikan. UI Scan AR dikendalikan oleh Musikantara.
- Menambahkan pencahayaan ambient, hemisphere, dan directional pada scene agar material GLB terlihat.
- Layer CSS3D MindAR dibuat non-interaktif dan dilepas saat sesi kamera berhenti.
- Audio instrumen tidak diubah karena tidak bermasalah pada QA pertama.

Catatan: akses kamera harus dilakukan melalui `localhost` atau HTTPS. Uji rendering video, pencahayaan model, kontrol tombol, dan setiap kartu AR pada perangkat yang sebenarnya.


## Revisi v1.0.5: Stabilitas sensor gestur dan kamera

- Sensor gestur menggunakan MediaPipe CPU delegate sebagai jalur utama agar tidak bergantung pada inisialisasi GPU/WebGL perangkat.
- Pemeriksaan landmarks dibuat defensif, memvalidasi jumlah titik tangan sebelum menghitung posisi, dan mengabaikan frame yang tidak lengkap.
- Loop deteksi hanya memproses frame video baru dengan timestamp monotonik.
- Stream kamera sensor dihentikan terlebih dahulu saat sensor dilepas; elemen video dihentikan dan `srcObject` dilepas, lalu instance MediaPipe ditutup.
- Proses startup sensor memiliki generation guard agar stream yang selesai diminta setelah sensor dimatikan langsung dihentikan.
- MindAR Scan AR memiliki generation guard dan membatalkan kamera jika izin baru diberikan setelah pengguna meninggalkan halaman.
- Penghentian Scan AR tidak hanya bergantung pada `runtime.stop()`: semua track, video, canvas, CSS3D layer, animation loop, dan renderer dibersihkan secara eksplisit.
- Saat gestur dimatikan dari Pengaturan Kontrol, status tangan dan frame gestur langsung direset.

Catatan: MediaPipe Task model tetap diunduh dari host model Google pada aktivasi pertama, sedangkan file WASM dilayani secara lokal. Uji sensor pada browser/perangkat aktual tetap diperlukan, terutama kamera depan-belakang simultan.


## Revisi v1.0.6: sensor gestur

Sensor gestur memakai MediaPipe Tasks Vision 1.2.3. Inisialisasi menggunakan canvas HTML secara eksplisit, GPU sebagai jalur utama, dan CPU sebagai fallback. Saat GPU gagal ketika inferensi, sensor mencoba pemulihan CPU. WASM diambil dari folder lokal `/mediapipe/wasm`; apabila aset lokal tidak tersedia, aplikasi mencoba CDN resmi dengan versi dipatok `1.2.3`. Model tangan diunduh satu kali sebagai buffer per sesi sensor.

Pengujian perangkat nyata tetap diperlukan karena MediaPipe membutuhkan browser dengan kamera dan WebGL yang berfungsi. Lihat `MANUAL-QA.md` bagian QA v1.0.6.
