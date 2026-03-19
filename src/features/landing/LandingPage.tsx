import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// ── Intersection Observer hook (fade-in animasyonu için) ──────────────────────
function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Accordion item ─────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full flex items-center justify-between py-4 text-left text-gray-900 font-medium hover:text-indigo-600 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="pb-4 text-gray-600 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

// ── Demo form ─────────────────────────────────────────────────────────────────
function DemoForm() {
  const [form, setForm] = useState({ name: "", email: "", restaurant: "", phone: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from("demo_requests").insert({
      name: form.name,
      email: form.email,
      restaurant_name: form.restaurant,
      phone: form.phone || null,
    });
    setLoading(false);
    if (err) { setError("Bir hata oluştu, lütfen tekrar deneyin."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center py-10">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-xl font-semibold text-gray-900">Teşekkürler!</p>
        <p className="text-gray-500 mt-2">En kısa sürede size dönüş yapacağız.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ahmet Yılmaz"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="ahmet@restoran.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Restoran Adı</label>
          <input required value={form.restaurant} onChange={e => setForm(f => ({ ...f, restaurant: e.target.value }))}
            placeholder="Örnek Restaurant"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon <span className="text-gray-400">(opsiyonel)</span></label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+90 5xx xxx xx xx"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
      </div>
      <button disabled={loading} type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
        {loading ? "Gönderiliyor..." : "Demo Talep Et"}
      </button>
    </form>
  );
}

// ── Ana component ─────────────────────────────────────────────────────────────
export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const heroRef = useFadeIn() as React.RefObject<HTMLDivElement>;
  const featRef = useFadeIn() as React.RefObject<HTMLDivElement>;
  const priceRef = useFadeIn() as React.RefObject<HTMLDivElement>;
  const faqRef = useFadeIn() as React.RefObject<HTMLDivElement>;
  const demoRef = useFadeIn() as React.RefObject<HTMLDivElement>;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Inline styles for fade-in ── */}
      <style>{`
        .fade-section { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .fade-section.visible { opacity: 1; transform: none; }
      `}</style>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? "shadow-sm border-b border-gray-100" : ""}`}>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-xl font-extrabold text-indigo-600 tracking-tight">Rezerve</Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <button onClick={() => scrollTo("ozellikler")} className="hover:text-gray-900 transition-colors">Özellikler</button>
            <button onClick={() => scrollTo("fiyatlandirma")} className="hover:text-gray-900 transition-colors">Fiyatlandırma</button>
            <button onClick={() => scrollTo("sss")} className="hover:text-gray-900 transition-colors">SSS</button>
            <Link to="/login" className="hover:text-gray-900 transition-colors">Giriş Yap</Link>
            <button onClick={() => scrollTo("demo")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Demo Talep Et
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(v => !v)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 text-sm">
            <button onClick={() => scrollTo("ozellikler")} className="block w-full text-left text-gray-700 py-2">Özellikler</button>
            <button onClick={() => scrollTo("fiyatlandirma")} className="block w-full text-left text-gray-700 py-2">Fiyatlandırma</button>
            <button onClick={() => scrollTo("sss")} className="block w-full text-left text-gray-700 py-2">SSS</button>
            <Link to="/login" className="block text-gray-700 py-2">Giriş Yap</Link>
            <Link to="/register" className="block bg-indigo-600 text-white text-center py-2.5 rounded-lg font-medium">
              Ücretsiz Başla
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="fade-section pt-20 pb-16 px-4 sm:px-6 text-center max-w-4xl mx-auto visible">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Şu an beta — ilk 100 restoran ücretsiz
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
          Restoranınızın rezervasyon<br className="hidden sm:block" />
          <span className="text-indigo-600"> sürecini dijitalleştirin</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Masa planınızı oluşturun, rezervasyonlarınızı yönetin.<br className="hidden sm:block" />
          Tek platform, sıfır kaos.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register"
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors shadow-sm">
            Ücretsiz Başla
          </Link>
          <button onClick={() => scrollTo("demo")}
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 font-semibold px-7 py-3.5 rounded-xl text-base border border-gray-200 transition-colors">
            Demo Talep Et
          </button>
        </div>

        {/* Mockup placeholder */}
        <div className="mt-16 mx-auto max-w-3xl">
          <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-gray-950">
            {/* Fake browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-900 border-b border-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 h-5 bg-gray-800 rounded text-gray-600 text-xs flex items-center px-3">rezerve.app</div>
            </div>
            {/* Mockup content */}
            <div className="bg-gray-950 p-4 h-64 sm:h-80 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* Simulated floor plan */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-3 opacity-80">
                    {[
                      { w: "w-16", h: "h-12", color: "bg-emerald-500/20 border-emerald-500/40" },
                      { w: "w-20", h: "h-14", color: "bg-indigo-500/20 border-indigo-500/40" },
                      { w: "w-16", h: "h-12", color: "bg-emerald-500/20 border-emerald-500/40" },
                      { w: "w-14", h: "h-14", color: "bg-emerald-500/20 border-emerald-500/40", round: true },
                      { w: "w-20", h: "h-12", color: "bg-rose-500/20 border-rose-500/40" },
                      { w: "w-16", h: "h-12", color: "bg-emerald-500/20 border-emerald-500/40" },
                      { w: "w-14", h: "h-14", color: "bg-emerald-500/20 border-emerald-500/40", round: true },
                      { w: "w-20", h: "h-14", color: "bg-indigo-500/20 border-indigo-500/40" },
                    ].map((t, i) => (
                      <div key={i} className={`${t.w} ${t.h} border ${t.color} ${t.round ? "rounded-full" : "rounded-lg"} flex items-center justify-center`}>
                        <span className="text-gray-400 text-xs font-mono">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-gray-800/80 rounded-lg px-3 py-1.5 text-xs text-gray-400">
                  Ana Salon · 8 masa
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ÖZELLİKLER ─────────────────────────────────────────────────────── */}
      <section id="ozellikler" ref={featRef as React.RefObject<HTMLElement>}
        className="fade-section py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Her şey tek panelde</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Karmaşık sistemlere, Excel tablolarına ve WhatsApp kaosuna son.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🎨", title: "Sürükle-Bırak Plan Editörü", desc: "Masalarınızı canvas üzerinde özgürce yerleştirin. Her salon için ayrı düzen tasarlayın." },
              { icon: "📅", title: "Akıllı Rezervasyon Yönetimi", desc: "Günlük takvim görünümü, otomatik çakışma kontrolü ve müşteri geçmişi takibi." },
              { icon: "✨", title: "Günlük Plan Değişiklikleri", desc: "Özel günlerde masaları farklı dizin — varsayılan planınız hiç bozulmasın." },
              { icon: "🏢", title: "Çoklu Salon Desteği", desc: "Ana salon, bahçe, teras — her biri bağımsız plan, tek yerden yönetim." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all duration-200">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FİYATLANDIRMA ──────────────────────────────────────────────────── */}
      <section id="fiyatlandirma" ref={priceRef as React.RefObject<HTMLElement>}
        className="fade-section py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Basit ve şeffaf fiyatlandırma</h2>
            <p className="text-gray-500 text-lg">Gizli ücret yok. İstediğiniz zaman plan değiştirin.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Başlangıç */}
            <div className="rounded-2xl border border-gray-200 p-8 flex flex-col">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Başlangıç</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-gray-900">₺0</span>
                <span className="text-gray-400 text-sm">/ay</span>
              </div>
              <p className="text-gray-400 text-sm mb-8">Sonsuza kadar ücretsiz</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-10 flex-1">
                {["1 salon", "10 masa", "Temel rezervasyon", "7 gün geçmiş"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors">
                Ücretsiz Başla
              </Link>
            </div>

            {/* Profesyonel — most popular */}
            <div className="rounded-2xl border-2 border-indigo-500 p-8 flex flex-col relative shadow-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">En Popüler</span>
              </div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">Profesyonel</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-gray-900">₺299</span>
                <span className="text-gray-400 text-sm">/ay</span>
              </div>
              <p className="text-gray-400 text-sm mb-8">14 gün ücretsiz dene</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-10 flex-1">
                {["3 salon", "50 masa", "Gelişmiş rezervasyon", "Sınırsız geçmiş", "Öncelikli destek", "Çakışma uyarıları"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                14 Gün Ücretsiz Dene
              </Link>
            </div>

            {/* İşletme */}
            <div className="rounded-2xl border border-gray-200 p-8 flex flex-col">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">İşletme</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-gray-900">₺599</span>
                <span className="text-gray-400 text-sm">/ay</span>
              </div>
              <p className="text-gray-400 text-sm mb-8">Büyük işletmeler için</p>
              <ul className="space-y-3 text-sm text-gray-600 mb-10 flex-1">
                {["Sınırsız salon", "Sınırsız masa", "API erişimi", "Özel destek hattı", "Beyaz etiket", "Kapora sistemi (yakında)"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => scrollTo("demo")} className="block w-full text-center border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors">
                İletişime Geç
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SSS ────────────────────────────────────────────────────────────── */}
      <section id="sss" ref={faqRef as React.RefObject<HTMLElement>}
        className="fade-section py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="space-y-0">
            <FaqItem q="Ücretsiz plan ne kadar süre kullanılabilir?" a="Süresiz. Ücretsiz plan için herhangi bir zaman sınırı yok. 1 salon ve 10 masa ile sonsuza kadar kullanabilirsiniz." />
            <FaqItem q="Verilerim güvende mi?" a="Evet. Verileriniz Supabase altyapısında, şifreli bağlantıyla (SSL/TLS) saklanır. Her restoranın verisine yalnızca o restoran sahibi erişebilir." />
            <FaqItem q="Kapora sistemi ne zaman gelecek?" a="Müşterilerin rezervasyon sırasında kapora ödeyebileceği sistem 2025 içinde planlanıyor. Erken erişim için bize ulaşın." />
            <FaqItem q="Mevcut sistemimden geçiş yapabilir miyim?" a="Evet. Excel, Google Sheets veya başka bir sistemden geçiş için destek ekibimiz yardımcı olur. Demo talep ettiğinizde bu konuyu da ele alabiliriz." />
            <FaqItem q="Hangi cihazlarda çalışır?" a="Tüm modern tarayıcılarda (Chrome, Safari, Firefox, Edge) çalışır. Tablet ve masaüstü için optimize edilmiştir, mobil uyumludur." />
            <FaqItem q="İptal etmek istesem ne olur?" a="İstediğiniz zaman iptal edebilirsiniz, bağlayıcılık yok. Verilerinizi dışa aktarma seçeneği de sunuyoruz." />
          </div>
        </div>
      </section>

      {/* ── DEMO FORM ──────────────────────────────────────────────────────── */}
      <section id="demo" ref={demoRef as React.RefObject<HTMLElement>}
        className="fade-section py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Demo talep edin, size ulaşalım</h2>
          <p className="text-gray-500 text-lg mb-10">Uygulamayı canlı görmek ve sorularınızı sormak için formu doldurun.</p>
          <DemoForm />
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>© 2025 Rezerve. Tüm hakları saklıdır.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600 transition-colors">Gizlilik Politikası</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Kullanım Koşulları</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
