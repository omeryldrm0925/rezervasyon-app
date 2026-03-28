CLAUDE.md — Tablora

Her oturumun başında oku. Detay lazımsa docs/DB.md ve docs/UI.md'ye bak.

Proje
Tablora — restoran rezervasyon SaaS platformu. React + TypeScript + Vite + Tailwind CSS + Supabase.
Teknoloji

Vite + React 18 + TypeScript + Tailwind CSS
Supabase (Auth + PostgreSQL + RLS AKTİF)
Auth: Email/şifre + Google OAuth (prompt: select_account)
react-router-dom → "/" landing, "/login", "/register", "/app" dashboard
State: useReducer + custom hook (useRestaurantStore.ts) — Zustand DEĞİL
Deploy: Vercel (GitHub push → otomatik)

Marka & Tasarım

Logo: public/tablora-logo.png — lime "t" + beyaz "ablora"
Arka plan: Kömür (#2c2a28 veya #3a3636, CSS token --bg)
Kartlar: Kırık beyaz (#f5f5f0), rounded-3xl
Accent: Lime neon (#d6ff3f) — butonlar, aktif tab, badge
Durum: Rezerve=#d6ff3f, Geldi=#34d399, İptal=#f87171, Gelmedi=gri
Yazılar: Canvas içinde #1a1a1a, kömür üstünde #f5f5f0

Veritabanı

restaurants (id: UUID, owner_id, name, slug, working_hours JSONB, onboarding_completed BOOLEAN)
areas (id: TEXT, restaurant_id UUID, name, plan_data JSONB, sort_order)
layout_overrides (id: TEXT, area_id TEXT→areas.id, date_iso DATE, override_data JSONB, UNIQUE(area_id,date_iso))
reservations (id: TEXT, restaurant_id UUID, area_id TEXT, date_iso, owner_type, owner_id, table_ids JSONB, guest_name, phone, guest_count, time, notes, status)
demo_requests (id: UUID, name, email, restaurant_name, phone)
RLS TÜM TABLOLARDA AKTİF (owner-based policies)

Layout (SparkSpin referansı, asimetrik)

Üst bar: tablora logo + restoran adı + profil avatar + arama barı + düzenle toggle
Sol menü: dar ikon bar (masa, dekor)
Canvas: kırık beyaz floating kart, rounded-[32px]
Sağ sidebar: kırık beyaz floating kart, akordiyon rezervasyon listesi
Takvim: canvas altında sol alt, w-1/2
Profil foto: canvas sol üst köşe, yarısı taşar

Temel Kurallar

Türkçe UI metinleri
Hook'lar: TÜM hook'lar en üstte, early return'lerden ÖNCE
Supabase: upsert kullan (onConflict ile)
ID'ler uygulama üretir, UUID formatında DEĞİL (ör: "area-mmxllfxe-4")
loadAllFromSupabase: REPLACE, append değil
Salon bazlı masa isimlendirme: A-1, B-1, C-1
Proje sahibi yazılımcı değil, sade açıkla

Aktif Görevler

Profil foto canvas sol üst köşesine taşınacak + dropdown çalışacak
Takvim kartına DateStrip (gün butonları) eklenecek
Canvas-sidebar asimetrik spacing tamamlanacak
Font değişikliği (Plus Jakarta Sans veya DM Sans)
Arama barı fonksiyonu eklenecek

Kalan Buglar

Dekorasyon sola gitmiyor (duvar rotate sonrası)
Duvar resize problemi (en/boy ters)
Dropdown seçenekleri bazen kayboluyor

Yol Haritası

UI overhaul tamamla
Timeline/Diary görünümü (analiz gerekiyor)
Dashboard sayfası (istatistikler, grafikler)
Settings sayfası
Müşteri veritabanı
Mobil responsive
Abonelik + ödeme (iyzico)