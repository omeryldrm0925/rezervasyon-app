# CLAUDE.md — Rezerve (Restoran Rezervasyon Platformu)

> Bu dosyayı her oturumun başında oku. Projenin tüm bağlamı burada.

---

## Proje Nedir?

Rezerve, restoranların rezervasyon süreçlerini dijitalleştiren bir SaaS platformudur.

**Faz 1 (ŞU AN):** Restoranlar platforma abone olur → Canva benzeri sürükle-bırak editörle masa planı oluşturur → Günlük rezervasyonları yönetir.

**Faz 2 (GELECEK):** Müşteriler platformda restoran keşfeder → Masayı kendileri seçer → Kapora öder → Kapora yemek hesabından düşülür.

---

## Teknoloji Yığını

| Katman | Teknoloji | Not |
|--------|-----------|-----|
| Build aracı | Vite | Geliştirme sunucusu + production build |
| Frontend | React 18 + TypeScript | Component bazlı, TSX dosyaları |
| State yönetimi | Zustand (`useRestaurantStore`) | Merkezi store, zaten mevcut |
| Styling | Tailwind CSS | Utility-first |
| Backend | Supabase (EKLENİYOR) | Auth + PostgreSQL + Realtime + Storage |
| Deployment | Vercel | GitHub push → otomatik deploy |
| Ödeme | iyzico veya Stripe | Faz 1c'de eklenecek |

### Mevcut Durum
Frontend tamamen çalışıyor: React + TypeScript + Vite + Zustand. Eksik olan **backend** — şu an veri kalıcı değil, tarayıcıda kalıyor. Sıradaki adım Supabase entegrasyonu.

---

## Klasör Yapısı

```
rezerve/
├── public/                  # Statik dosyalar (favicon, logo vs.)
├── src/
│   ├── components/          # Paylaşılan UI componentleri
│   │   ├── ui/              # Button, Input, Modal, Card vs.
│   │   └── layout/          # Navbar, Sidebar, Footer
│   ├── features/            # Özellik bazlı modüller
│   │   ├── auth/            # Giriş, kayıt, şifre sıfırlama
│   │   ├── dashboard/       # Restoran ana panel
│   │   ├── floor-plan/      # Masa planı editörü (sürükle-bırak)
│   │   ├── reservations/    # Rezervasyon CRUD + takvim
│   │   └── settings/        # Restoran ayarları, profil
│   ├── lib/                 # Yardımcı fonksiyonlar
│   │   ├── supabase.ts      # Supabase client ve helpers
│   │   └── utils.ts         # Genel utility fonksiyonlar
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript tip tanımları
│   │   └── database.ts      # Supabase tablo tipleri
│   ├── styles/              # Global stiller
│   ├── App.tsx              # Ana routing
│   └── main.tsx             # Entry point
├── supabase/                # Supabase migration dosyaları
│   └── migrations/
├── .env.local               # Supabase URL ve anon key (GIT'E EKLEME!)
├── CLAUDE.md                # ← Bu dosya
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Veritabanı Şeması (Supabase / PostgreSQL)

> Tablolar uygulamadaki TypeScript tiplerini (src/types/index.ts) yansıtır.
> Plan verisi (masalar, fixture'lar, override'lar) JSONB olarak saklanır.

### restaurants
```sql
-- Restoran bilgileri ve abonelik durumu
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  name TEXT, slug TEXT UNIQUE, phone TEXT, address TEXT,
  subscription_plan TEXT DEFAULT 'free',  -- free | basic | premium
  subscription_status TEXT DEFAULT 'active'
);
```

### areas (= Senin koddaki Area tipi)
```sql
-- Her area = bir salon. plan_data içinde defaultTables + defaultFixtures var.
CREATE TABLE areas (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name TEXT DEFAULT 'Ana Salon',
  plan_data JSONB DEFAULT '{"defaultTables": [], "defaultFixtures": []}',
  sort_order INTEGER DEFAULT 0
);
-- plan_data yapısı: { defaultTables: Table[], defaultFixtures: Fixture[] }
```

### layout_overrides (= Senin koddaki LayoutOverride tipi)
```sql
-- Günlük plan değişiklikleri. Bir area + bir gün = tek override.
CREATE TABLE layout_overrides (
  id UUID PRIMARY KEY,
  area_id UUID REFERENCES areas(id),
  date_iso DATE NOT NULL,
  override_data JSONB DEFAULT '{}',
  UNIQUE(area_id, date_iso)
);
-- override_data yapısı: { tablePatches, addedTables, removedTableIds, mergedGroups, fixturePatches, addedFixtures, removedFixtureIds }
```

### reservations (= Senin koddaki Reservation tipi)
```sql
-- Rezervasyonlar. owner_type: 'table' | 'group', table_ids: JSON array.
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  area_id UUID REFERENCES areas(id),
  date_iso DATE NOT NULL,
  owner_type TEXT DEFAULT 'table',
  owner_id TEXT NOT NULL,
  table_ids JSONB DEFAULT '[]',
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  time TIME NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'reserved'  -- reserved | arrived | cancelled | no_show
);
```

### Veri Akışı (Store ↔ Supabase)
- `state.areas[]` → areas tablosu (her area bir satır, plan_data = {defaultTables, defaultFixtures})
- `state.overrides[dateISO][areaId]` → layout_overrides tablosu (override_data = LayoutOverride objesi)
- `state.reservations[]` → reservations tablosu (birebir eşleşir)

### Row Level Security (RLS)
Her tabloda RLS aktif. Kural: Restoran sahibi sadece kendi verilerini görsün.

```sql
-- Örnek: restaurants tablosu
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restoran sahibi kendi restoranını görür"
  ON restaurants FOR ALL
  USING (owner_id = auth.uid());
```

---

## Kodlama Kuralları

### Genel
- **Dil:** Kod ve değişken isimleri İngilizce, yorumlar Türkçe olabilir
- **Component yapısı:** Her feature kendi klasöründe, index.tsx ile dışa açılır
- **State yönetimi:** Basit state → useState/useContext. Karmaşıklaşırsa Zustand
- **Formlar:** React Hook Form + zod validation
- **API çağrıları:** Supabase client direkt kullan, ayrı API katmanı şimdilik gereksiz

### Stil Kuralları
- Sadece Tailwind CSS kullan, inline style veya ayrı CSS dosyası yazma
- Renk paleti: Tailwind'in varsayılanları + custom brand renkleri (tailwind.config.ts'de tanımlı)
- Responsive: Mobile-first yaklaşım (sm → md → lg)
- Dark mode: Şimdilik yok, Faz 1 tamamlandıktan sonra düşünülecek

### TypeScript
- `any` kullanma, her zaman tip tanımla
- Supabase tipleri `src/types/database.ts` içinde olsun
- Props interface'lerini component dosyasının başında tanımla

### Dosya İsimlendirme
- Component dosyaları: PascalCase → `FloorPlanEditor.tsx`
- Hook dosyaları: camelCase → `useReservations.ts`
- Utility dosyaları: camelCase → `formatDate.ts`
- Tip dosyaları: camelCase → `database.ts`

---

## Mevcut Durum ve Yapılacaklar

### ✅ Tamamlanan (Mevcut React Frontend)
- React + Vite + TypeScript projesi kurulu ve çalışıyor
- Zustand ile state yönetimi (`useRestaurantStore`)
- Masa planı editörü (sürükle-bırak, masaları yerleştirme)
- Temel rezervasyon oluşturma formu (ReservationCard)
- Gün bazlı rezervasyon listesi (DayReservationsCard)
- Nesne ve grup editörleri (ObjectEditorCard, GroupEditorCard)
- Floating palette (masa ekleme araçları)
- Takvim görünümü (günlük tarih seçimi, TopBar)
- Zoom kontrolleri
- Vercel'de deploy çalışıyor

### 🔄 Faz 0 — Supabase Entegrasyonu (ŞİMDİ)
- [ ] Supabase projesi oluştur
- [ ] Veritabanı tablolarını kur (yukarıdaki şema)
- [ ] RLS politikalarını yaz
- [ ] `src/lib/supabase.ts` — Supabase client kur
- [ ] Supabase Auth entegrasyonu (email + Google)
- [ ] Mevcut Zustand store'u Supabase'e bağla (veri kalıcılığı)
- [ ] Masa planı verilerini Supabase'e kaydet/yükle

### 📋 Faz 1a — Restoran Paneli
- [ ] Dashboard ana sayfa (bugünün özeti)
- [ ] Masa planı kaydetme / yükleme (Supabase'e)
- [ ] Birden fazla salon desteği (Ana Salon, Bahçe, Teras)
- [ ] Masa düzenleme (kapasite, isim, aktif/pasif)

### 📋 Faz 1b — Rezervasyon Motoru
- [ ] Rezervasyon CRUD (oluştur, düzenle, iptal)
- [ ] Takvim görünümü (günlük + haftalık)
- [ ] Masa bazlı rezervasyon (hangi masa müsait?)
- [ ] Müşteri arama (isim/telefon)
- [ ] Durum yönetimi (onaylandı → oturdu → tamamlandı)
- [ ] Çakışma kontrolü (aynı masa, aynı saat)

### 📋 Faz 1c — Abonelik & Ödeme
- [ ] Abonelik planları sayfası
- [ ] iyzico / Stripe entegrasyonu
- [ ] Plan kısıtlamaları (free: 10 masa, basic: 30, premium: sınırsız)

### 📋 Faz 1d — Pazarlama
- [ ] Landing page (restoranlar için)
- [ ] Kayıt akışı (restoran bilgilerini gir → plan seç → başla)

### 🔮 Faz 2 — Müşteri Platformu (Gelecek)
- [ ] Restoran listeleme ve keşif
- [ ] Müşterinin masa seçmesi (canlı plan görünümü)
- [ ] Kapora ödeme sistemi
- [ ] Kaporanın yemek hesabından düşülmesi

---

## Ortam Değişkenleri (.env.local)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

⚠️ Bu dosya .gitignore'da olmalı, asla GitHub'a pushlanmamalı!

---

## Deploy Akışı

1. VS Code'da kod yaz
2. `git add . && git commit -m "açıklama" && git push`
3. Vercel otomatik build eder ve deploy eder
4. Canlı site: https://rezervasyon-app.vercel.app/

---

## Notlar

- Proje sahibi yazılımcı değil, vibe coding yapıyor. Kod açıklamalarını sade tut.
- Her değişiklikte neyin neden yapıldığını kısaca açıkla.
- Hata durumunda çözümü adım adım ver, tek seferde büyük değişiklik yapma.
- Türkçe UI metinleri kullan (buton, etiket, hata mesajları).
- Supabase Dashboard linki: https://supabase.com/dashboard
