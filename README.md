# 🌌 Galaxy AI Agent — Fase 1 (Chat & Memory Core)

Galaxy AI Agent adalah asisten AI pribadi yang hidup di dalam ruang visual 3D Galaxy (Three.js), terhubung ke Supabase (Database, Auth, dan RLS) dan OpenAI API melalui serverless backend Vercel.

---

## 📁 Struktur File Fase 1

- `index.html` — Antarmuka web utama: Ruang 3D Galaxy, Panel Chat AI Galaxy interaktif, dan modal Supabase Auth.
- `api/chat.js` — Vercel Serverless Function: Memvalidasi JWT Supabase, menyimpan pesan user & AI, dan berinteraksi aman dengan OpenAI API.
- `supabase_setup.sql` — Skrip DDL & Migrasi SQL lengkap untuk Supabase (tabel `profiles`, `ai_conversations`, `ai_messages`, `ai_agent_settings`, trigger user baru, dan Row Level Security).
- `package.json` — Konfigurasi dependensi project (`@supabase/supabase-js`, `openai`).
- `.env.example` — Contoh environment variables untuk Vercel.

---

## 🚀 Panduan Setup & Menjalankan

### Langkah 1: Setup Database Supabase
1. Buka dashboard proyek Supabase Anda di [supabase.com](https://supabase.com).
2. Masuk ke menu **SQL Editor**.
3. Buat query baru, salin seluruh isi file [`supabase_setup.sql`](./supabase_setup.sql), lalu klik **Run**.
4. Semua tabel (`profiles`, `ai_conversations`, `ai_messages`, `ai_agent_settings`) serta aturan keamanannya (RLS) siap digunakan.

### Langkah 2: Setup Environment Variables di Vercel
Saat deploy ke [Vercel](https://vercel.com):
Tambahkan variabel lingkungan berikut di **Project Settings > Environment Variables**:

| Variable | Deskripsi |
|---|---|
| `OPENAI_API_KEY` | Secret Key OpenAI Anda (`sk-...`) |
| `OPENAI_MODEL` | Default: `gpt-4o-mini` (hemat & cepat) |
| `SUPABASE_URL` | URL Proyek Supabase (`https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key Supabase (untuk akses server) |
| `SUPABASE_ANON_KEY` | Anon Public Key Supabase |

### Langkah 3: Menjalankan di Lokal
Jika menggunakan Vercel CLI:
```bash
npm install
vercel dev
```
Buka browser di `http://localhost:3000`.

### Langkah 4: Menghubungkan Frontend ke Supabase
1. Buka web di browser.
2. Klik tombol **Masuk / Akun** di pojok kanan atas.
3. Pilih tab **Koneksi Supabase**, masukkan `Supabase URL` dan `Supabase Anon Key` proyek Anda, lalu klik **Simpan Koneksi**.
4. Beralih ke tab **Daftar** untuk membuat akun baru atau **Masuk** jika sudah punya akun.
5. Klik tombol **Chat Galaxy** di pojok kanan atas untuk mulai berinteraksi!

