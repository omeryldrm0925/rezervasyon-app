UI.md — Arayüz Yapısı
Tasarım Dili
Renk Paleti

Arka plan: Kömür (#2c2a28 veya #3a3636, CSS token --bg)
Kartlar/Canvas: Kırık beyaz (#f5f5f0)
Accent/Butonlar: Lime neon (#d6ff3f)
Accent hover: #c8f032
Accent soft: rgba(214,255,63,0.15)
Yazı (kömür üstünde): #f5f5f0
Yazı (kart içinde): #1a1a1a
Durum renkleri:

Rezerve: #d6ff3f (lime)
Geldi: #34d399 (emerald)
İptal: #f87171 (kırmızı)
Gelmedi: gri



Kart Yapısı

Canvas kartı: bg-#f5f5f0, rounded-[32px], shadow-2xl
Sidebar kartı: bg-#f5f5f0, rounded-[32px], shadow-2xl
Takvim kartı: bg-#f5f5f0, rounded-2xl
Kartlar kömür arka plan üstünde "yüzüyor" — aralarında boşluk

Tipografi

Font: Henüz değiştirilmedi, Plus Jakarta Sans veya DM Sans planlanıyor
Logo: "tablora" — "t" lime #d6ff3f + "ablora" beyaz #f5f5f0

Sayfa Yapısı
Landing Page (/)

Kömür arka plan
Navbar: transparan, scroll'da backdrop-blur
Hero: Büyük tipografi + CTA butonları (lime) + uygulama screenshot
Özellikler: Sticky scroll (masaüstü), dikey liste (mobil)
Fiyatlandırma, SSS, Demo formu
Mobil: Hamburger menü (bg-white shadow-lg rounded-xl dropdown)
Scroll animasyonları (Intersection Observer, fade-in + slide-up)

Auth (/login, /register)

Ortalanmış kart
Google ile giriş butonu + email/şifre formu
Kayıt: şifre doğrulama alanı mevcut

Onboarding Wizard

Tam ekran, 5 adım, progress bar
Adım 1: Restoran ismi
Adım 2: Salon seçimi (tıklanabilir kartlar + custom alan)
Adım 3: Çalışma saatleri (toggle + saat seçici)
Adım 4: Masa sayıları (şekil bazlı counter)
Adım 5: Özet + Tamamla
onboarding_completed flag ile kontrol

Dashboard (/app) — SparkSpin Referansı, Asimetrik
┌──────────────────────────────────────────────────────────┐
│ [tablora | Restoran]  [Profil]  [Arama]    [Düzenle ◉]   │
│ [Salon] Bahçe Teras +                                     │
│ [Bugün] [2 rez] [4 misafir]                               │
├────┬─────────────────────────────────────┬────────────────┤
│Sol │ [PP]                                │ Rezervasyonlar │
│menü│    ┌────────────────────────────────┤ (akordiyon)    │
│    │    │       Canvas                   │                │
│MASA│    │    (kırık beyaz kart)           │ + Yeni Rez     │
│    │    │                                │ Arama          │
│DEKO│    │                                │ Liste          │
│R   │    └────────────────────────────────┤                │
│    │ [Takvim - sol alt, w-1/2]           │                │
└────┴─────────────────────────────────────┴────────────────┘
Component'ler
Üst Bar (TopBar.tsx)

Sol: tablora logo (text veya img) + restoran adı + profil avatar (32px, baş harfi)
Orta: Arama barı (rounded-full, bg-#2a2a2a, border-#444)
Sağ: Düzenle toggle butonu (lime border + lime text)
Profil avatar tıklayınca dropdown: Profil Ayarları, Şifre Değiştir, Çıkış Yap

Sol Panel (SidePanel)

Dar ikon bar (w-14)
Masalar + Dekorasyon ikonları
Kömür arka plan üstünde, ikonlar beyaz/lime
Düzenleme modu kapalıyken gizli veya opacity düşük

Canvas (FloorCanvas.tsx)

Kırık beyaz kart, rounded-[32px]
Pan: basılı tut + sürükle ile gezinme (scroll kaldırıldı)
Zoom: +/- butonları
Masalar: beyaz/açık gri kartlar, sandalyelerle çevrili
Renk kodları: boş=beyaz, rezerve=lime soft, geldi=emerald soft
Seçili masa: ring-2 lime border
Düzenleme modu: dot grid görünür, handle'lar aktif
Normal mod: temiz görünüm, handle'lar gizli

Takvim

Canvas altında sol alt köşe, w-1/2
Kırık beyaz kart, rounded-2xl
Bugün butonu + DateStrip (gün butonları) + tarih input
Aktif gün: lime (#d6ff3f) text koyu
Pasif günler: bg-#2a2a2a text açık gri

Sağ Sidebar (ReservationSidebar.tsx)

Kırık beyaz kart, rounded-[32px]
Üstte: "Rezervasyonlar" başlığı + count badge (lime)
"+ Yeni Rezervasyon" butonu (lime, w-full)
Arama input'u
Rezervasyon kartları: akordiyon, tıklayınca detay
Her kart: saat (solda) + isim (sağda, bold) + kişi + masa + durum badge
Orphan rez: "Atanmış masa silinmiş" uyarısı + yeniden atama dropdown

Canvas Popup Form (TablePopup)

Masaya tıklayınca açılır (düzenleme modu kapalıyken)
Akıllı pozisyon: masanın altında/üstünde/yanında, viewport'a göre
Dar ve uzun format (max-w-xs)
Kaydet butonu lime, İptal text link
Durum dropdown'u mevcut (Rezerve/Geldi/Gelmedi/İptal)

Masa Görsel Tasarımı

Salon bazlı isim: A-1, B-1, C-1
Şekiller: kare, dikdörtgen, yuvarlak, bar (eliptik 4 kişi), loca
Yuvarlak masa shadow da rounded-full
Grup ismi masaların üstünde (z-index yüksek)
Birleştirme: otomatik "Grup 1", "Grup 2" isimlendirme

Fixture İkonları

Kapı: çeyrek daire ark + düz çizgi, amber renk
Bitki: yeşil dolgulu daire (emerald-600), üstten bakış
Seçili fixture: 4 köşede yuvarlak handle, 4 kenarda dikdörtgen handle
Rotate butonu: sol ortada, beyaz yuvarlak, ↻ ikonu

Stil Kuralları

Tailwind CSS + styles.css CSS token'ları
CSS token'ları: --bg, --surface, --accent, --accent-soft, --accent-text
base font-size: 14px (html)
Mevcut indigo referansları lime'a çevrildi
Responsive: Landing page mobil responsive, dashboard henüz değil