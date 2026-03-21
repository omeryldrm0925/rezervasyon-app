import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// ── CSS injected once ───────────────────────────────────────────────────────
const STYLES = `
  .reveal { opacity: 0; transform: translateY(2rem); }
  .reveal.in-view {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1);
  }
  .reveal.delay-1.in-view { transition-delay: .1s; }
  .reveal.delay-2.in-view { transition-delay: .2s; }
  .reveal.delay-3.in-view { transition-delay: .3s; }

  .feat-visual {
    position: absolute; inset: 0;
    opacity: 0;
    transition: opacity .5s ease;
    pointer-events: none;
  }
  .feat-visual.active { opacity: 1; pointer-events: auto; }

  .cta-black {
    display: inline-flex; align-items: center; justify-content: center;
    background: #0a0a0a; color: #fff;
    padding: .75rem 1.75rem; border-radius: 9999px;
    font-weight: 600; font-size: .95rem;
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .cta-black:hover { transform: scale(1.04); box-shadow: 0 8px 24px rgba(0,0,0,.18); }
  .cta-black:active { transform: scale(.98); }

  .cta-outline {
    display: inline-flex; align-items: center; justify-content: center;
    border: 1.5px solid #d4d4d4; color: #404040;
    padding: .75rem 1.75rem; border-radius: 9999px;
    font-weight: 600; font-size: .95rem; background: transparent;
    transition: border-color .15s, color .15s, transform .15s;
  }
  .cta-outline:hover { border-color: #a3a3a3; color: #171717; transform: scale(1.02); }

  .faq-body {
    overflow: hidden;
    max-height: 0;
    transition: max-height .35s cubic-bezier(.22,1,.36,1);
  }
  .faq-body.open { max-height: 200px; }
`;

// ── Scroll reveal hook ──────────────────────────────────────────────────────
function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("in-view"); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── FAQ item ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200">
      <button
        className="w-full flex items-center justify-between py-5 text-left text-stone-900 font-medium hover:text-stone-600 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-base">{q}</span>
        <svg
          className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform duration-300 ml-4 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <polyline points="3,6 8,11 13,6" />
        </svg>
      </button>
      <div className={`faq-body ${open ? "open" : ""}`}>
        <p className="pb-5 text-stone-500 text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Demo form ───────────────────────────────────────────────────────────────
function DemoForm() {
  const [form, setForm] = useState({ name: "", email: "", restaurant: "", phone: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await supabase.from("demo_requests").insert({
      name: form.name, email: form.email,
      restaurant_name: form.restaurant, phone: form.phone || null,
    });
    setLoading(false);
    if (err) { setError("Bir hata oluştu, lütfen tekrar deneyin."); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
        <p className="text-xl font-bold text-stone-900">Teşekkürler!</p>
        <p className="text-stone-500 mt-2 text-sm">En kısa sürede size dönüş yapacağız.</p>
      </div>
    );
  }

  const inputCls = "w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/8 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto text-left">
      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Ad Soyad</label>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ahmet Yılmaz" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">E-posta</label>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="ahmet@restoran.com" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Restoran Adı</label>
          <input required value={form.restaurant} onChange={e => setForm(f => ({ ...f, restaurant: e.target.value }))}
            placeholder="Örnek Restaurant" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Telefon <span className="text-stone-400 normal-case font-normal">(opsiyonel)</span>
          </label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+90 5xx xxx xx xx" className={inputCls} />
        </div>
      </div>
      <button disabled={loading} type="submit"
        className="cta-black w-full disabled:opacity-60 disabled:cursor-not-allowed mt-2">
        {loading ? "Gönderiliyor..." : "Demo Talep Et →"}
      </button>
    </form>
  );
}


function IllustrationVisual({ src, bg }: { src: string; bg: string }) {
  return (
    <div className={`w-full h-full ${bg} flex items-center justify-center p-8`}>
      <img src={src} alt="" className="w-full h-full object-contain drop-shadow-lg" />
    </div>
  );
}

const FEATURES = [
  {
    eyebrow: "Plan Editörü",
    title: "Masanızı sürükle, bırak, kaydet.",
    desc: "Canvas üzerinde masaları özgürce yerleştirin. Kare, yuvarlak, loca, bar — her şekli destekler. Dekorasyon elemanları (kapı, pencere, bitki) ile gerçekçi bir plan oluşturun.",
    visual: <IllustrationVisual src="/undraw_floor_plan.svg" bg="bg-gradient-to-br from-indigo-50 via-indigo-100 to-purple-100" />,
  },
  {
    eyebrow: "Rezervasyon",
    title: "Tüm rezervasyonlar tek ekranda.",
    desc: "Günlük takvim görünümü, otomatik çakışma kontrolü, müşteri notları. Masanın durumunu bir bakışta görün: boş, rezerve, geldi veya gelmedi.",
    visual: <IllustrationVisual src="/undraw_booking.svg" bg="bg-gradient-to-br from-emerald-50 to-teal-100" />,
  },
  {
    eyebrow: "Günlük Düzenlemeler",
    title: "Özel gün, özel düzen — asla çakışma yok.",
    desc: "Yılbaşı, sevgililer günü veya özel etkinlikler için masaları yeniden dizin. Varsayılan planınız hiç bozulmaz; geçici düzen sadece o güne uygulanır.",
    visual: <IllustrationVisual src="/undraw_schedule.svg" bg="bg-gradient-to-br from-amber-50 to-orange-100" />,
  },
  {
    eyebrow: "Çoklu Salon",
    title: "Ana salon, bahçe, teras — hepsi burada.",
    desc: "Her salon için bağımsız masa planı, ayrı rezervasyon listesi. Salonlar arasında tek tıkla geçiş yapın. Sınırsız salon desteği.",
    visual: <IllustrationVisual src="/undraw_building.svg" bg="bg-gradient-to-br from-rose-50 to-pink-100" />,
  },
];


const PRICING = [
  {
    name: "Başlangıç", price: "₺0", sub: "Sonsuza kadar ücretsiz",
    features: ["1 salon", "10 masa", "Temel rezervasyon", "7 gün geçmiş"],
    cta: "Ücretsiz Başla", ctaHref: "/register", highlight: false,
  },
  {
    name: "Profesyonel", price: "₺299", sub: "14 gün ücretsiz dene",
    features: ["3 salon", "50 masa", "Gelişmiş rezervasyon", "Sınırsız geçmiş", "Öncelikli destek", "Çakışma uyarıları"],
    cta: "14 Gün Ücretsiz Dene", ctaHref: "/register", highlight: true,
  },
  {
    name: "İşletme", price: "₺599", sub: "Büyük işletmeler için",
    features: ["Sınırsız salon", "Sınırsız masa", "API erişimi", "Özel destek hattı", "Beyaz etiket", "Kapora sistemi"],
    cta: "İletişime Geç", ctaHref: null, highlight: false,
  },
];

// ── Ana component ───────────────────────────────────────────────────────────
export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Reveal refs
  const heroRef    = useReveal<HTMLDivElement>();
  const priceRef   = useReveal<HTMLDivElement>();
  const faqRef     = useReveal<HTMLDivElement>();
  const demoRef    = useReveal<HTMLDivElement>();

  // Feature item refs for sticky visual switching
  const featureItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observers = featureItemRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveFeature(i); },
        { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(obs => obs?.disconnect());
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
      <style>{STYLES}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-md bg-white/80 shadow-sm border-b border-stone-200/60"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black text-stone-900 tracking-tight">Rezerve</Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8 text-sm text-stone-500">
            <button onClick={() => scrollTo("ozellikler")} className="hover:text-stone-900 transition-colors">Özellikler</button>
            <button onClick={() => scrollTo("fiyatlandirma")} className="hover:text-stone-900 transition-colors">Fiyatlandırma</button>
            <button onClick={() => scrollTo("sss")} className="hover:text-stone-900 transition-colors">SSS</button>
            <Link to="/login" className="hover:text-stone-900 transition-colors">Giriş Yap</Link>
            <button onClick={() => scrollTo("demo")} className="cta-black text-sm px-5 py-2">Demo Talep Et</button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-stone-600 rounded-lg hover:bg-stone-100" onClick={() => setMobileOpen(v => !v)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-stone-200 bg-white/95 backdrop-blur-md px-5 py-4 space-y-1 text-sm">
            {["ozellikler:Özellikler", "fiyatlandirma:Fiyatlandırma", "sss:SSS"].map(s => {
              const [id, label] = s.split(":");
              return (
                <button key={id} onClick={() => scrollTo(id)}
                  className="block w-full text-left text-stone-700 py-2.5 px-2 rounded-lg hover:bg-stone-50 transition-colors">
                  {label}
                </button>
              );
            })}
            <Link to="/login" className="block text-stone-700 py-2.5 px-2 rounded-lg hover:bg-stone-50">Giriş Yap</Link>
            <Link to="/register" className="block text-center bg-stone-900 text-white py-3 rounded-xl font-semibold mt-2">
              Ücretsiz Başla
            </Link>
            <button onClick={() => scrollTo("demo")} className="block w-full text-center border border-stone-200 text-stone-700 py-3 rounded-xl font-semibold hover:bg-stone-50">
              Demo Talep Et
            </button>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-8 md:pt-36 md:pb-12 px-4 md:px-8 text-center max-w-5xl mx-auto">
        <div ref={heroRef} className="reveal in-view">
          <div className="inline-flex items-center gap-2 bg-stone-100 text-stone-600 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-stone-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Şu an beta — ilk 100 restoran ücretsiz
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 leading-[1.08] tracking-tight mb-4 md:mb-6">
            Rezervasyonu<br />
            <span>basitleştirin.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
            Masa planı editörü, rezervasyon yönetimi ve çakışma kontrolü.<br className="hidden sm:block" />
            Tek platform. Sıfır Excel. Tam kontrol.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="cta-black w-full sm:w-auto">Ücretsiz Başla →</Link>
            <button onClick={() => scrollTo("demo")} className="cta-outline w-full sm:w-auto">Demo Talep Et</button>
          </div>

          <img src="/screenshot.png" alt="Rezerve uygulama görünümü" className="mx-auto mt-8 md:mt-16 w-full max-w-5xl rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200 px-4 md:px-0" />
        </div>

      </section>

      {/* ── ÖZELLİKLER (sticky) ─────────────────────────────────────────────── */}
      <section id="ozellikler" className="pt-8 pb-16 md:pt-12 md:pb-28 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Section header */}
          <div className="reveal in-view text-center mb-12 md:mb-20">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Özellikler</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 mt-3 mb-4 tracking-tight">
              Her şey tek panelde
            </h2>
            <p className="text-stone-500 text-base md:text-lg max-w-xl mx-auto">
              Excel tablolarına, WhatsApp kaosuna ve kağıt defterlere son.
            </p>
          </div>

          {/* Sticky two-column layout — desktop only */}
          <div className="hidden lg:grid grid-cols-2 gap-16 items-start">
            {/* Left: scrollable features */}
            <div>
              {FEATURES.map((f, i) => (
                <div
                  key={f.eyebrow}
                  ref={el => { featureItemRefs.current[i] = el; }}
                  className="min-h-[65vh] flex flex-col justify-center py-12"
                >
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">{f.eyebrow}</span>
                  <h3 className="text-3xl font-black text-stone-900 mb-4 tracking-tight leading-tight">{f.title}</h3>
                  <p className="text-stone-500 text-base leading-relaxed max-w-sm">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Right: sticky visual */}
            <div className="sticky top-24 h-[calc(65vh-2rem)]">
              <div className="relative h-full rounded-2xl overflow-hidden shadow-xl border border-stone-200">
                {FEATURES.map((f, i) => (
                  <div key={f.eyebrow} className={`feat-visual ${activeFeature === i ? "active" : ""}`}>
                    {f.visual}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: stacked cards — başlık+açıklama üstte, görsel altta */}
          <div className="lg:hidden flex flex-col gap-10">
            {FEATURES.map((f) => (
              <div key={f.eyebrow}>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{f.eyebrow}</span>
                <h3 className="text-xl font-black text-stone-900 mt-2 mb-2">{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed mb-4">{f.desc}</p>
                <div className="h-56 rounded-2xl border border-stone-200 overflow-hidden">{f.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FİYATLANDIRMA ───────────────────────────────────────────────────── */}
      <section id="fiyatlandirma" className="py-16 md:py-32 px-4 md:px-8 bg-white border-y border-stone-100">
        <div ref={priceRef} className="reveal max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Fiyatlandırma</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 mt-3 mb-4 tracking-tight">
              Basit ve şeffaf
            </h2>
            <p className="text-stone-500 text-base md:text-lg">Gizli ücret yok. İstediğiniz zaman plan değiştirin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col transition-shadow ${
                  plan.highlight
                    ? "bg-stone-900 text-white shadow-2xl ring-2 ring-stone-900"
                    : "bg-stone-50 border border-stone-200"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      En Popüler
                    </span>
                  </div>
                )}
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.highlight ? "text-stone-400" : "text-stone-400"}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-5xl font-black ${plan.highlight ? "text-white" : "text-stone-900"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-stone-400" : "text-stone-400"}`}>/ay</span>
                </div>
                <p className={`text-sm mb-8 ${plan.highlight ? "text-stone-400" : "text-stone-400"}`}>{plan.sub}</p>

                <ul className="space-y-3 mb-10 flex-1">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-center gap-3 text-sm">
                      <svg className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-indigo-400" : "text-emerald-500"}`}
                        viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2,8 6,12 14,4" />
                      </svg>
                      <span className={plan.highlight ? "text-stone-300" : "text-stone-600"}>{feat}</span>
                    </li>
                  ))}
                </ul>

                {plan.ctaHref ? (
                  <Link
                    to={plan.ctaHref}
                    className={`block text-center font-semibold py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[.98] ${
                      plan.highlight
                        ? "bg-white text-stone-900 hover:bg-stone-100"
                        : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => scrollTo("demo")}
                    className="block w-full text-center border border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 font-semibold py-3 rounded-xl text-sm transition-all hover:scale-[1.02]"
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SSS ─────────────────────────────────────────────────────────────── */}
      <section id="sss" className="py-16 md:py-32 px-4 md:px-8 bg-stone-50">
        <div ref={faqRef} className="reveal max-w-2xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">SSS</span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 mt-3 tracking-tight">
              Sıkça sorulanlar
            </h2>
          </div>
          <div>
            <FaqItem q="Ücretsiz plan ne kadar süre kullanılabilir?"
              a="Süresiz. Ücretsiz plan için herhangi bir zaman sınırı yok. 1 salon ve 10 masa ile sonsuza kadar kullanabilirsiniz." />
            <FaqItem q="Verilerim güvende mi?"
              a="Evet. Verileriniz Supabase altyapısında, şifreli bağlantıyla (SSL/TLS) saklanır. Her restoranın verisine yalnızca o restoran sahibi erişebilir." />
            <FaqItem q="Kapora sistemi ne zaman gelecek?"
              a="Müşterilerin rezervasyon sırasında kapora ödeyebileceği sistem 2025 içinde planlanıyor. Erken erişim için bize ulaşın." />
            <FaqItem q="Mevcut sistemimden geçiş yapabilir miyim?"
              a="Evet. Excel, Google Sheets veya başka bir sistemden geçiş için destek ekibimiz yardımcı olur. Demo talep ettiğinizde bu konuyu da ele alabiliriz." />
            <FaqItem q="Hangi cihazlarda çalışır?"
              a="Tüm modern tarayıcılarda (Chrome, Safari, Firefox, Edge) çalışır. Tablet ve masaüstü için optimize edilmiştir, mobil uyumludur." />
            <FaqItem q="İptal etmek istesem ne olur?"
              a="İstediğiniz zaman iptal edebilirsiniz, bağlayıcılık yok. Verilerinizi dışa aktarma seçeneği de sunuyoruz." />
          </div>
        </div>
      </section>

      {/* ── DEMO FORM ───────────────────────────────────────────────────────── */}
      <section id="demo" className="py-16 md:py-32 px-4 md:px-8 bg-white border-t border-stone-100">
        <div ref={demoRef} className="reveal max-w-2xl mx-auto text-center">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Demo</span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-stone-900 mt-3 mb-4 tracking-tight">
            Canlı görmek ister misiniz?
          </h2>
          <p className="text-stone-500 text-base md:text-lg mb-8 md:mb-10">
            Formu doldurun, 24 saat içinde dönelim.
          </p>
          <DemoForm />
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-100 bg-stone-50 py-8 md:py-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <div className="flex items-center gap-3">
            <span className="font-black text-stone-900 text-base">Rezerve</span>
            <span>© 2025 Tüm hakları saklıdır.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-stone-600 transition-colors">Gizlilik Politikası</a>
            <a href="#" className="hover:text-stone-600 transition-colors">Kullanım Koşulları</a>
            <Link to="/login" className="hover:text-stone-600 transition-colors">Giriş Yap</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
