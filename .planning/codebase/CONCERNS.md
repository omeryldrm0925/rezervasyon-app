# Codebase Concerns

**Analysis Date:** 2026-03-20

## Known Bugs

**BUG-1: Rezervasyonlar localStorage temizlenince kayboluyor:**
- Symptoms: `localStorage.clear()` sonrası sayfa yenilendiğinde masalar Supabase'den geliyor ama rezervasyonlar görünmüyor. Login/logout yapılınca düzeliyor.
- Files: `src/state/useRestaurantStore.ts` → `loadAllFromSupabase` effect, `RESTORE_SNAPSHOT`
- Trigger: `localStorage.clear()` → sayfa yenile
- Root cause: `RESTORE_SNAPSHOT` dispatch'i doğru görünüyor (tek seferlik, satır 893-900). Asıl sorun muhtemelen `isLoadingFromSupabaseRef.current` flag'inin timing'i — `setIsInitializing(false)` çağrısından önce sync effect tetiklenirse boş `reservations` array'i Supabase'e yazılıp orijinal verilerin üzerine geçilebilir.
- Workaround: Login/logout

**BUG-2: Masa kartından durum değişince renk güncellenmiyor:**
- Symptoms: Canvas'taki masaya tıklayıp `ReservationCard` üzerinden durum değiştirildiğinde masa rengi güncellenmez. `ReservationSidebar`'dan aynı işlem yapılınca çalışır.
- Files: `src/components/FloorCanvas.tsx`, `src/components/ReservationCard.tsx`
- Trigger: Canvas'ta masaya tıkla → popup'tan "Geldi" seç
- Root cause: `ReservationCard`'ın `onSetStatus` callback'i `App.tsx`'te `actions.setReservationStatus` ile bağlı olmalı, ama muhtemelen state değişimi `visualStates` prop'una yansımıyor. `FloorCanvas` `visualStates` prop'u dışarıdan alıyor — bu prop `App.tsx`'te `reservations` state'i değişince yeniden hesaplanmalı.

## Tech Debt

**`resolveInteractionMode` her zaman "idle" döndürüyor:**
- Issue: Fonksiyon `selectedObject` parametresini kullanmıyor — her iki dalda da `"idle"` döndürüyor. `"editingObject"` modu hiçbir zaman bu fonksiyon üzerinden set edilmiyor (sadece `START_EDITING_OBJECT` action'ı ile set ediliyor).
- Files: `src/state/useRestaurantStore.ts` satır 258-264
- Impact: `interactionMode` `"editingObject"` olması gereken durumlarda `"idle"` kalabilir; bu durum bazı UI branch'lerinin yanlış değerlendirmesine yol açabilir.
- Fix approach: Fonksiyonun `selectedObject` aldığında `"editingObject"` döndürmesi gerekip gerekmediğini netleştir veya fonksiyonu kaldır.

**`App.tsx` 1311 satır — monolitik component:**
- Issue: `RestaurantApp` fonksiyonu tek bir dev component olarak tüm iş mantığını, event handler'ları ve render'ı barındırıyor. Keyboard shortcut handler'lar, canvas hesaplamaları, overlay pozisyon mantığı hepsi iç içe.
- Files: `src/App.tsx`
- Impact: Kodu takip etmek ve yeni özellik eklemek zorlaşıyor. Tek bir değişiklik birden fazla ilgisiz alanı etkileyebilir.
- Fix approach: Keyboard shortcut'ları `useKeyboardShortcuts` hook'una, canvas hesaplamalarını `useCanvasState` hook'una taşı. `RestaurantApp`'i daha küçük parçalara böl.

**`useRestaurantStore.ts` 1009 satır — sıkışık hook:**
- Issue: Reducer (806 satır), initial state, helper fonksiyonlar, uid üreteci, side effect (Supabase sync), history (undo) ve action factory hepsi tek dosyada.
- Files: `src/state/useRestaurantStore.ts`
- Impact: Reducer mantığının izlenmesi güç; tek dosyada çok fazla sorumluluk var.
- Fix approach: Reducer'ı `src/state/reducer.ts`'e, action type'ları `src/state/actions.ts`'e ayır.

**`FloorCanvas.tsx` 1168 satır — aşırı büyük component:**
- Issue: Drag/resize logic, zoom/scroll, multi-select, drop preview, guide lines ve tüm render mantığı tek component'te.
- Files: `src/components/FloorCanvas.tsx`
- Impact: Her değişiklikte tüm dosyayı incelemek gerekiyor; test edilemez durumda.
- Fix approach: Drag mantığını `useDragState` hook'una, zoom/scroll'u `useCanvasViewport` hook'una çıkar.

**`mockData.ts` dosyası kullanılmıyor ama silınmemiş:**
- Issue: `src/data/mockData.ts` export ediyor ama hiçbir yerde import edilmiyor. Supabase entegrasyonu tamamlandıktan sonra kaldırılmamış.
- Files: `src/data/mockData.ts`
- Impact: Önemsiz ama dead code olarak karışıklık yaratıyor.
- Fix approach: Dosyayı sil.

**`signOut` içinde stale localStorage key temizliği:**
- Issue: `useAuth.ts` satır 51'de `localStorage.removeItem("rezerve-v1")` çağrılıyor ama CLAUDE.md'ye göre localStorage artık kullanılmıyor. Bu key mevcut değilse no-op, ama comment'te "localStorage artık kullanılmıyor" yazıyor.
- Files: `src/hooks/useAuth.ts` satır 51
- Impact: Kodu okuyan birini yanıltabilir.
- Fix approach: Satırı kaldır.

**`sequence` ve `uid()` global mutable state:**
- Issue: `let sequence = 0` modül düzeyinde global; `uid()` her çağrıda artırıyor. Hot reload veya test ortamında beklenmedik ID üretimi olabilir.
- Files: `src/state/useRestaurantStore.ts` satır 79-83
- Impact: Düşük — üretimde sorun çıkarmaz ama test ortamında ID'ler tahmin edilemez.
- Fix approach: `sequence`'i reducer state'ine veya useRef'e taşı.

**Supabase sync hataları sessizce yutulur:**
- Issue: `syncAreas`, `syncReservations`, `syncOverrides` hepsi `.catch(console.error)` ile çağrılıyor. Ağ hatası veya DB hatası kullanıcıya hiç gösterilmiyor — veri kaybolmuş gibi görünebilir.
- Files: `src/state/useRestaurantStore.ts` satır 832-834
- Impact: Sessiz veri kaybı riski — kullanıcı rezervasyon kaydedildiğini sanır ama Supabase'e yazılmamış olabilir.
- Fix approach: Sync hatalarını yakala ve kullanıcıya toast/banner ile bildir.

**`syncReservations` boş array'de çalışmıyor:**
- Issue: `src/lib/api.ts` satır 162: `if (!configured || reservations.length === 0) return;` — rezervasyonların hepsi silindiğinde DB'den temizleme yapılmıyor.
- Files: `src/lib/api.ts` satır 162
- Impact: Tüm rezervasyonlar uygulama içinde silindikten sonra DB'deki eski kayıtlar kalıyor. Sayfa yenilenince geri dönebilirler.
- Fix approach: `syncAreas`'ta olduğu gibi orphan silme mantığı ekle veya "boşsa hepsini sil" dal ekle.

## Security Considerations

**RLS (Row Level Security) tüm tablolarda kapalı:**
- Risk: Herhangi bir authenticated Supabase kullanıcısı başka restoranların verilerini okuyabilir veya yazabilir. `layout_overrides` tablosunda başka restoran alanlarına ait override'ları okuma `loadAllFromSupabase` içinde uygulama katmanında filtreleniyor — DB katmanında hiç koruması yok.
- Files: `src/lib/api.ts` satır 59-60 (overrides sorgusu `restaurant_id` filtresi olmadan çekiyor)
- Current mitigation: Uygulama seviyesinde `areaIds` set filtrelemesi (satır 66, 93), ama bu DB'den gereksiz veri çekiyor ve kolayca atlatılabilir.
- Recommendations: Tüm tablolar için RLS politikası ekle. `restaurants` → `owner_id = auth.uid()`, `areas/reservations/layout_overrides` → restaurant üzerinden join ile kontrol. CURRENT-TASK.md'de de not edilmiş (madde 4).

**`supabase.ts` env var'ları `as string` ile cast ediliyor:**
- Risk: `VITE_SUPABASE_URL` veya `VITE_SUPABASE_ANON_KEY` tanımsız ise `createClient(undefined, undefined)` çağrılır. `api.ts`'teki `configured` flag bunu kısmen önlüyor ama `supabase` client hatalı oluşmuş oluyor.
- Files: `src/lib/supabase.ts` satır 3-4
- Current mitigation: `configured` boolean kontrolü `api.ts`'te var.
- Recommendations: Env var yoksa erken hata fırlat veya tip-safe kontrol ekle.

**Kayıt sonrası email doğrulaması bekleniyor ama oturum açık kalıyor:**
- Risk: `signUp` başarılı olduğunda `setRestaurantId` ve `setAuthState` çağrılıyor — kullanıcı email'i doğrulamadan restoran kaydedebilir ve uygulamayı kullanabilir. `RegisterPage` "doğrulama e-postası" mesajı gösteriyor ama `useAuth.ts`'te email doğrulama kontrolü yok.
- Files: `src/hooks/useAuth.ts` satır 56-64
- Current mitigation: Yok
- Recommendations: `signUp` sonucunda `data.session` null ise (email doğrulaması zorunlu ise) `setRestaurantId` çağırma.

## Performance Bottlenecks

**`warningByReservation` her render'da yeniden hesaplanıyor:**
- Problem: `App.tsx` satır 428-444'te `reservationsAllAreas` üzerinde döngü — her rezervasyon için `buildEffectiveTables` ve `buildTableMap` çağrılıyor. Salon başına O(n) hesaplama.
- Files: `src/App.tsx` satır 428-444
- Cause: `useMemo` ile sarılmamış, her render tetikliyor.
- Improvement path: `useMemo` içine al, bağımlılıklar: `reservationsAllAreas`, `state.areas`, `state.overrides`, `state.activeDateISO`.

**Supabase sync debounce: tüm veri her değişimde yazılıyor:**
- Problem: Her state değişiminde (masa sürüklemesi dahil) `syncAreas`, `syncReservations`, `syncOverrides` hepsi birden çağrılıyor. 1 sn debounce var ama sürükleme bittikten 1 sn sonra tüm veri yeniden yazılıyor.
- Files: `src/state/useRestaurantStore.ts` satır 827-836
- Cause: Granüler değil, bulk sync.
- Improvement path: Sadece değişen entity'yi sync et (örn. sadece değişen area'yı `syncArea(areaId)` ile gönder).

## Fragile Areas

**Duplicate area temizliği startup'ta çalışıyor:**
- Files: `src/state/useRestaurantStore.ts` satır 848-885
- Why fragile: İsim bazlı eşleşme yapıyor — aynı isimli iki farklı salon olması durumunda biri silinecek. Birden fazla kullanıcı aynı isimde salon oluşturabilirse veri kaybı riski var.
- Safe modification: Bu bloğu değiştirirken area silme ve rezervasyon taşıma mantığını birlikte test et.
- Test coverage: Hiç test yok.

**`baseTableSnapshot` / `baseFixtureSnapshot` olmayan eski override kayıtları:**
- Files: `src/types.ts` satır 75-76 (`optional` olarak tanımlı), `src/utils/layout.ts` satır 38
- Why fragile: Eski override kayıtları bu alanları içermiyor. Fallback `area.defaultTables` kullanıyor — bu durumda snapshot izolasyonu bozuluyor ve default plan değişimleri eski override'ları etkiliyor.
- Safe modification: Migration veya explicit backfill olmadan eski kayıtları değiştirme.

**`getOrCloneOverride` fonksiyonu immutability'yi kısmen ihlal ediyor:**
- Files: `src/state/useRestaurantStore.ts` satır 177-200
- Why fragile: `cloneOverride` shallow clone yapıyor (satır 146-157). `override.mergedGroups` içindeki nesnelere sonradan `group.tableIds` mutasyonu yapılıyor (satır 619-638). Bu doğrudan reducer içinde yapılıyor, controlled, ama dikkat edilmezse state bozulabilir.
- Safe modification: Reducer action'larında `override` objesine doğrudan mutation yapmaktan kaçın; yerine spread ile yeni obje oluştur.

**`FloorCanvas` dışından state değişimi (BUG-2 nedeni):**
- Files: `src/components/FloorCanvas.tsx`, `src/App.tsx`
- Why fragile: `visualStates`, `groupVisualStates` prop olarak dışarıdan geliyor. `ReservationCard`'dan yapılan durum değişikliği `App.tsx`'teki callback zinciri üzerinden state'e yazılıyor — render döngüsünde prop güncellemesi gecikebiliyor. Canvas içindeki `onSetStatus` callback'inin `App.tsx`'te gerçekten bağlı olduğunu her yeni durum değişimi callback eklendiğinde kontrol et.

## Scaling Limits

**Tek restoran per user:**
- Current capacity: Her kullanıcı için tek restoran (`getRestaurantForUser` `.single()` kullanıyor).
- Limit: Çoklu restoran yönetimi desteklenmiyor.
- Scaling path: `restaurants` sorgusuna `.single()` yerine liste döndür, UI'da restoran seçici ekle.

**Rezervasyon geçmişi sonsuz büyüyor:**
- Current capacity: Tüm geçmiş rezervasyonlar `state.reservations[]`'da tutuluyor ve her yüklemede tümü çekiliyor.
- Limit: Uzun vadede `loadAllFromSupabase` büyük payload döndürecek; bellek kullanımı ve yükleme süresi artacak.
- Scaling path: Date aralığı filtresi ekle — sadece son 30-90 gün veya seçili ay yüklensin.

## Missing Critical Features

**RLS politikaları yok:**
- Problem: Supabase'de Row Level Security kapalı. Bu durum SaaS platformu için kritik bir güvenlik eksikliği.
- Blocks: Multi-tenant güvenlik — farklı restoranlar birbirinin verisine erişebilir.

**Abonelik ve ödeme sistemi yok:**
- Problem: `subscription_plan` ve `subscription_status` DB'de tanımlı ama uygulama tarafında hiç kontrol edilmiyor.
- Blocks: Monetization — tüm kullanıcılar limitsiz erişiyor.

**Mobil responsive değil:**
- Problem: Canvas sürükle/bırak ve fixed pozisyonlu popup'lar mobil dokunmatik ekranlarda çalışmaz.
- Blocks: Mobil kullanım.

## Test Coverage Gaps

**Sıfır test dosyası:**
- What's not tested: Reducer logic, layout utility functions, API functions, component rendering — hiçbir şey.
- Files: `src/state/useRestaurantStore.ts`, `src/utils/layout.ts`, `src/lib/api.ts`
- Risk: Override hesaplama (`buildEffectiveTables`), merge/split group logic ve Supabase sync hataları sessizce bozulabilir.
- Priority: High — `buildEffectiveTables` ve `reducer` en kritik, en çok dallanan kod.

---

*Concerns audit: 2026-03-20*
