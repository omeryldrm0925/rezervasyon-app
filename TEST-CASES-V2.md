# TEST-CASES-V2.md — Yeni Özellikler Test Senaryoları

> Son test turundaki (V1) özellikler hariç, sadece yeni eklenenler.
> Sonucu ✅ veya ❌ olarak işaretle.

---

## 1. ONBOARDING WIZARD

### T1.1 — Yeni kullanıcı onboarding'e yönlendirilir
1. Tüm verileri sil (SQL + localStorage.clear + kullanıcı sil)
2. Yeni email ile kayıt ol VEYA Google ile giriş yap
3. Onboarding wizard açılıyor mu? (Dashboard değil)

Sonuç: Başarılı

### T1.2 — Adım 1: Restoran ismi
1. Restoran adı gir
2. İleri'ye tıkla → Adım 2'ye geçiyor mu?
3. Boş bırakıp İleri'ye tıkla → uyarı veriyor mu?

Sonuç: Başarılı / Boş bırakınca ileri butonu pasif oluyor tıklanamıyor. Gayet iyi

### T1.3 — Adım 2: Salon seçimi
1. Birden fazla salon seç (örn: Ana Salon + Teras + Bahçe)
2. Seçili kartlarda indigo border + check ikonu görünüyor mu?
3. "Diğer" ile custom alan ekle → badge olarak görünüyor mu?
4. Hiç seçmeden İleri'ye tıkla → uyarı veriyor mu?
5. Seçimi kaldırıp tekrar ekle → düzgün çalışıyor mu?

Sonuç: Başarılı

### T1.4 — Adım 3: Çalışma saatleri
1. Toggle'lar çalışıyor mu? (yeşil/kırmızı geçiş)
2. Kapalı yapılan günde saat seçiciler kayboluyor mu?
3. Saatleri değiştir → kaydediliyor mu?
4. "Bu adımı atla" tıkla → sonraki adıma geçiyor mu?

Sonuç: Başlangıç saati bitiş saatinden geç seçilebiliyor. Mantık hatası. Burada kural atanması gerekiyor. Onun harici başarılı

### T1.5 — Adım 4: Masa sayıları
1. Seçtiğin her salon için ayrı bölüm görünüyor mu?
2. Counter butonları (+/-) çalışıyor mu?
3. Farklı şekillerde masa ekle (kare, dikdörtgen, yuvarlak, loca)
4. "Bu adımı atla" tıkla → çalışıyor mu?

Sonuç: Başarılı

### T1.6 — Adım 5: Tamamlama
1. Özet doğru mu? (Restoran adı, salon sayısı, masa sayısı, çalışma günleri)
2. "Uygulamayı Başlat" tıkla → dashboard açılıyor mu?
3. Hata vermiyor mu?
4. Seçtiğin salonlar tab olarak görünüyor mu?
5. Eklediğin masalar canvas'ta yerleşmiş mi?
6. Masalar diagonal yerleşimle mi geldi?

Sonuç: Başarılı

### T1.7 — Onboarding tekrarlanmıyor
1. Dashboard açıldıktan sonra sayfayı yenile
2. Wizard tekrar açılıyor mu? (Açılmamalı)
3. Çıkış yap, tekrar giriş yap → wizard açılmıyor mu?

Sonuç: Başarılı

### T1.8 — Wizard atlanırsa
1. Wizard'da hiç salon/masa seçmeden tüm adımları atla
2. Default "Ana Salon" oluşuyor mu?
3. Boş canvas ile dashboard açılıyor mu?

Sonuç: ___

---

## 2. GOOGLE LOGIN

### T2.1 — İlk kez Google ile giriş
1. Çıkış yap, kullanıcıyı sil, verileri temizle
2. Google ile giriş yap
3. Hesap seçme ekranı çıkıyor mu? (prompt: select_account)
4. Onboarding wizard'a yönlendiriyor mu?

Sonuç: Başarılı

### T2.2 — Tekrar Google ile giriş
1. Onboarding'i tamamla, çıkış yap
2. Google ile tekrar giriş yap
3. Direkt dashboard'a gidiyor mu? (Wizard açılmıyor)
4. Veriler sağlam mı?

Sonuç: Başarılı

### T2.3 — Google login hızı
1. Google ile giriş yap
2. Dashboard'a kaç saniyede geçiyor?
3. 3 saniyeden fazla sürüyor mu?

Sonuç: Başarılı, sadece bir seferde 8 saniye sürdü. ortalama 2 saniye civarlarında

---

## 3. CANVAS POPUP FORM

### T3.1 — Popup açılma
1. Düzenleme modu KAPALI iken masaya tıkla
2. Masanın altında rezervasyon formu popup açılıyor mu?
3. Tıklanan masa formda otomatik seçili mi?

Sonuç: Başarılı, ama burada düzeltme yapılacak. masaya tıkladığımda sağda ikinci bir forma gerek yok. sağ sidebar rezervasyonların takibi için. ayrıca masaya tıklayınca açılan forma rezervasyon statüsü düzenleme özelliği de gelecek

### T3.2 — Popup input'ları
1. Form input'larına (isim, telefon) tıkla
2. Form kapanıyor mu? (Kapanmamalı!)
3. Yazı yazılabiliyor mu?

Sonuç: Başarılı, ama rezervasyona sağ sidebardan tıklayınca etrafında mavi bir çizgi kaplıyor masayı. eğer rezervasyonu silersen o masa seçili kalıyor. etrafındaki mavi çizgi gitmiyor.

### T3.3 — Popup pozisyonu
1. Canvas'ın üst kısmındaki masaya tıkla → popup aşağı açılıyor mu?
2. Canvas'ın alt kısmındaki masaya tıkla → popup yukarı açılıyor mu?
3. Kaydet butonu her durumda görünür ve tıklanabilir mi?

Sonuç: Kısmen başarılı, evet işi görüyor ve kaydet butonuna tıklanıyor. ama eğer masa çok solda ya da çok aşağıdaysa form masanın üzerine geliyor. eğer masa yukarıdaysa bu sorun yok. bence rezervasyon girerken masayı görmesi önemli.

### T3.4 — Popup kapatma
1. X butonuyla kapat → kapanıyor mu?
2. Canvas'ta boş alana tıkla → kapanıyor mu?
3. İptal butonuyla kapat → kapanıyor mu?

Sonuç: Başarılı

### T3.5 — Düzenleme modunda popup
1. Düzenleme modu AÇ
2. Masaya tıkla → masa düzenleme formu mu geliyor? (Rezervasyon değil)
3. Masa adı ve kapasite değiştirilebiliyor mu?

Sonuç: Başarılı -> Buraya bir kontrol ekleyelim. İlgili salonda aynı isimde başka bir masa varsa sistem hata versin. Günlük düzende kapasite ve masa ismi değiştirilebiliyor ve sadece ilgili günü etkiliyor. bunu istiyor muyuz emin değilim

---

## 4. SAĞ SIDEBAR

### T4.1 — Mevcut rezervasyona tıklama
1. Bir rezervasyon oluştur
2. Sağ sidebar'da o rezervasyona tıkla
3. Detaylar gösteriliyor mu? (İsim, telefon, saat, masa, durum)
4. Yeni form yerine mevcut bilgi mi geliyor?

Sonuç: Başarısız! Masada rezervasyon olduğu halde sağ sidebarda form geliyor. Zaten olması gereken düzende oraya hiç bir zaman form gelmeyecek. Sadece üstte bir rezervasyon ekle butonu olacak. Çalışan isterse oradan rez ekleyip Salon seçimi -> masa seçimi ile ilerleyip rezervasyon atayabilecek. Ayrıca formdan dolayı mevcut rez listesi çok altta kalmış ve oradaki scroll falan işe yaramıyor çok kullanışsız oluyor masaya tıklanması durumunda. sağ sidebar rez form kalkarsa her şey çözülecek.

### T4.2 — Boş alana tıklama
1. Canvas'ta boş alana tıkla
2. Sağ sidebar liste moduna dönüyor mu?
3. Açık form kapanıyor mu?

Sonuç: Başarılı

---

## 5. LANDING PAGE

### T5.1 — Scroll animasyonları
1. Landing page'i aç
2. Aşağı scroll et → bölümler fade-in ile geliyor mu?
3. Scroll çalışıyor mu? (Daha önce bozulmuştu)

Sonuç: Başarılı

### T5.2 — Mobil responsive
1. F12 → mobil simülasyon
2. Hamburger menü görünüyor mu?
3. Hero screenshot responsive mi?
4. Özellikler bölümü mobilde görünüyor mu? (Daha önce boş geliyordu)
5. Fiyatlandırma kartları tek sütun mu?

Sonuç: Başarılı, hamburger menüyü ayıran bir çerçeve bir alan vs. yok. dolayısıyla hamburger menü ana ekranın bi parçası gibi duruyor. oraya ufak bir UI düzeltmesi gerekiyor sadece

### T5.3 — Hero screenshot
1. Landing page'de hero bölümünde uygulama screenshot'ı görünüyor mu?
2. Rounded corners ve shadow var mı?

Sonuç: Başarılı

### T5.4 — Navbar scroll blur
1. Sayfa en üstündeyken navbar transparent mı?
2. Aşağı scroll edince blur + shadow ekleniyor mu?

Sonuç: Başarılı

---

## 6. UI İYİLEŞTİRMELERİ

### T6.1 — Aktif salon tab
1. Aktif salon tab'ı belirgin mi? (Mavi/indigo background, rounded)
2. Pasif tablardan ayırt edilebiliyor mu?

Sonuç: Başarılı, ama tablar arası geçmek için badge alanına değil bizzat texte tıklamak gerekiyor. badge'deki boş alanlar ignorelanıyor

### T6.2 — Özet bar badge'leri
1. Üstteki "Bugün", rezervasyon sayısı, misafir sayısı renkli badge mi?
2. Renkleri doğru mu? (Koyu/indigo/yeşil)

Sonuç: Başarılı

### T6.3 — Saat formatı
1. Rezervasyon saati "19:00" formatında mı? (Saniye yok)
2. Misafir adı bold/highlight mı?

Sonuç: Başarılı, saat solda ve daha bold, isim sağda ve bi tık daha az bold. saat solda kalabilir ancak isim saatten bold olmalı

### T6.4 — Restoran ismi
1. Dashboard'da restoran ismi görünüyor mu?
2. Nerede? (TopBar, salon tabları üstü?)

Sonuç: Başarılı, ama türkçe karakter kabul etmiyor. "Cemiyet" olarak girilen isim "CEMIYET" olarak gözüküyor.

### T6.5 — Viewport uyumu
1. Chrome %100 zoom'da dashboard viewport'a sığıyor mu?
2. Yatay scroll yok mu?

Sonuç: Başarılı. Henüz bi dashboard inşa etmedik. Ama scroll sorunu giderilmiş rahatsız etmiyor ana ekran.

---

## 7. DÜZENLEME MODU

### T7.1 — Düzenle butonu
1. "Düzenle" butonu tıkla → "Bugün için" / "Genel Düzen" seçenekleri açılıyor mu?
2. İkon ve yazı hizalı mı?

Sonuç: Başarılı

### T7.2 — Sürükle bırak = form açmıyor
1. Düzenleme modunda masayı sürükleyip bırak
2. Form/popup açılıyor mu? (Açılmamalı, sadece tıklama açmalı)

Sonuç: Başarılı, ama bir şeyi fark ettim. yuvarlak masa ya da ne sürüklersem sürükleyeyim altındaki shadowu canvasta kare oluyor. bunu da ya senkronize edelim olmuyorsa da kaldıralım. ayrıca bar ikonu dikdörtgen uzun bi masa iken eklenen bar masası tek kişilik yuvarlak bir masa. masanın yapısını hiç bozmadan default eklenen bar masasını 4 kişilik ince uzun eliptik bir şekle çevirelim.

### T7.3 — Grup birleştirme
1. Birden fazla masa seç → Birleştir
2. Grup adı otomatik "Grup 1" olarak mı geliyor?
3. Birleştirme sonrası aktif salon değişmiyor mu? (Eski bug)

Sonuç: Başarılı, ama belirlenen isim masaların arkasında kalıyor, bi tık üstte belirsin.

---