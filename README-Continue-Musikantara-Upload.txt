PERBAIKAN LANJUTAN UPLOAD MUSIKANTARA v2

Masalah versi sebelumnya:
Script lanjutan mencari clone hanya di C:\Users\USER\Documents\Projects\Musikantara-GitHub-Upload. Dari struktur folder yang terlihat, clone mungkin berada di dalam folder PROJECT-MUSIKANTARA-SOURCE\Musikantara-GitHub-Upload.

Script v2 mencari folder clone bernama Musikantara-GitHub-Upload di lokasi Projects dan satu tingkat di dalam folder project. Script memeriksa bahwa folder tersebut memiliki .git dan remote origin mengarah ke SafiraLeviathan/Project-WebAR-Musikantara. Script tidak menganggap folder source project itu sendiri sebagai clone.

Langkah:
1. Ganti file Continue-Musikantara-GitHub-Upload.ps1 lama dengan file versi v2 ini. Pastikan nama akhirnya tetap Continue-Musikantara-GitHub-Upload.ps1.
2. Buka PowerShell/terminal VS Code.
3. Jalankan:
   Set-ExecutionPolicy -Scope Process Bypass
   cd "C:\Users\USER\Documents\Projects\PROJECT-MUSIKANTARA-SOURCE"
   .\Continue-Musikantara-GitHub-Upload.ps1
4. Jika clone ada di lokasi lain, jalankan dengan path folder clone yang sebenarnya:
   .\Continue-Musikantara-GitHub-Upload.ps1 -RepoPath "D:\lokasi\Musikantara-GitHub-Upload"
5. Masukkan identitas author commit untuk frontend dan backend saat diminta. Untuk backend, gunakan email yang terverifikasi pada akun SafiraLeviathan.

Script mengatur core.autocrlf=false dan core.safecrlf=false hanya di repository clone yang terdeteksi. Script memeriksa jumlah aset, memisahkan commit frontend dan backend, lalu menjalankan push melalui alias SSH masing-masing. Tidak ada perintah penghapusan source atau folder kerja.

PENTING: Jangan menjalankan Upload-Musikantara-To-GitHub.ps1 lagi. Gunakan hanya Continue-Musikantara-GitHub-Upload.ps1 versi v2 ini.
