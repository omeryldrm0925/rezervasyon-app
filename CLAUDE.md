# CLAUDE.md — Rezerve

> Her oturumun başında oku. Detay lazımsa ilgili docs/ dosyasını oku.

## Proje
Rezerve — restoran rezervasyon SaaS platformu. Masa planı editörü + rezervasyon yönetimi.

## Teknoloji
- Vite + React 18 + TypeScript + Tailwind CSS
- Supabase (Auth + PostgreSQL) — entegre ve çalışıyor
- react-router-dom → "/" landing, "/login", "/register", "/app" dashboard
- State: useReducer + custom hook (`useRestaurantStore.ts`) — Zustand DEĞİL
- Deploy: Vercel (GitHub push → otomatik)

## Temel Kurallar
- Türkçe UI metinleri
- Hook'lar: TÜM hook'lar en üstte, early return'lerden ÖNCE
- Supabase: upsert kullan (onConflict ile)
- ID'ler uygulama üretir, UUID formatında DEĞİL (ör: "area-mmxllfxe-4")
- loadAllFromSupabase: REPLACE, append değil
- Proje sahibi yazılımcı değil, sade açıkla

## Detaylı Dokümantasyon
- `docs/DB.md` → Veritabanı şeması, tablo yapıları, tipler
- `docs/UI.md` → Component yapısı, layout, stil kuralları
- `docs/CURRENT-TASK.md` → Aktif görevler, bilinen buglar, yapılacaklar
