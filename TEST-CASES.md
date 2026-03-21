# TEST-CASES.md — Rezerve Test Senaryoları

> Her test case'i sırayla koş. Sonucu ✅ (geçti) veya ❌ (hata) olarak işaretle.
> Hata varsa kısaca ne olduğunu yaz.

---

## 1. AUTH — Kayıt ve Giriş

### T1.1 — Yeni kullanıcı kaydı
1. Tarayıcıda `localStorage.clear()` yap, sayfayı yenile
2. Landing page geldi mi?
3. "Ücretsiz Başla" butonuna tıkla → Kayıt sayfasına gidiyor mu?
4. Restoran adı + email + şifre gir, "Kayıt Ol" tıkla
5. "Doğrulama e-postası gönderildi" mesajı çıkıyor mu?
6. E-postadaki linke tıkla → doğrulama başarılı mı?
7. Giriş sayfasına dön, email + şifre ile giriş yap
8. Dashboard (boş "Ana Salon") açılıyor mu?

Sonuç: ___

### T1.2 — Mevcut kullanıcı girişi
1. Giriş sayfasına git (/login)
2. Kayıtlı email + şifre gir → Dashboard açılıyor mu?
3. Daha önce oluşturduğun masalar/salonlar görünüyor mu?

Sonuç: ___

### T1.3 — Çıkış ve tekrar giriş
1. "Çıkış Yap" butonuna tıkla
2. Landing page veya login sayfasına dönüyor mu?
3. Tekrar giriş yap → verin sağlam mı, eski state karışmıyor mu?

Sonuç: ___

### T1.4 — Yanlış şifre
1. Giriş sayfasında yanlış şifre gir
2. Hata mesajı gösteriliyor mu?
3. Sayfa crash olmuyor mu?

Sonuç: ___

### T1.5 — Zaten kayıtlı email ile kayıt
1. Kayıt sayfasında zaten kayıtlı bir email ile kayıt olmayı dene
2. Anlamlı hata mesajı gösteriliyor mu? (crash değil)

Sonuç: ___

---

## 2. SALON YÖNETİMİ

### T2.1 — Yeni salon ekleme
1. Tab bar'daki "+" butonuna tıkla
2. Salon adı gir, Enter'a bas
3. Yeni tab oluşuyor mu?
4. Yeni salonun canvas'ı boş mu?
5. Sayfayı yenile — yeni salon hâlâ duruyor mu? (Supabase'e kaydedildi mi?)

Sonuç: ___

### T2.2 — Salon adı değiştirme
1. Bir salon tab'ındaki "⋯" menüsüne tıkla
2. "Yeniden Adlandır" seçeneği çıkıyor mu?
3. Yeni isim gir → tab güncelleniyor mu?
4. Sayfayı yenile — isim kalıcı mı?

Sonuç: ___

### T2.3 — Salon silme
1. Birden fazla salon varken "⋯" → "Sil" tıkla
2. Onay dialogu çıkıyor mu?
3. Onaylayınca salon siliniyor mu?
4. Başka bir salona geçiş yapılıyor mu?
5. Tek salon varken sil seçeneği disabled mı?

Sonuç: ___

### T2.4 — Salon çoklama kontrolü
1. Sayfayı birkaç kez yenile
2. Salon listesinde duplicate oluşuyor mu? (Olmamalı)
3. Supabase Dashboard → areas tablosu → duplicate satır var mı?

Sonuç: ___

### T2.5 — Salonlar arası geçiş
1. Farklı salonlara tıkla
2. Her salon kendi masalarını gösteriyor mu?
3. Geçiş animasyonu smooth mu?
4. Bir salondaki değişiklik diğerini etkiliyor mu? (Etkilememeli)

Sonuç: ___

---

## 3. MASA PLANI EDİTÖRÜ

### T3.1 — Masa ekleme
1. Düzenleme modunu aç
2. Sol panelden bir masa şekli seç (dikdörtgen)
3. Canvas'a tıkla veya sürükle → masa ekleniyor mu?
4. Her masa şeklini dene: dikdörtgen, kare, yuvarlak, bar, loca
5. Her biri doğru şekilde görünüyor mu?

Sonuç: ___

### T3.2 — Masa taşıma
1. Düzenleme modunda bir masaya tıkla ve sürükle
2. Masa hareket ediyor mu?
3. Bırakınca pozisyon kalıcı mı?

Sonuç: ___

### T3.3 — Masa boyutlandırma (resize)
1. Düzenleme modunda bir masayı seç
2. Köşe handle'larından sürükle → boyut değişiyor mu?
3. Çok küçük yapılabiliyor mu? (Minimum boyut kontrolü var mı?)

Sonuç: ___

### T3.4 — Masa döndürme (rotate)
1. Düzenleme modunda bir masayı seç
2. Döndürme kontrolü var mı ve çalışıyor mu?
3. Sandalyeler de masayla birlikte dönüyor mu?

Sonuç: ___

### T3.5 — Masa silme
1. Düzenleme modunda bir masayı seç
2. Sil butonu veya Delete tuşu ile sil
3. Masa kayboluyor mu?
4. O masada rezervasyon varsa ne oluyor? (Uyarı vermeli)

Sonuç: ___

### T3.6 — Masa bilgileri düzenleme
1. Bir masayı seç
2. İsim, kapasite değiştirebiliyor musun?
3. Değişiklikler kaydediliyor mu?

Sonuç: ___

### T3.7 — Klavye kısayolları
1. Bir masayı seç, Ctrl+C → Ctrl+V → kopyalanıyor mu?
2. Ctrl+X → kesiliyor mu?
3. Ctrl+Z → geri alıyor mu?
4. Delete → siliyor mu?
5. Escape → seçim temizleniyor mu?
6. Bir input'a yazarken (isim vs.) kısayollar tetikleniyor mu? (Tetiklenmemeli)

Sonuç: ___

### T3.8 — Masa birleştirme
1. Düzenleme modunda bir masaya tıkla → "Birleştir" seç
2. Başka masalara tıkla → seçime ekleniyor mu?
3. Birleştirmeyi onayla → grup oluşuyor mu?
4. Grubun toplam kapasitesi doğru mu? (Tüm masaların toplamı)
5. Grubu ayır → masalar tekil hale dönüyor mu?

Sonuç: ___

### T3.9 — Canvas zoom ve scroll
1. Sol alttaki zoom kontrollerini kullan (+/-)
2. Zoom in yaptığında canvas sağa sola kaydırılabiliyor mu?
3. Zoom out yaptığında tüm masalar görünüyor mu?
4. "Sığdır" butonu çalışıyor mu?
5. "Sıfırla" butonu %100'e döndürüyor mu?

Sonuç: ___

---

## 4. DEKORASYON ELEMANLARI

### T4.1 — Dekorasyon ekleme
1. Düzenleme modunda sol panelden Kapı ekle → doğru görünüyor mu?
2. Pencere ekle → doğru görünüyor mu?
3. Bar Tezgahı ekle → doğru görünüyor mu?
4. Diğer elemanları dene (varsa): Ağaç, Havuz, Kolon, Kasa, Tuvalet, Merdiven, Duvar
5. Her biri farklı görsel ile mi render ediliyor?

Sonuç: ___

### T4.2 — Dekorasyon düzenleme
1. Bir dekorasyon elemanını seç
2. Taşınabiliyor mu?
3. Boyutlandırılabiliyor mu? (Resize handle'lar düzgün çalışıyor mu?)
4. Döndürülebiliyor mu?
5. Silinebiliyor mu?

Sonuç: ___

---

## 5. REZERVASYONLAR

### T5.1 — Yeni rezervasyon oluşturma
1. Bir masaya tıkla
2. Sağ sidebar'da "+ Yeni Rezervasyon" tıkla (veya masa üzerinden rezervasyon oluştur)
3. Form alanlarını doldur: misafir adı, telefon, kişi sayısı, saat
4. Kaydet → rezervasyon listede görünüyor mu?
5. Masa rengi değişiyor mu? (Boş → Rezerve)
6. Sayfayı yenile → rezervasyon kalıcı mı?

Sonuç: ___

### T5.2 — Rezervasyon düzenleme
1. Mevcut bir rezervasyona tıkla (sağ sidebar'da veya masa üzerinde)
2. Düzenleme formu açılıyor mu?
3. Bilgileri değiştir → Güncelle → değişiklik kaydediliyor mu?

Sonuç: ___

### T5.3 — Rezervasyon silme
1. Bir rezervasyonu aç
2. "Sil" butonuna tıkla
3. Onay çıkıyor mu?
4. Silindikten sonra masa boşa dönüyor mu?
5. Liste güncelleniyor mu?

Sonuç: ___

### T5.4 — Durum değişiklikleri
1. Rezervasyon durumunu "Rezerve" → "Geldi" yap → masa rengi yeşile dönüyor mu?
2. "Geldi" → "İptal" yap → onay dialogu çıkıyor mu?
3. İptal onayından sonra masa boşa dönüyor mu?
4. "Gelmedi" durumuna çevir → masa boşa dönüyor mu?

Sonuç: ___

### T5.5 — Gelecek tarih + "Geldi" kontrolü
1. Yarınki bir tarih için rezervasyon oluştur
2. Durumu "Geldi" yapmayı dene
3. Uyarı çıkıyor mu? ("Bu rezervasyon gelecek bir tarihe ait...")

Sonuç: ___

### T5.6 — Kapasite aşımı uyarısı
1. 4 kişilik masaya 6 kişilik rezervasyon oluştur
2. Kapasite uyarısı gösteriliyor mu?
3. Badge rengi kırmızı mı?

Sonuç: ___

### T5.7 — Kapasite doluluk gösterimi
1. 6 kişilik masaya 3 kişilik rezervasyon oluştur
2. Sandalyelerde 3 dolu + 3 boş gösteriliyor mu?
3. Badge "3/6" formatında mı?
4. Badge rengi yeşil mi? (Hâlâ yer var)

Sonuç: ___

### T5.8 — Birleştirilmiş masa kapasitesi
1. 3 adet 4 kişilik masayı birleştir (toplam 12)
2. 8 kişilik rezervasyon oluştur
3. Badge "8/12" mi?
4. Renk yeşil mi? (Kapasite aşılmadı)

Sonuç: ___

### T5.9 — Çakışma kontrolü
1. Bir masaya 19:00 için rezervasyon oluştur
2. Aynı masaya aynı tarih 19:30 için başka rezervasyon oluşturmayı dene
3. Çakışma uyarısı çıkıyor mu?
4. Farklı masaya aynı saatte → çakışma yok, oluşturuluyor mu?
5. Aynı masaya farklı saatte (ör: 22:00) → çakışma yok, oluşturuluyor mu?

Sonuç: ___

### T5.10 — Rezervasyon arama
1. Sağ sidebar'daki arama kutusuna misafir adı yaz
2. Liste filtreleniyor mu?
3. Telefon numarası ile ara → filtreleniyor mu?

Sonuç: ___

---

## 6. GÜNLÜK vs VARSAYILAN PLAN

### T6.1 — Varsayılan plan düzenleme
1. "Düzenle" → "Genel Düzen" seç
2. Onay dialogu çıkıyor mu? ("Tüm günleri etkiler...")
3. Onayla → blueprint/farklı arka plan ve uyarı barı görünüyor mu?
4. Masa ekle/taşı/sil → değişiklikler tüm günleri etkiliyor mu?

Sonuç: ___

### T6.2 — Günlük plan override
1. "Düzenle" → "Bugün için" seç
2. Bugüne özel bir masa ekle
3. İnfo bar "Bugün için özel düzenleme aktif" diyor mu?
4. Başka bir güne geç → eklenen masa orada YOK mu? (Olmamalı)
5. Bugüne geri dön → eklenen masa orada mı?

Sonuç: ___

### T6.3 — Override varken varsayılan değişiklik
1. Bugün için override oluştur (bir masa ekle)
2. Varsayılan plana geç, farklı bir masa ekle
3. Bugüne dön → override hâlâ sağlam mı? Varsayılan değişiklik bugünü etkilemiyor mu?

Sonuç: ___

### T6.4 — Override sıfırlama
1. Bugün için override varken
2. "Özel Düzenlemeyi Sıfırla" veya "Varsayılana Dön" butonuna tıkla
3. Onay dialogu çıkıyor mu?
4. Onaylayınca bugünün planı varsayılana dönüyor mu?

Sonuç: ___

---

## 7. VERİ KALICILIĞI (SUPABASE)

### T7.1 — Veri kaybı testi
1. Birkaç masa ekle, birkaç rezervasyon oluştur
2. `localStorage.clear()` yap
3. Sayfayı yenile
4. Tüm veriler Supabase'den geri geliyor mu?

Sonuç: ___

### T7.2 — Farklı cihaz testi
1. Aynı hesapla farklı bir tarayıcıdan (veya gizli sekme) giriş yap
2. Aynı veriyi görüyor musun?

Sonuç: ___

### T7.3 — Eşzamanlı düzenleme (edge case)
1. İki tarayıcıda aynı hesapla giriş yap
2. Birinde masa ekle, diğerinde sayfayı yenile
3. Yeni masa görünüyor mu?
4. İkisinde aynı anda farklı değişiklik yap → veri kaybı oluyor mu?

Sonuç: ___

---

## 8. LANDING PAGE

### T8.1 — Sayfa yükleme
1. Çıkış yap veya giriş yapmadan siteye git
2. Landing page düzgün yükleniyor mu?
3. Tüm bölümler görünüyor mu? (Hero, Özellikler, Fiyatlandırma, SSS, Demo Formu, Footer)

Sonuç: ___

### T8.2 — Navigasyon
1. Navbar'daki "Özellikler" linkine tıkla → ilgili bölüme scroll ediyor mu?
2. "Fiyatlandırma" → scroll ediyor mu?
3. "SSS" → scroll ediyor mu?
4. "Giriş Yap" → /login sayfasına gidiyor mu?
5. "Demo Talep Et" → demo formuna scroll ediyor mu?

Sonuç: ___

### T8.3 — Demo talep formu
1. İsim, email, restoran adı gir
2. "Gönder" tıkla
3. Başarı mesajı gösteriliyor mu?
4. Supabase Dashboard → demo_requests tablosu → kayıt oluştu mu?

Sonuç: ___

### T8.4 — CTA butonları
1. "Ücretsiz Başla" → /register sayfasına gidiyor mu?
2. "Demo Talep Et" → form bölümüne scroll ediyor mu?

Sonuç: ___

---

## 9. GENEL UI / UX

### T9.1 — Console hataları
1. F12 → Console → sayfayı yenile
2. Kırmızı hata (Error) var mı? Not al.
3. "Maximum update depth" uyarısı var mı?
4. Turuncuyu (Warning) not al ama kritik değilse geç.

Sonuç: ___

### T9.2 — Responsive (mobil simülasyon)
1. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
2. iPhone boyutunda landing page düzgün mü?
3. Login/Register sayfaları düzgün mü?
4. Dashboard kullanılabilir mi? (Sol panel, canvas, sağ sidebar)

Sonuç: ___

### T9.3 — Çıkış butonu erişilebilirliği
1. Dashboard'da çıkış butonu her zaman görünüyor mu?
2. Sol panel açıkken/kapalıyken?
3. Canvas zoom'da?

Sonuç: ___

---

## SONUÇ TABLOSU

| Alan | Geçen | Kalan | Kritik Hata |
|------|-------|-------|-------------|
| Auth | /5 | | |
| Salon | /5 | | |
| Masa Editör | /9 | | |
| Dekorasyon | /2 | | |
| Rezervasyon | /10 | | |
| Plan Modları | /4 | | |
| Veri Kalıcılığı | /3 | | |
| Landing Page | /4 | | |
| Genel UI | /3 | | |
| **TOPLAM** | **/45** | | |
