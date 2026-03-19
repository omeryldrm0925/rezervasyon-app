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
| State yönetimi | useReducer + useRef (custom hook) | `useRestaurantStore.ts` — Zustand DEĞİL |
| Styling | Tailwind CSS | Utility-first |
| Backend | Supabase | Auth + PostgreSQL — ENTEGRE VE ÇALIŞIYOR |
| Deployment | Vercel | GitHub push → otomatik deploy |
| Ödeme | iyzico veya Stripe | Faz 1c'de eklenecek |

---

## Mevcut Mimari

### Auth Akışı
- `src/hooks/useAuth.ts` — Supabase auth state hook (user, loading, signIn, signOut, signUp)
- `src/features/auth/LoginPage.tsx` — Email + şifre ile giriş
- `src/features/auth/RegisterPage.tsx` — Email + şifre + restoran adı ile kayıt
- Kayıt olunca `restaurants` tablosuna otomatik satır eklenir
- `App.tsx` auth gate: giriş yapmamışsa → LoginPage, yapmışsa → RestaurantApp

### Veri Akışı (Store ↔ Supabase)
- `src/lib/supabase.ts` — Supabase client (createClient ile bağlantı)
- `src/lib/api.ts` — Tüm Supabase CRUD fonksiyonları
- `src/state/useRestaurantStore.ts` — Ana state yönetimi
- Veri localStorage'a anlık yazılır (yedek), 1 sn debounce ile Supabase'e sync edilir
- Sayfa yüklenince veri Supabase'den okunur, localStorage fallback
- `isLoadingFromSupabaseRef` flag'i ile yükleme sırasında sync tetiklenmez

### API Fonksiyonları (src/lib/api.ts)
- `getRestaurantForUser(userId)` → kullanıcının restoranını getirir
- `createRestaurant(userId, name, slug)` → yeni restoran oluşturur
- `setRestaurantId(id)` / `currentRestaurantId` → aktif restoran ID'si
- `syncAreas(areas)` → areas tablosuna upsert (onConflict: "id")
- `syncOverrides(overrides)` → layout_overrides tablosuna upsert (onConflict: "area_id,date_iso")
- `syncReservations(reservations)` → reservations tablosuna upsert (onConflict: "id")
- `loadAllFromSupabase()` → tüm veriyi çeker

---

## Klasör Yapısı (Gerçek)

```
rezerve/
├── src/
│   ├── components/          # UI componentleri
│   │   ├── DayReservationsCard.tsx
│   │   ├── FloorCanvas.tsx       # Ana canvas (sürükle-bırak)
│   │   ├── FloatingPalette.tsx   # Masa ekleme araçları
│   │   ├── GroupEditorCard.tsx
│   │   ├── ObjectEditorCard.tsx
│   │   ├── ReservationCard.tsx
│   │   ├── TableActionMenu.tsx
│   │   └── TopBar.tsx
│   ├── features/
│   │   └── auth/
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   ├── hooks/
│   │   └── useAuth.ts            # Supabase auth hook
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   └── api.ts                # CRUD fonksiyonları
│   ├── state/
│   │   └── useRestaurantStore.ts # Ana state (useReducer)
│   ├── types/
│   │   └── index.ts              # Tüm TypeScript tipleri
│   ├── data/
│   │   └── mockData.ts           # Mock veriler (fallback)
│   ├── utils/
│   │   ├── layout.ts
│   │   └── date.ts
│   ├── App.tsx                   # Auth gate + RestaurantApp
│   └── main.tsx
├── .env.local                    # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── CLAUDE.md
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Veritabanı Şeması (Supabase / PostgreSQL)

> ⚠️ ÖNEMLİ: areas, layout_overrides ve reservations tablolarında id sütunları TEXT tipindedir (UUID değil). Çünkü uygulama kendi ID'lerini üretir ("area-mmxllfxe-4", "table-abc123" gibi).
> ⚠️ RLS şu an TÜM TABLOLARDA KAPALI. Auth stabilize olunca açılacak.
> ⚠️ areas ve reservations tablolarında restaurant_id FK constraint kaldırılmış durumda.

### restaurants
```sql
CREATE TABLE restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),  -- nullable
  name TEXT, slug TEXT UNIQUE, phone TEXT, address TEXT,
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### areas (id: TEXT, restaurant_id: UUID)
```sql
CREATE TABLE areas (
  id TEXT PRIMARY KEY,                    -- uygulama kendi ID üretir
  restaurant_id UUID,                     -- FK kaldırıldı, sadece değer
  name TEXT DEFAULT 'Ana Salon',
  plan_data JSONB DEFAULT '{"defaultTables": [], "defaultFixtures": []}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### layout_overrides (id: TEXT, area_id: TEXT)
```sql
CREATE TABLE layout_overrides (
  id TEXT PRIMARY KEY,
  area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  override_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(area_id, date_iso)
);
```

### reservations (id: TEXT, area_id: TEXT)
```sql
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  restaurant_id UUID,                     -- FK kaldırıldı, sadece değer
  area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
  date_iso DATE NOT NULL,
  owner_type TEXT DEFAULT 'table',
  owner_id TEXT NOT NULL,
  table_ids JSONB DEFAULT '[]',
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  time TIME NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'reserved',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### TypeScript Tipleri (src/types/index.ts)
Store'daki ana tipler:
- `Table` → id, label, shape, x, y, width, height, capacity
- `Fixture` → id, kind (door|window), x, y, width, height, rotation
- `Area` → id, name, defaultTables[], defaultFixtures[]
- `LayoutOverride` → dateISO, areaId, tablePatches, addedTables, removedTableIds, mergedGroups, fixturePatches, addedFixtures, removedFixtureIds
- `MergedTableGroup` → id, name, tableIds[], x?, y?, width?, height?
- `Reservation` → id, dateISO, areaId, ownerType, ownerId, tableIds[], guestName, phone, guestCount, time, notes, status

---

## Bilinen Hatalar / Teknik Borç

1. **Maximum update depth exceeded** — FloorCanvas.tsx ve App.tsx'te sonsuz döngü uyarısı. `onCanvasViewportChange` her render'da yeni referans alıyor. useCallback ile sarılmalı.
2. **Hesap değişiminde state sıfırlanmıyor** — Çıkış yapıp başka hesaba girince eski state kalabiliyor. Auth değişiminde localStorage temizlenmeli ve state sıfırlanmalı.
3. **Çıkış butonu** — Görünürlüğü ve erişilebilirliği kontrol edilmeli.
4. **RLS kapalı** — Tüm tablolarda RLS devre dışı. Auth stabilize olunca açılacak ve politikalar yeniden yazılacak.
5. **FK constraint'ler kaldırılmış** — areas.restaurant_id ve reservations.restaurant_id için FK yok. Veri bütünlüğü uygulama tarafında sağlanıyor.

---

## Mevcut Durum ve Yapılacaklar

### ✅ Tamamlanan
- React + Vite + TypeScript frontend çalışıyor
- Masa planı editörü (sürükle-bırak, çoklu şekil, birleştirme)
- Rezervasyon CRUD (oluştur, düzenle, sil)
- Günlük plan override sistemi (varsayılan plan + günlük değişiklikler)
- Fixture desteği (kapı, pencere)
- Supabase entegrasyonu (veri yazma + okuma çalışıyor)
- Auth sistemi (email + şifre ile kayıt/giriş)
- Kayıt sırasında otomatik restoran oluşturma
- Vercel'de deploy çalışıyor

### 🔧 Acil Düzeltmeler
- [ ] Maximum update depth hatası (FloorCanvas + App.tsx)
- [ ] Hesap değişiminde state sıfırlama
- [ ] Çıkış butonunu düzelt
- [ ] Debug console.log'ları temizle

### 📋 Faz 1a — Restoran Paneli
- [ ] Dashboard ana sayfa (bugünün özeti)
- [ ] Birden fazla salon desteği düzgün çalışsın
- [ ] Masa düzenleme UX iyileştirmesi

### 📋 Faz 1b — Rezervasyon Motoru
- [ ] Takvim görünümü (haftalık)
- [ ] Çakışma kontrolü (aynı masa, aynı saat)
- [ ] Müşteri arama iyileştirmesi

### 📋 Faz 1c — Abonelik & Ödeme
- [ ] Abonelik planları sayfası
- [ ] iyzico / Stripe entegrasyonu

### 📋 Faz 1d — Pazarlama
- [ ] Landing page
- [ ] Kayıt akışı

### 🔮 Faz 2 — Müşteri Platformu
- [ ] Restoran keşif
- [ ] Müşteri masa seçimi
- [ ] Kapora sistemi

---

## Ortam Değişkenleri (.env.local)

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

⚠️ .gitignore'da olmalı!

---

## Deploy Akışı

1. VS Code'da kod yaz
2. Terminalde sırayla: `git add .` → `git commit -m "açıklama"` → `git push`
3. Vercel otomatik deploy eder
4. Canlı site: https://rezervasyon-app.vercel.app/

---

## Notlar

- Proje sahibi yazılımcı değil, vibe coding yapıyor. Kod açıklamalarını sade tut.
- Her değişiklikte neyin neden yapıldığını kısaca açıkla.
- Hata durumunda çözümü adım adım ver, tek seferde büyük değişiklik yapma.
- Türkçe UI metinleri kullan (buton, etiket, hata mesajları).
- State yönetimi useReducer + custom hook ile yapılıyor, Zustand DEĞİL.
- Supabase'e veri yazarken upsert kullan (onConflict ile).
- ID'ler uygulama tarafında üretilir, UUID formatında DEĞİL (ör: "area-mmxllfxe-4").
