# GEMINI.MD — Spesifikasi & Panduan Eksekusi `SIM-PENSIUN BRIDA`

Dokumen ini adalah *single source of truth* untuk membangun aplikasi web **SIM-PENSIUN BRIDA** (Sistem Informasi Monitoring Pensiun Pegawai BRIDA & UPTB). Ikuti seluruh spesifikasi arsitektur, aturan domain, desain UI, standar `pnpm`, serta aturan *atomic commit* secara ketat tanpa melompati tahapan.

---

## 1. Ringkasan Proyek

* **Nama Aplikasi:** SIM-PENSIUN BRIDA
* **Tujuan:** Memudahkan petugas/admin subbagian Umum & Kepegawaian memantau pegawai yang akan memasuki masa pensiun berdasarkan tanggal lahir (terekstrak otomatis dari NIP 18 digit), dengan **usia default pensiun 60 tahun**, dilengkapi filter multi-kriteria, sorting dinamis, impor langsung dari file Excel BRIDA/UPTB, serta ekspor laporan siap cetak.
* **Referensi Ergonomi UI:** Aplikasi kepegawaian pemerintahan Indonesia modern (SIASN BKN / SIMPEG berbasis standar SPBE) yang formal, bersih, minim dekorasi, kontras tinggi, dan mudah dinavigasi oleh staf dari berbagai rentang usia.
* **Bahasa Antarmuka (UI):** Bahasa Indonesia baku (formal kepegawaian).
* **Bahasa Kode & Commit:** Bahasa Inggris (variabel, fungsi, skema DB, dan pesan *Conventional Commit*).

---

## 2. Tech Stack & Aturan Tooling (WAJIB `pnpm`)

> **ATURAN KERAS PACKAGE MANAGER:** Wajib menggunakan **`pnpm`** untuk seluruh instalasi dependensi, menjalankan script, dan eksekusi CLI (`pnpm add`, `pnpm dlx`, `pnpm run`). **DILARANG** menggunakan `npm`, `npx`, `yarn`, atau `bun`. Jangan membuat file `package-lock.json` atau `yarn.lock`.

* **Framework:** Next.js 15+ (App Router, Server Actions / Route Handlers)
* **Bahasa:** TypeScript (`strict: true`)
* **Styling:** Tailwind CSS v4 (atau v3 sesuai template Next.js terbaru) + `shadcn/ui`
* **Data Table:** `@tanstack/react-table` v8
* **Database & ORM:** PostgreSQL + Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres`)
* **Validasi:** `zod` + `react-hook-form` (`@hookform/resolvers`)
* **Charts:** `recharts` (sederhana & responsif)
* **Excel Engine:** `xlsx` (SheetJS) atau `exceljs` untuk *parsing* & ekspor `.xlsx`
* **PDF / Print:** CSS `@media print` khusus kertas A4 Landscape dengan kop instansi resmi (ringan, presisi, tanpa bloat headless browser)
* **Ikon:** `lucide-react`
* **Testing:** `vitest` (wajib untuk *unit test* logika parser NIP, kalkulasi TMT pensiun, dan Excel parser)
* **Date Utility:** `date-fns` (dengan locale `id`)

---

## 3. Desain Sistem & UI/UX (Warna Simple & Sederhana)

Prinsip desain: **tenang, netral, resmi, dan fokus pada keterbacaan tabel data**. Hindari gradien mencolok, *glassmorphism*, animasi berlebihan, atau warna-warni yang ramai.

### 3.1 Palet Warna Minimalis
Gunakan pendekatan **Monochrome Slate + 1 Aksen Biru Gelap Redam** agar terlihat bersih dan profesional:

| Peran Warna | Nilai Hex / Token Tailwind | Penggunaan |
| :--- | :--- | :--- |
| **Background Canvas** | `#F8FAFC` (`slate-50`) | Latar utama halaman |
| **Surface / Card** | `#FFFFFF` (`white`) | Kartu KPI, kontainer tabel, sidebar, modal/drawer |
| **Border / Divider** | `#E2E8F0` (`slate-200`) | Garis pemisah tipis yang rapi di tabel & kartu |
| **Primary Accent** | `#1E3A5F` (Muted Gov Navy) | Tombol aksi utama, indikator menu aktif, fokus input |
| **Primary Hover** | `#162D4A` | Hover tombol utama |
| **Text Primary** | `#0F172A` (`slate-900`) | Judul, nama pegawai, angka KPI |
| **Text Secondary** | `#475569` (`slate-600`) | Label form, jabatan, sub-teks |
| **Text Muted** | `#64748B` (`slate-500`) | Placeholder, metadata, breadcrumb |

### 3.2 Warna Status Urgensi (Soft Muted Pill Badges — Tidak Mencolok)
Gunakan latar pastel sangat lembut dengan teks gelap agar nyaman dipindai di tabel panjang:
* **Lewat BUP / Perlu Cek (`OVERDUE`):** `bg-red-50 text-red-700 border-red-200`
* **Kritis ≤ 6 Bulan (`CRITICAL`):** `bg-rose-50 text-rose-700 border-rose-200`
* **Siaga 6–12 Bulan (`WARNING`):** `bg-amber-50 text-amber-800 border-amber-200`
* **Persiapan 1–2 Tahun (`UPCOMING`):** `bg-sky-50 text-sky-800 border-sky-200`
* **Aman > 2 Tahun (`SAFE`):** `bg-slate-100 text-slate-600 border-slate-200`

### 3.3 Tipografi & Keterbacaan Data ASN
* **Font Utama:** `Inter` atau `Plus Jakarta Sans` (bersih, terbaca jelas di ukuran `14px`).
* **Angka & NIP:** Wajib pakai `font-mono tabular-nums`.
* **Format Tampilan NIP:** Selalu tampilkan NIP 18 digit dengan format spasi standar BKN: `YYYYMMDD YYYYMM G NNN` (contoh: `19670629 199503 2 001`) agar tanggal lahir langsung terlihat sekilas, namun tetap simpan sebagai 18 digit bersih tanpa spasi di database.
* **Format Tanggal Indonesia:** `01 Juli 2027` atau `01 Jul 2027` di kolom tabel sempit.
* **Tombol Eksplisit:** Selalu sertakan label teks di samping ikon pada tombol utama (contoh: `[Ikon] Ekspor Excel`, `[Ikon] Tambah Pegawai`). Hindari tombol *icon-only* tanpa tooltip yang jelas.

### 3.4 Struktur Navigasi (Maksimal 5 Menu Datar)
Gunakan **Fixed Left Sidebar** (`w-64`, collapsible di mobile) + **Top Header Bar** (`h-14`, menampilkan Breadcrumb & tanggal hari ini):
1. **Dasbor** (`/`) — Ringkasan KPI, proyeksi pensiun, daftar prioritas.
2. **Monitoring Pensiun** (`/monitoring`) — Halaman utama: tab cepat urgensi, filter multi-kriteria, sorting, tabel pegawai, dan drawer detail.
3. **Data Pegawai** (`/pegawai`) — Master CRUD pegawai, tambah/edit dengan auto-parse NIP, toggle status aktif/purna tugas.
4. **Impor & Laporan** (`/impor-laporan`) — Upload file Excel BRIDA/UPTB dengan pratinjau validasi + generator ekspor Excel/PDF.
5. **Pengaturan** (`/pengaturan`) — Default usia BUP (`60`), metode hitung TMT, ambang peringatan bulan, serta nama instansi untuk kop cetak.

---

## 4. Aturan Domain & Logika Bisnis (SPESIFIKASI KETAT)

### 4.1 Parser NIP 18 Digit (`src/lib/nip-parser.ts`)
Format NIP ASN/PPPK Indonesia terdiri dari tepat 18 digit numerik:
* **Digit 1–8 (`YYYYMMDD`):** Tanggal lahir pegawai. Wajib divalidasi sebagai tanggal kalender yang sah (misal tolak bulan 13 atau tanggal 31 Februari).
* **Digit 9–14 (`YYYYMM`):** Tahun dan bulan pengangkatan CPNS/PPPK.
* **Digit 15 (`G`):** Jenis kelamin (`1` = Laki-laki / `L`, `2` = Perempuan / `P`).
* **Digit 16–18 (`NNN`):** Nomor urut.

**Aturan Sanitasi NIP:**
* Hapus seluruh karakter non-digit termasuk spasi biasa dan *non-breaking space* (`\u00A0` / `\xa0`) menggunakan `raw.replace(/\D/g, '')`.
* Jika panjang hasil bukan 18 digit atau tanggal lahir tidak valid, kembalikan status error validasi yang informatif.

### 4.2 Kalkulasi Usia, TMT Pensiun & Sisa Masa Kerja (`src/lib/retirement.ts`)
* **Default BUP (Batas Usia Pensiun):** `60` tahun (dapat di-*override* per pegawai: `58`, `60`, `65`, `70` untuk akomodasi jabatan khusus seperti Peneliti Ahli Utama atau Pelaksana).
* **Rumus TMT Pensiun (2 mode, dikonfigurasi di `app_settings`):**
  1. `FIRST_OF_NEXT_MONTH` **(Default — Standar BKN/ASN):** Tanggal **1 bulan berikutnya** setelah pegawai genap berusia `bupAge` tahun.
     * Contoh normal: Lahir `1967-06-29`, BUP `60` → Ulang tahun ke-60 pada `2027-06-29` → TMT Pensiun = **`2027-07-01`**.
     * **Edge case Desember (WAJIB DIUJI):** Lahir `1967-12-04`, BUP `60` → Ulang tahun ke-60 pada `2027-12-04` → TMT Pensiun = **`2028-01-01`** (bulan rollover ke Januari tahun berikutnya).
     * **Edge case tanggal 1:** Lahir `1972-05-01`, BUP `60` → Tetap jatuh pada **`2032-06-01`** (1 bulan setelah bulan lahir sesuai regulasi ASN).
  2. `EXACT_BIRTHDAY`: Tepat pada tanggal ulang tahun ke-`bupAge` (untuk tahun kabisat 29 Feb di tahun non-kabisat, gunakan 28 Feb atau 1 Mar secara konsisten).
* **Hitung Mundur Sisa Masa Kerja:** Hitung selisih dari tanggal acuan (`today`) ke `retirementDate` dalam format manusiawi yang akurat:
  * Jika sudah lewat: `"Lewat X thn Y bln"` (atau `"Lewat Y bln"`).
  * Jika belum: `"X thn Y bln"` (atau `"Y bln Z hr"` jika kurang dari 1 tahun).
* **Kategori Urgensi (berdasarkan sisa bulan menuju TMT):**
  * `sisaHari <= 0` → `OVERDUE` (*Lewat BUP / Perlu Cek*)
  * `sisaBulan <= 6` → `CRITICAL` (*≤ 6 Bulan*)
  * `sisaBulan <= 12` → `WARNING` (*6–12 Bulan*)
  * `sisaBulan <= 24` → `UPCOMING` (*1–2 Tahun*)
  * `sisaBulan > 24` → `SAFE` (*Aman*)

### 4.3 Aturan Impor File Excel Eksisting BRIDA (`src/lib/excel-importer.ts`)
Aplikasi **WAJIB** dapat mengimpor file berformat persis seperti `DATA PEGAWAI BRIDA DAN UPTB BRIDA.xlsx` tanpa mengharuskan admin mengubah struktur Excel secara manual terlebih dahulu.

**Fakta Struktur File Excel Asli yang Harus Ditangani Parser:**
1. **Multi-sheet:** Terdiri dari beberapa sheet unit kerja:
   * `'PNS BRIDA '` (perhatikan ada **trailing space** — wajib `.trim()` nama sheet!).
   * `'UPTB KRS BRIDA'`
   * `'UPTB STP BRIDA'`
2. **Blok Status Bertumpuk Vertikal di Tiap Sheet:** Setiap sheet berisi hingga 3 sub-tabel yang dipisahkan oleh baris kosong dan baris judul blok:
   * Blok 1: PNS (header judul mengandung `PNS`, misal `PNS BRIDA`, `PNS UPTB STP BRIDA`, `PNS UPTB KRS BRIDA`).
   * Blok 2: PPPK Penuh Waktu (header judul mengandung `P3K` / `PPPK` dan `PENUH`, termasuk tanpa spasi seperti `P3K PENUH WAKTUSEKRETARIAT DAN UMPEG BRIDA`).
   * Blok 3: PPPK Paruh Waktu (header judul mengandung `PARUH` atau typo **`PRUH`** seperti `P3K PRUH WAKTU KRS` — wajib tangani typo ini!).
3. **Kolom Data Hanya Kolom A–E (index `0..4`):**
   * Index `0`: `NO` (baris pegawai valid selalu memiliki angka numerik di kolom ini).
   * Index `1`: `NAMA`
   * Index `2`: `PANGKAT/GOL.RUANG`
   * Index `3`: `NIP` (**73+ baris mengandung `\xa0` non-breaking space** — wajib strip semua non-digit).
   * Index `4`: `NAMA JABATAN` (kapitalisasi tidak konsisten, misal `OPERATOR LAYANAN OPERASIONAL` vs `Operator Layanan Operasional` — sediakan normalisasi *Title Case* opsional dengan pengecualian singkatan seperti `UPTB`, `BRIDA`, `TU`, `TI`, `S.Kom`, `SP`).
4. **Abaikan Kolom F ke kanan (index `>= 5`):** Di file asli, kolom G–H berisi tabel rekap hitungan manual (`Total PNS`, dll.) yang tidak boleh ikut terimpor sebagai pegawai.
5. **Pratinjau & Upsert Aman:**
   * Saat file diunggah, parse terlebih dahulu dan tampilkan **Tabel Pratinjau Impor** berisi: jumlah total terdeteksi, rincian per unit & status, daftar NIP baru vs NIP yang sudah ada (*update*), serta baris error/invalid (jika ada).
   * Admin memilih mode `Skip Duplikat` atau `Perbarui Data NIP yang Sudah Ada`, lalu klik **Konfirmasi Impor**.

---

## 5. Skema Database (`src/db/schema.ts` — Drizzle ORM + PostgreSQL)

Definisikan tabel berikut secara rapi dengan relasi dan *index* untuk performa filter/sorting cepat:

```ts
// Enums
// employment_status: 'PNS' | 'PPPK_FULL' | 'PPPK_PART'
// gender: 'L' | 'P'
// retirement_process_status: 'BELUM' | 'BERKAS' | 'DIAJUKAN' | 'SELESAI'
// tmt_rule: 'FIRST_OF_NEXT_MONTH' | 'EXACT_BIRTHDAY'
```

1. **`units`**
   * `id`: `serial` PK
   * `code`: `varchar(32)` unique not null (contoh: `BRIDA`, `UPTB_KRS`, `UPTB_STP`)
   * `name`: `varchar(120)` not null (contoh: `BRIDA`, `UPTB Kebun Raya Sriwijaya`, `UPTB Science Techno Park`)
   * `sheetAlias`: `varchar(120)` (mapping otomatis dari nama sheet Excel)
   * `createdAt`: `timestamp` default now

2. **`employees`**
   * `id`: `serial` PK
   * `nip`: `varchar(18)` unique not null (index)
   * `fullName`: `varchar(180)` not null (index)
   * `birthDate`: `date` not null (index)
   * `gender`: `genderEnum` not null
   * `rankGrade`: `varchar(32)` not null (contoh: `IV/a`, `III/c`, `IX`)
   * `positionName`: `varchar(200)` not null
   * `employmentStatus`: `employmentStatusEnum` not null (index)
   * `unitId`: `integer` FK → `units.id` not null (index)
   * `bupAge`: `integer` not null default `60`
   * `retirementDate`: `date` not null (index — hasil kalkulasi TMT, di-recompute otomatis saat `birthDate`, `bupAge`, atau setting TMT berubah)
   * `isActive`: `boolean` not null default `true` (index — `false` jika sudah purna tugas/diarsipkan)
   * `processStatus`: `retirementProcessStatusEnum` not null default `'BELUM'`
   * `notes`: `text` (catatan berkas / alasan override BUP, misal "Peneliti Ahli Utama BUP 70")
   * `createdAt`: `timestamp` default now
   * `updatedAt`: `timestamp` default now

3. **`app_settings`**
   * `id`: `integer` PK (singleton row `id = 1`)
   * `institutionName`: `varchar(200)` default `'BADAN RISET DAN INOVASI DAERAH'`
   * `institutionSubname`: `varchar(200)` default `'PROVINSI SUMATERA SELATAN'`
   * `defaultBupAge`: `integer` not null default `60`
   * `tmtRule`: `tmtRuleEnum` not null default `'FIRST_OF_NEXT_MONTH'`
   * `criticalMonths`: `integer` not null default `6`
   * `warningMonths`: `integer` not null default `12`
   * `upcomingMonths`: `integer` not null default `24`
   * `updatedAt`: `timestamp` default now

---

## 6. Spesifikasi Halaman & Fitur Detail

### 6.1 Halaman Dasbor (`/`)
* **4 Kartu KPI Ringkas (border tipis, angka besar `tabular-nums`):**
  1. Total Pegawai Aktif (dengan sub-info: PNS / PPPK Penuh / PPPK Paruh)
  2. Lewat BUP & Kritis (`≤ 6 Bulan`) — klik langsung redirect ke `/monitoring?urgency=critical`
  3. Pensiun Dalam 1 Tahun (`≤ 12 Bulan`) — klik redirect ke `/monitoring?urgency=warning`
  4. Pensiun 1–2 Tahun (`12–24 Bulan`) — klik redirect ke `/monitoring?urgency=upcoming`
* **Grafik Proyeksi Pensiun (Bar Chart — Recharts):**
  * Jumlah pegawai yang akan pensiun per tahun untuk **10 tahun ke depan** (warna batang monokrom navy `#1E3A5F` & slate `#94A3B8`), bisa difilter per Unit Kerja.
* **Tabel Mini "Prioritas Terdekat" (Top 8):**
  * Menampilkan 8 pegawai paling cepat memasuki TMT pensiun beserta badge sisa waktu dan tombol cepat *"Lihat Detail"*.

### 6.2 Halaman Monitoring Pensiun (`/monitoring`) — **HALAMAN KERJA UTAMA**
* **Quick-Filter Tabs (di atas toolbar filter):**
  * `Semua Aktif (N)` | `Perlu Cek / Lewat BUP (N)` | `≤ 6 Bulan (N)` | `≤ 1 Tahun (N)` | `1–2 Tahun (N)` | `2–5 Tahun (N)`
* **Filter Bar Langsung Terlihat (tanpa disembunyikan di modal):**
  * **Search Input:** Cari real-time berdasarkan Nama, NIP (bisa ketik dengan/tanpa spasi), atau Nama Jabatan.
  * **Filter Unit Kerja:** Dropdown (`Semua Unit`, `BRIDA`, `UPTB KRS`, `UPTB STP`).
  * **Filter Status Pegawai:** Dropdown (`Semua Status`, `PNS`, `PPPK Penuh Waktu`, `PPPK Paruh Waktu`).
  * **Filter Tahun TMT Pensiun:** Dropdown dinamis berisi daftar tahun TMT yang ada di database (misal `2026`, `2027`, `2028`, dst.).
  * **Filter Status Pemberkasan:** Dropdown (`Semua`, `Belum Diproses`, `Pengumpulan Berkas`, `Diajukan`, `Selesai`).
  * **Tombol Reset Filter** (muncul saat ada filter aktif).
* **Tabel Interaktif (TanStack Table):**
  * **Kolom:** No, NIP (formatted monospace), Nama & Jabatan (2 baris rapi), Unit & Status (badge tipis), Golongan, Tgl Lahir & Usia Saat Ini (contoh: `29 Jun 1967` • `59 th 4 bln`), BUP (`60 th`), TMT Pensiun (`01 Jul 2027`), Sisa Masa Kerja (badge warna lembut), Status Berkas, Aksi.
  * **Sorting Dinamis:** Klik header kolom untuk sort `ASC/DESC` pada: TMT Pensiun (**default: tercepat naik**), Tanggal Lahir, Usia, Nama, Golongan, Unit Kerja.
  * **Pagination & Page Size:** Pilihan `15`, `25`, `50`, `100` baris per halaman + info total hasil terfilter (`Menampilkan 1–25 dari 138 pegawai`).
  * **Sticky Header:** Header tabel tetap terlihat saat scroll.
* **Action Bar Ekspor:**
  * Tombol **Ekspor Excel** dan **Cetak / PDF** langsung mengekspor **data sesuai filter & urutan yang sedang aktif**.
* **Slide-Over Drawer Detail Pegawai (shadcn `Sheet`):**
  * Terbuka saat klik baris pegawai tanpa me-reset posisi scroll atau filter tabel.
  * Menampilkan: profil lengkap, hasil parsing NIP, hitung mundur hari/bulan ke TMT, dropdown cepat ubah **Status Pemberkasan**, form cepat **Override BUP Khusus** (`58` / `60` / `65` / `70` + alasan), catatan admin, serta tombol *"Tandai Purna Tugas (Arsipkan)"*.

### 6.3 Halaman Data Pegawai (`/pegawai`)
* Tabel master seluruh pegawai dengan tab toggle `Pegawai Aktif` vs `Arsip Purna Tugas`.
* **Modal / Halaman Tambah & Edit Pegawai:**
  * Input NIP 18 digit dengan **auto-fill real-time**: begitu 18 digit valid selesai diketik/ditempel, otomatis mengisi field **Tanggal Lahir**, **Jenis Kelamin**, dan menampilkan pratinjau **TMT Pensiun (Usia 60)** secara langsung.
  * Validasi duplikat NIP dengan pesan error jelas berbahasa Indonesia.
  * Konfirmasi dialog sebelum menghapus atau mengarsipkan pegawai.

### 6.4 Halaman Impor & Laporan (`/impor-laporan`)
* **Tab 1 — Impor Data Excel:**
  * Dropzone upload `.xlsx` / `.xls` (mendukung langsung format multi-sheet BRIDA & UPTB).
  * Area **Pratinjau & Validasi** menampilkan ringkasan per sheet/status, baris valid, baris duplikat NIP, dan baris bermasalah sebelum benar-benar disimpan ke database.
  * Opsi: *Normalisasi huruf kapital jabatan* (checkbox) dan *Perbarui data jika NIP sudah ada* (checkbox).
* **Tab 2 — Pusat Laporan Siap Cetak:**
  * Preset laporan sekali klik:
    1. *Daftar Pegawai Pensiun Tahun Berjalan & Tahun Depan*
    2. *Daftar Nominatif Pensiun 5 Tahun Mendatang (Per Unit)*
    3. *Rekapitulasi Seluruh Pegawai Aktif Urut TMT Pensiun*
  * Halaman pratinjau cetak (`/laporan/cetak`) dengan tata letak formal A4 Landscape: Kop Instansi dari Pengaturan, judul laporan, tanggal cetak, tabel bergaris hitam tipis formal, dan blok tanda tangan Kepala Subbagian Umum & Kepegawaian di bawah.

### 6.5 Halaman Pengaturan (`/pengaturan`)
* Form pengaturan global:
  * Nama Instansi & Sub-nama (untuk sidebar & kop laporan cetak).
  * Usia Default BUP (default `60`).
  * Aturan Perhitungan TMT (`Tanggal 1 Bulan Berikutnya` vs `Tepat Tanggal Ulang Tahun`).
  * Ambang Batas Peringatan (Kritis: `6` bln, Siaga: `12` bln, Persiapan: `24` bln).
* Saat aturan TMT diubah, tampilkan konfirmasi dan **recalculate otomatis** kolom `retirement_date` untuk seluruh pegawai aktif agar selalu sinkron.

---

## 7. Struktur Direktori yang Disarankan

```text
src/
├── app/
│   ├── layout.tsx                  # Root layout + Font + AppShell (Sidebar & Header)
│   ├── page.tsx                    # Dasbor KPI & Grafik Proyeksi
│   ├── monitoring/
│   │   └── page.tsx                # Halaman utama Monitoring Pensiun
│   ├── pegawai/
│   │   └── page.tsx                # Master Data Pegawai & Arsip
│   ├── impor-laporan/
│   │   └── page.tsx                # Impor Excel BRIDA & Generator Laporan
│   ├── laporan/
│   │   └── cetak/page.tsx          # Layout Print/PDF A4 Landscape
│   ├── pengaturan/
│   │   └── page.tsx                # Pengaturan BUP, TMT, & Instansi
│   └── api/
│       ├── employees/route.ts      # GET (filter/sort/search), POST
│       ├── employees/[id]/route.ts # GET, PATCH, DELETE
│       ├── import/preview/route.ts # POST parse Excel & return preview
│       ├── import/commit/route.ts  # POST upsert batch ke PostgreSQL
│       ├── export/excel/route.ts   # GET generate .xlsx terfilter
│       └── settings/route.ts       # GET, PATCH (+ recalculation TMT)
├── components/
│   ├── ui/                         # shadcn/ui primitives
│   ├── layout/                     # Sidebar, Header, Breadcrumb
│   ├── dashboard/                  # KpiCards, ProjectionChart, WatchlistTable
│   ├── monitoring/                 # MonitoringTable, FilterBar, UrgencyTabs, EmployeeDrawer
│   ├── employees/                  # EmployeeFormDialog, NipInputPreview
│   └── import-export/              # ExcelDropzone, ImportPreviewTable, PrintReportView
├── db/
│   ├── index.ts                    # Drizzle client connection
│   ├── schema.ts                   # Schema PostgreSQL
│   └── seed.ts                     # Seed units + app_settings + opsional seed dari Excel
└── lib/
    ├── nip-parser.ts               # Parsing & formatting NIP 18 digit
    ├── retirement.ts               # Perhitungan usia, TMT, sisa masa kerja, urgensi
    ├── excel-importer.ts           # Multi-sheet BRIDA Excel parser & sanitizer
    ├── excel-exporter.ts           # Generator workbook .xlsx terfilter
    ├── formatters.ts               # Format tanggal Indonesia, Title Case jabatan
    └── __tests__/                  # Unit test Vitest untuk nip, retirement, excel-importer
```

---

## 8. Alur Kerja Git: Atomic Commit & Conventional Commit (WAJIB)

### 8.1 Aturan Keras Git
1. **Satu tahap = satu atomic commit yang utuh dan dapat di-build.** Jangan menggabungkan dua langkah dari roadmap ke dalam satu commit.
2. **Wajib lolos verifikasi sebelum commit:** Jalankan perintah verifikasi (minimal `pnpm typecheck` dan `pnpm lint`, ditambah `pnpm test` jika menyentuh domain logic) sebelum menjalankan `git commit`.
3. **Format Conventional Commit:**
   ```text
   <type>(<scope>): <imperative lowercase description without trailing period>
   ```
   * **Types yang diizinkan:** `chore`, `feat`, `fix`, `refactor`, `style`, `test`, `docs`.
   * **Scopes yang konsisten:** `init`, `ui`, `db`, `parser`, `importer`, `layout`, `monitoring`, `employees`, `dashboard`, `export`, `settings`, `docs`.

### 8.2 Roadmap Eksekusi Berurutan (Step-by-Step Atomic Commits)

Kerjakan urutan berikut satu per satu. Selesaikan verifikasi dan lakukan `git commit` sebelum melangkah ke nomor berikutnya.

#### Fase 1 — Fondasi Proyek & Tema Minimalis
1. **Inisialisasi proyek Next.js dengan `pnpm`**
   * Setup Next.js (App Router, TypeScript, Tailwind CSS, ESLint), tambahkan script `typecheck` (`tsc --noEmit`) di `package.json`, buat `.env.example`, dan konfigurasi Vitest.
   * Verifikasi: `pnpm typecheck && pnpm lint`
   * Commit: `chore(init): scaffold nextjs typescript app with pnpm and vitest`

2. **Setup `shadcn/ui` & token warna sederhana pemerintahan**
   * Install komponen inti (`button`, `input`, `select`, `table`, `badge`, `card`, `sheet`, `dialog`, `tabs`, `dropdown-menu`, `separator`, `checkbox`, `textarea`, `sonner`), atur palet warna minimalis (`slate-50`, `white`, muted navy `#1E3A5F`, border `slate-200`) di `globals.css`.
   * Verifikasi: `pnpm typecheck && pnpm lint`
   * Commit: `chore(ui): setup shadcn components and minimal gov slate-navy theme`

3. **Konfigurasi database Drizzle ORM & PostgreSQL**
   * Buat `drizzle.config.ts`, `src/db/index.ts`, `src/db/schema.ts` (`units`, `employees`, `app_settings`), serta `src/db/seed.ts` untuk unit default (`BRIDA`, `UPTB KRS BRIDA`, `UPTB STP BRIDA`) dan `app_settings` default (`BUP = 60`, `FIRST_OF_NEXT_MONTH`).
   * Verifikasi: `pnpm typecheck && pnpm lint`
   * Commit: `feat(db): define units, employees, and app_settings drizzle schema`

#### Fase 2 — Domain Logic & Unit Test
4. **Implementasi parser & formatter NIP 18 digit**
   * Buat `src/lib/nip-parser.ts` (sanitasi non-digit termasuk `\xa0`, validasi tanggal lahir, ekstraksi `birthDate`, `appointmentYm`, `gender`, dan formatter `YYYYMMDD YYYYMM G NNN`).
   * Verifikasi: `pnpm typecheck`
   * Commit: `feat(parser): add 18-digit nip parser, sanitizer, and bkn formatter`

5. **Implementasi kalkulator TMT pensiun, usia, sisa masa kerja & urgensi**
   * Buat `src/lib/retirement.ts` dan `src/lib/formatters.ts` (BUP default 60, rule `FIRST_OF_NEXT_MONTH` & `EXACT_BIRTHDAY`, penanganan rollover Desember, label hitung mundur Bahasa Indonesia, klasifikasi 5 level urgensi).
   * Verifikasi: `pnpm typecheck`
   * Commit: `feat(parser): implement age-60 tmt retirement and urgency calculator`

6. **Unit test domain logic (NIP & TMT)**
   * Buat `src/lib/__tests__/nip-parser.test.ts` dan `src/lib/__tests__/retirement.test.ts` yang mencakup: NIP dengan `\xa0`, NIP invalid, ulang tahun Desember rollover ke 1 Januari tahun berikutnya, ulang tahun tanggal 1, override BUP 58/65/70, serta batas kategori urgensi.
   * Verifikasi: `pnpm test && pnpm typecheck`
   * Commit: `test(parser): cover nip sanitization and tmt rollover edge cases`

7. **Implementasi parser Excel multi-sheet format BRIDA/UPTB**
   * Buat `src/lib/excel-importer.ts` yang membaca multi-sheet, trim nama sheet (`'PNS BRIDA '`), mendeteksi blok `PNS` / `PPPK Penuh Waktu` / `PPPK Paruh Waktu` (termasuk typo `'P3K PRUH WAKTU'`), mengabaikan kolom F ke kanan, sanitasi NIP, normalisasi jabatan opsional, beserta unit test-nya.
   * Verifikasi: `pnpm test && pnpm typecheck`
   * Commit: `feat(importer): add multi-sheet brida excel parser with block detection`

#### Fase 3 — Backend API Routes
8. **API CRUD Pegawai & Query Monitoring (Filter, Sort, Search, Pagination)**
   * Buat `src/app/api/employees/route.ts` dan `src/app/api/employees/[id]/route.ts` dengan validasi Zod, auto-compute `birthDate` & `retirementDate` dari NIP + BUP, serta dukungan query lengkap (`q`, `unitId`, `status`, `urgency`, `tmtYear`, `processStatus`, `isActive`, `sortBy`, `sortDir`, `page`, `pageSize`).
   * Verifikasi: `pnpm typecheck && pnpm lint`
   * Commit: `feat(employees): add employee crud and filtered monitoring api endpoints`

9. **API Impor Excel (Preview & Commit) dan Pengaturan Global**
   * Buat `src/app/api/import/preview/route.ts`, `src/app/api/import/commit/route.ts`, dan `src/app/api/settings/route.ts` (termasuk mekanisme *recalculate* `retirement_date` massal ketika aturan TMT/default BUP diubah).
   * Verifikasi: `pnpm typecheck && pnpm lint`
   * Commit: `feat(importer): add excel preview, batch upsert, and settings api`

10. **API Ekspor Excel Terfilter**
    * Buat `src/lib/excel-exporter.ts` dan `src/app/api/export/excel/route.ts` untuk menghasilkan file `.xlsx` rapi sesuai parameter filter & sort yang sedang aktif di tabel monitoring.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(export): add filtered retirement report excel export endpoint`

#### Fase 4 — Shell UI Pemerintahan & Halaman Inti
11. **Layout aplikasi: Fixed Sidebar, Header & Breadcrumb**
    * Buat `src/components/layout/app-shell.tsx`, sidebar 5 menu dengan gaya pemerintahan sederhana, responsif di mobile, dan header bar berisi breadcrumb dinamis.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(layout): build minimal gov-style sidebar navigation and header`

12. **Halaman Monitoring Pensiun — Tabel TanStack & Badge Urgensi**
    * Buat halaman `/monitoring` dengan `TanStack Table`, kolom NIP monospace berspasi, usia & TMT Indonesia, badge warna urgensi lembut, *sticky header*, sorting header kolom, dan pagination.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(monitoring): build retirement monitoring data table with sorting`

13. **Halaman Monitoring Pensiun — Quick Tabs & Multi-Criteria Filter Bar**
    * Tambahkan tab urgensi dengan counter real-time, input pencarian debounced (Nama/NIP/Jabatan), dropdown filter Unit, Status PNS/PPPK, Tahun TMT, Status Pemberkasan, tombol Reset, serta sinkronisasi URL search params agar filter tidak hilang saat refresh.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(monitoring): add urgency quick-tabs and multi-criteria filter bar`

14. **Slide-Over Detail Pegawai (Override BUP & Status Pemberkasan)**
    * Buat `EmployeeDrawer` (shadcn `Sheet`) saat baris diklik: detail profil, countdown sisa hari/bulan, update cepat status pemberkasan, override BUP (`58`/`60`/`65`/`70`), catatan admin, dan tombol arsipkan purna tugas.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(monitoring): add employee detail drawer with bup override and checklist`

15. **Halaman Master Data Pegawai & Form Auto-Parse NIP**
    * Buat halaman `/pegawai` (tab Aktif vs Arsip Purna Tugas) serta dialog Tambah/Edit pegawai yang otomatis mengisi Tanggal Lahir, Jenis Kelamin, dan pratinjau TMT Pensiun begitu 18 digit NIP diketik.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(employees): add employee master page and auto-fill nip form`

#### Fase 5 — Dasbor, Impor/Ekspor, Pengaturan & Dokumentasi
16. **Halaman Dasbor (`/`) — Kartu KPI, Grafik Proyeksi & Watchlist**
    * Implementasikan 4 kartu KPI yang dapat diklik, bar chart proyeksi pensiun 10 tahun ke depan (Recharts, warna monokrom sederhana) dengan filter unit, serta daftar 8 prioritas terdekat.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(dashboard): build retirement kpi cards, projection chart, and watchlist`

17. **Halaman Impor & Laporan (`/impor-laporan`) + Tampilan Cetak PDF Formal**
    * Implementasikan dropzone upload Excel dengan tabel pratinjau & validasi duplikat, tombol ekspor Excel terfilter, serta halaman `/laporan/cetak` berformat A4 Landscape dengan kop instansi resmi dan blok tanda tangan untuk cetak/Save as PDF.
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(export): add brida excel import wizard and printable official pdf report`

18. **Halaman Pengaturan (`/pengaturan`)**
    * Form konfigurasi nama instansi, default usia BUP (`60`), mode perhitungan TMT, dan ambang bulan peringatan dengan notifikasi toast sukses (`sonner`).
    * Verifikasi: `pnpm typecheck && pnpm lint`
    * Commit: `feat(settings): add global bup, tmt rule, and institution settings page`

19. **Dokumentasi & Script Utilitas Seed Excel**
    * Buat `README.md` ringkas berisi panduan setup lokal menggunakan `pnpm`, migrasi Drizzle, cara menjalankan tes, serta cara impor awal file `DATA PEGAWAI BRIDA DAN UPTB BRIDA.xlsx`.
    * Verifikasi: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
    * Commit: `docs(readme): add local pnpm setup, db migration, and excel import guide`

---

## 9. Guardrails & Definition of Done

* **Zero Hardcoded Dummy Data di Produksi:** Setelah DB siap, seluruh metrik dasbor, opsi filter tahun TMT, dan tabel harus berasal dari PostgreSQL. Sediakan *empty state* yang bersih beserta tombol pintas *"Impor File Excel BRIDA"* jika tabel `employees` masih kosong.
* **Responsif & Tanpa Horizontal Overflow Tak Terkontrol:** Tabel lebar wajib dibungkus kontainer `overflow-x-auto` agar sidebar dan halaman tidak pecah di layar laptop 14 inci (`1366×768` / `1440×900`).
* **Keamanan Input:** Sanitasi semua parameter query, validasi seluruh payload dengan `zod`, dan gunakan *parameterized queries* Drizzle (tanpa raw SQL string concatenation).
* **Build Bersih:** Proyek dianggap selesai hanya jika `pnpm test`, `pnpm typecheck`, `pnpm lint`, dan `pnpm build` seluruhnya lulus tanpa error.