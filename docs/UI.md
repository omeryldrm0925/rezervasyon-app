# UI.md — Arayüz Yapısı

## Sayfa Yapısı

### Landing Page (/)
- Navbar (sticky): Logo + Özellikler/Fiyatlandırma/SSS scroll linkleri + Giriş Yap + Demo Talep Et
- Hero: Başlık + CTA butonları + uygulama mockup
- Özellikler: 4 feature card
- Fiyatlandırma: 3 plan kartı (Ücretsiz/Profesyonel/İşletme)
- SSS: Accordion
- Demo Formu: İsim, email, restoran adı → demo_requests tablosuna kayıt
- Footer

### Auth (/login, /register)
- Ortalanmış kart, temiz form, hata mesajları
- Kayıt sonrası mail doğrulama

### Dashboard (/app)
```
┌─────────────────────────────────────────────────┐
│ TopBar (tarih seçici + düzenleme modu)          │
├─────────────────────────────────────────────────┤
│ Salon Tab Bar (+ ile yeni salon)                │
├──────┬──────────────────────────┬───────────────┤
│ Sol  │                          │ Sağ Sidebar   │
│Panel │      Canvas              │ Rezervasyonlar│
│Masa/ │   (sürükle-bırak)       │ Arama + Liste │
│Dekor │                          │ + Yeni Rez    │
│      │                          │               │
└──────┴──────────────────────────┴───────────────┘
```

## Component'ler

### Sol Panel (Canva tarzı)
- Masalar: Dikdörtgen, Kare, Yuvarlak, Bar, Loca
- Dekorasyon: Kapı, Pencere, Bar Tezgahı, Ağaç, Havuz, Kolon, Kasa, Tuvalet, Merdiven, Duvar
- Daraltılabilir (chevron butonu)
- Düzenleme modu kapalıyken opacity-50

### Canvas (FloorCanvas.tsx)
- Dot grid arka plan
- Masalar: beyaz/açık gri, sandalyelerle çevrili, renk kodlu (boş/rezerve/geldi/kapasite aşımı)
- Zoom: +/- butonları, Sığdır, Sıfırla
- Scroll: overflow auto

### Masa Görsel Tasarımı
- Boş: bg-white, border-gray-200, sandalyeler gray-300
- Rezerve: bg-indigo-50, border-indigo-300
- Geldi: bg-emerald-50, border-emerald-400
- Kapasite aşımı: kırmızı badge
- Kısmen dolu: dolu sandalye filled, boş sandalye outline
- Hover: shadow-md, scale(1.02)
- Seçili: ring-2 ring-indigo-500

### Sağ Sidebar (Rezervasyonlar)
- Tarih + rezervasyon sayısı badge
- "+ Yeni Rezervasyon" butonu → sidebar içi form
- Arama input'u
- Rezervasyon kartları: saat, misafir, kişi, masa, durum badge
- Expand: düzenleme formu, durum değiştir, sil

### Salon Tab Bar
- Yatay tablar, aktif tab indigo alt çizgi
- "+" ile yeni salon, "⋯" menüsü ile yeniden adlandır/sil

## Düzenleme Modu
- "Düzenle" butonu → "Bugün için" / "Genel Düzen" seçenekleri
- Genel Düzen: onay dialogu, blueprint arka plan, amber info bar
- Günlük override: indigo info bar + sıfırlama butonu
- Klavye: Ctrl+Z/C/V/X, Delete, Escape

## Stil Kuralları
- Tailwind CSS, ayrı CSS dosyası yazma
- Brand: indigo/violet ana renk, emerald accent
- Font: Tailwind varsayılan sans, başlıklar font-bold/extrabold
- Responsive: henüz yapılmadı, mobilde sidebar ekranı eziyor
