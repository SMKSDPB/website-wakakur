# Website Wakakur SMKS Dua Putra Biinmaffo - Tahap 2

Versi ini melanjutkan website Tahap 1 dan mempertahankan struktur GitHub Pages.

## Isi pembaruan
- Identitas header menggunakan tulisan nama sekolah sementara.
- Menambahkan sambutan Wakasek Kurikulum.
- Memperbarui profil sekolah dan bidang kurikulum.
- Memisahkan informasi jadwal umum (publik) dan jadwal lengkap (akses terbatas).
- Menghapus agenda/pengumuman contoh agar tidak dianggap sebagai informasi resmi.
- Menambahkan keterangan bahwa autentikasi belum aktif. Tidak ada login palsu di sisi browser.
- Mempertahankan desain responsif dan warna maroon, kuning, putih.

## Cara memasang ke GitHub Pages
1. Ekstrak ZIP ini di komputer.
2. Buka folder `website_wakakur_tahap1` hasil ekstrak.
3. Di repositori GitHub `website-wakakur`, ganti file `index.html` dan folder `assets` dengan versi dari paket ini.
4. Pastikan susunan di root repositori tetap:
   - `index.html`
   - `README.md`
   - `assets/css/style.css`
   - `assets/js/app.js`
   - `assets/js/data.js`
5. Commit perubahan ke branch `main`.
6. Tunggu GitHub Pages selesai deploy, lalu periksa website.

## Mengubah pengumuman dan agenda
Edit `assets/js/data.js`. Tambahkan data hanya setelah tanggal, isi, dan persetujuan publikasinya dipastikan. Contoh struktur:

```js
announcements: [
  {category:"Informasi Akademik", title:"Judul pengumuman", summary:"Isi pengumuman", date:"22 November 2026"}
],
events: [
  {day:25, month:"Nov", title:"Nama kegiatan", detail:"Keterangan kegiatan", date:"2026-11-25"}
],
calendar: {year:2026, month:10, markedDays:[25]}
```

`month` memakai angka 0-11 (0=Januari, 10=November). `markedDays` berisi tanggal yang memiliki agenda.

## Catatan keamanan dan tahap berikutnya
- GitHub Pages adalah hosting statis. Konten pada repositori publik dapat dibaca siapa saja.
- Jangan menyimpan jadwal pribadi guru, data peserta didik, password, kunci API, atau dokumen internal di repositori publik.
- Login dan akses jadwal lengkap harus dihubungkan ke autentikasi serta kebijakan akses backend (misalnya Supabase) sebelum data internal dimasukkan.
- Tombol/login belum disediakan pada tahap ini karena autentikasi belum dikonfigurasi.
