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
| Routing | react-router-dom | "/" landing, "/login", "/register", "/app" dashboard |
| State yönetimi | useReducer + useRef (custom hook) | `useRestaurantStore.ts` — Zustand DEĞİL |
| Styling | Tailwind CSS | Utility-first, indigo brand renk |
| Backend | Supabase | Auth + PostgreSQL — ENTEGRE VE ÇALIŞIYOR |
| Deployment | Vercel | GitHub push → otomatik deploy |

---

## Mevcut Mimari

### Routing (react-router-dom)
- `/` → LandingPage (giriş yapmamış kullanıcılar)
- `/login` → LoginPage
- `/register` → RegisterPage
- `/app` → RestaurantApp (giriş yapmış kullanıcılar, ana dashboard)

### Auth Akışı
- `src/hooks/useAuth.ts` — Supabase auth state hook
- `src/features/auth/LoginPage.tsx` — Email + şifre ile giriş
- `src/features/auth/RegisterPage.tsx` — Email + şifre + restoran adı ile kayıt
- Çıkış yapınca localStorage temizlenir, state sıfırlanır
- `<RestaurantApp key={restaurantId}>` ile hesap değişiminde tam sıfırlama

### Veri Akışı (Store ↔ Supabase)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/api.ts` — Tüm Supabase CRUD fonksiyonları (upsert)
- `src/state/useRestaurantStore.ts` — Ana state yönetimi
- localStorage anlık yedek, 1 sn debounce ile Supabase'e sync
- `supabaseLoaded` flag true olana kadar loading gösterilir
- loadAllFromSupabase veriyi REPLACE eder, append etmez

### Dashboard Layout
- Üstte: TopBar (tarih seçici, günlük/varsayılan plan toggle)
- TopBar altı: Salon tab bar (animasyonlu geçiş, + ile yeni salon)
- Sol: Canvas (flex-1) — masa planı editörü
- Sağ: Sabit sidebar — rezervasyon paneli

### Günlük vs Varsayılan Plan
- Varsayılan plan = tüm günlerin temel şablonu
- Günlük override = belirli bir gün için özelleştirme
- Override varsa o gün tamamen override kontrolünde — varsayılan değişikliklerden ETKİLENMEZ
- Override yoksa varsayılan plan geçerli

---

## Klasör Yapısı

```
rezerve/
├── src/
│   ├── components/          # UI componentleri
│   ├── features/
│   │   ├── auth/            # LoginPage, RegisterPage
│   │   └── landing/         # LandingPage
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts
│   ├── state/
│   │   └── useRestaurantStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── layout.ts        # buildEffectiveTables
│   │   └── date.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.local
├── CLAUDE.md
└── vite.config.ts
```

---

## Veritabanı Şeması (Supabase / PostgreSQL)

> ⚠️ id sütunları TEXT tipinde (UUID değil). Uygulama kendi ID üretir.
> ⚠️ RLS TÜM TABLOLARDA KAPALI.
> ⚠️ areas ve reservations'da restaurant_id FK constraint yok.

### restaurants (id: UUID)
### areas (id: TEXT, restaurant_id: UUID, name: TEXT, plan_data: JSONB)
### layout_overrides (id: TEXT, area_id: TEXT→areas.id, date_iso: DATE, override_data: JSONB, UNIQUE(area_id,date_iso))
### reservations (id: TEXT, restaurant_id: UUID, area_id: TEXT→areas.id, date_iso: DATE, owner_type: TEXT, owner_id: TEXT, table_ids: JSONB, guest_name: TEXT, phone: TEXT, guest_count: INT, time: TIME, notes: TEXT, status: TEXT)
### demo_requests (id: UUID, name: TEXT, email: TEXT, restaurant_name: TEXT, phone: TEXT)

### TypeScript Tipleri (src/types/index.ts)
- `Table` → id, label, shape (square|rectangle|round|bar|booth), x, y, width, height, capacity
- `Fixture` → id, kind (door|window), x, y, width, height, rotation
- `Area` → id, name, defaultTables[], defaultFixtures[]
- `LayoutOverride` → dateISO, areaId, tablePatches, addedTables, removedTableIds, mergedGroups, fixturePatches, addedFixtures, removedFixtureIds
- `MergedTableGroup` → id, name, tableIds[], x?, y?, width?, height?
- `Reservation` → id, dateISO, areaId, ownerType (table|group), ownerId, tableIds[], guestName, phone, guestCount, time, notes, status (reserved|arrived|cancelled|no_show)

---

## Yapılacaklar

### 🔧 Acil
- [ ] Günlük vs varsayılan plan UI farklılaştırması
- [ ] RLS politikalarını yeniden yaz ve aç

### 📋 Faz 1 Kalan
- [ ] Özet bar + boş canvas onboarding
- [ ] Haftalık takvim görünümü
- [ ] Çakışma kontrolü
- [ ] Mobil responsive

### 📋 Faz 1c — Ödeme
- [ ] Abonelik planları + iyzico/Stripe

### 🔮 Faz 2
- [ ] Müşteri platformu + kapora sistemi

---

## Notlar

- Proje sahibi yazılımcı değil, vibe coding yapıyor. Sade açıkla.
- Türkçe UI metinleri kullan.
- State: useReducer + custom hook, Zustand DEĞİL.
- Supabase: upsert kullan (onConflict ile).
- ID'ler uygulama üretir, UUID formatında DEĞİL.
- Hook kuralları: TÜM hook'lar en üstte, early return'lerden ÖNCE.
- loadAllFromSupabase: REPLACE, append değil.
- Salon oluşturma: supabaseLoaded true olduktan SONRA areas.length kontrol et.
