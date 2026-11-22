# SIM-PENSIUN BRIDA

Sistem Informasi Monitoring Pensiun Pegawai untuk **BRIDA & UPTB Provinsi Sumatera Selatan**. Aplikasi ini membantu Subbagian Umum & Kepegawaian memantau proyeksi pensiun pegawai berdasarkan tanggal lahir yang diekstrak otomatis dari NIP 18 digit, dengan Batas Usia Pensiun (BUP) default **60 tahun** dan aturan TMT standar BKN (**tanggal 1 bulan berikutnya**).

## Fitur Utama

- **Dasbor KPI & Proyeksi (`/`)**: Ringkasan pegawai aktif, kategori urgensi, grafik proyeksi 10 tahun ke depan, serta daftar 8 prioritas terdekat.
- **Monitoring Pensiun (`/monitoring`)**: Tab cepat urgensi dengan counter real-time, filter multi-kriteria (Nama/NIP/Jabatan, Unit, Status PNS/PPPK, Tahun TMT, Status Pemberkasan), sorting dinamis, pagination, serta slide-over drawer untuk override BUP (`58`/`60`/`65`/`70`) dan update status berkas.
- **Data Pegawai (`/pegawai`)**: Master CRUD pegawai aktif & arsip purna tugas dengan auto-fill Tanggal Lahir, Jenis Kelamin, dan pratinjau TMT Pensiun saat NIP 18 digit diketik.
- **Impor & Laporan (`/impor-laporan`)**:
  - Impor langsung file Excel multi-sheet format BRIDA (`DATA PEGAWAI BRIDA DAN UPTB BRIDA.xlsx`) lengkap dengan deteksi blok PNS / PPPK Penuh / PPPK Paruh, sanitasi non-breaking space (`\xa0`) pada NIP, pratinjau validasi, dan mode upsert aman.
  - Ekspor laporan `.xlsx` terfilter dan pratinjau cetak formal A4 Landscape (`/laporan/cetak`).
- **Pengaturan (`/pengaturan`)**: Konfigurasi identitas instansi untuk kop cetak, default BUP, metode TMT, dan ambang peringatan dengan kalkulasi ulang TMT massal.

## Prasyarat

- Node.js 20+
- **`pnpm`** (wajib; jangan menggunakan `npm` atau `yarn`)
- PostgreSQL 15+

## Setup Lokal (`pnpm`)

1. **Instalasi dependensi:**

```bash
pnpm install
```

2. **Konfigurasi environment:**

Salin `.env.example` menjadi `.env` dan sesuaikan koneksi PostgreSQL Anda:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sim_pensiun_brida"
```

3. **Migrasi & Seed Database (Drizzle ORM):**

```bash
pnpm db:push
pnpm db:seed
```

4. **Jalankan Server Development:**

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Impor Awal File Excel BRIDA

1. Buka menu **Impor & Laporan** (`/impor-laporan`).
2. Unggah file `DATA PEGAWAI BRIDA DAN UPTB BRIDA.xlsx` secara langsung (mendukung sheet `PNS BRIDA `, `UPTB KRS BRIDA`, `UPTB STP BRIDA`, serta blok PNS / PPPK Penuh / PPPK Paruh).
3. Periksa hasil **Pratinjau Data** (baris baru, duplikat NIP, dan baris invalid jika ada).
4. Klik **Konfirmasi Impor** untuk menyimpan seluruh data ke PostgreSQL.

## Verifikasi & Pengujian

```bash
pnpm test       # Menjalankan unit test Vitest (NIP parser, TMT calculator, Excel importer)
pnpm typecheck  # Pemeriksaan tipe TypeScript
pnpm lint       # Pemeriksaan ESLint
pnpm build      # Build produksi Next.js
```
