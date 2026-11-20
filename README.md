# Website Wakakur SMKS Dua Putra Biinmaffo — Tahap 1

Website statis responsif menggunakan HTML, CSS, dan JavaScript. Belum terhubung ke database, autentikasi, atau penyimpanan dokumen.

## Isi proyek
- `index.html` — struktur halaman dan navigasi.
- `assets/css/style.css` — desain responsif dan identitas warna.
- `assets/js/data.js` — data pengumuman, agenda, dan kalender contoh.
- `assets/js/app.js` — logika tampilan dan navigasi.

## Cara menjalankan
1. Ekstrak ZIP.
2. Buka folder `website_wakakur_tahap1`.
3. Buka `index.html` menggunakan browser.
4. Untuk mengubah pengumuman dan agenda, edit `assets/js/data.js`.

## Data yang wajib diganti sebelum dipublikasikan
Data pengumuman, agenda, dan tanggal kalender pada `assets/js/data.js` adalah data contoh. Ganti dengan informasi yang telah disahkan sekolah. Bagian jadwal dan unduhan masih berupa placeholder.

## Publikasi gratis melalui GitHub Pages
1. Buat akun GitHub jika belum ada.
2. Buat repository baru, misalnya `website-wakakur`.
3. Unggah seluruh isi folder proyek (bukan folder ZIP-nya).
4. Buka **Settings → Pages**.
5. Pada **Build and deployment**, pilih **Deploy from a branch**.
6. Pilih branch `main` dan folder `/ (root)`, lalu simpan.
7. Tunggu proses publikasi dan buka alamat Pages yang diberikan GitHub.

## Rencana Tahap 2
- Supabase Auth untuk akun pengguna.
- Tabel profil pengguna dan peran.
- Tabel guru, rombel, mata pelajaran, jadwal, kalender, pengumuman.
- Row Level Security (RLS) untuk membatasi akses.
- Penyimpanan dokumen privat untuk modul ajar.

**Keamanan:** jangan pernah menaruh `service_role` key Supabase atau kata sandi di file JavaScript publik. Tahap 1 tidak meminta data pribadi atau unggahan dokumen.
