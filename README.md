# Musikantara

**Ruang belajar alat musik tradisional Nusantara berbasis Augmented Reality (AR).**

Musikantara adalah aplikasi web edukatif yang membantu pengguna mengenal lima alat musik tradisional Indonesia melalui informasi, suara, dan tampilan model 3D berbasis AR.

## Buka aplikasi

**[Buka Musikantara](https://musikantara-web.untitledprojects.workers.dev/)**

Aplikasi dapat dibuka langsung melalui browser tanpa membuat akun.

## Apa yang bisa dilakukan?

- **Scan AR:** Arahkan kamera ke kartu AR untuk melihat model 3D alat musik.
- **Kenali alat musik:** Pelajari asal daerah, jenis, deskripsi, dan cara memainkan Angklung, Bonang, Kendang, Suling, serta Tifa.
- **Dengarkan suara:** Putar contoh suara dari setiap alat musik.
- **Atur model 3D:** Putar, geser, dan ubah ukuran model menggunakan kontrol sentuh atau gestur tangan.
- **Pengaturan kontrol:** Sesuaikan sensitivitas kontrol sesuai kebutuhan.

## Cara menggunakan

1. Buka [Musikantara](https://musikantara-web.untitledprojects.workers.dev) melalui browser.
2. Izinkan akses kamera ketika diminta.
3. Buka menu **Scan AR**, lalu arahkan kamera belakang ke salah satu kartu AR.
4. Setelah alat musik terdeteksi, lihat model 3D dan gunakan tombol suara atau kontrol yang tersedia.

**[Lihat dan unduh kartu AR di repository](https://github.com/SafiraLeviathan/Project-WebAR-Musikantara/tree/main/frontend/public/assets/kartu_ar)**

## Catatan penggunaan

- Gunakan browser modern dan koneksi internet. Akses kamera memerlukan izin browser.
- Untuk deteksi gestur yang lebih stabil, hasil pengujian menunjukkan tangan perlu berada sekitar **20 cm atau lebih** dari kamera depan. Jarak 5–10 cm belum optimal.
- Kelancaran model 3D bergantung pada kemampuan perangkat, jadi expect ada gerakan model melalui gestur masih dapat mengalami lag.
- Penggunaan kamera depan dan belakang secara bersamaan bergantung pada dukungan HP dan browser. Jika gestur tidak berjalan baik, nonaktifkan mode gestur dan gunakan kontrol sentuh yang tersedia.

## Tentang project

Musikantara dikembangkan sebagai media pembelajaran interaktif untuk memperkenalkan alat musik tradisional Indonesia. Dipublikasikan melalui Cloudflare Workers.

---

**Repository:** [Project-WebAR-Musikantara](https://github.com/SafiraLeviathan/Project-WebAR-Musikantara)
