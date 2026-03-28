import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const STYLES = `
  .reveal { opacity: 0; transform: translateY(40px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .reveal-d1.visible { transition-delay: .1s; }
  .reveal-d2.visible { transition-delay: .2s; }
  .reveal-d3.visible { transition-delay: .3s; }
  .reveal-d4.visible { transition-delay: .4s; }

  .faq-body { overflow: hidden; max-height: 0; transition: max-height .35s cubic-bezier(.22,1,.36,1); }
  .faq-body.open { max-height: 200px; }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  @keyframes scrollDown {
    0% { transform: scaleY(0); transform-origin: top; }
    50% { transform: scaleY(1); transform-origin: top; }
    51% { transform: scaleY(1); transform-origin: bottom; }
    100% { transform: scaleY(0); transform-origin: bottom; }
  }

  :root {
    --lp-bg: #1a1917;
    --lp-bg2: #2c2a28;
    --lp-surface: #f5f5f0;
    --lp-lime: #d6ff3f;
    --lp-lime-hover: #c8f032;
    --lp-lime-soft: rgba(214,255,63,.12);
    --lp-text: #f5f5f0;
    --lp-text-muted: rgba(245,245,240,.55);
    --lp-text-dark: #1a1a1a;
    --lp-radius: 20px;
    --lp-radius-lg: 28px;
    --lp-max-w: 1200px;
  }

  .lp-body { font-family: 'Outfit', sans-serif; background: var(--lp-bg); color: var(--lp-text); -webkit-font-smoothing: antialiased; overflow-x: hidden; }

  /* NAV */
  .lp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; transition: background .3s, backdrop-filter .3s; }
  .lp-nav.scrolled { background: rgba(26,25,23,.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(245,245,240,.06); }
  .lp-nav__inner { max-width: var(--lp-max-w); margin: 0 auto; padding: 0 32px; height: 72px; display: flex; align-items: center; justify-content: space-between; }
  .lp-nav__logo { font-size: 22px; font-weight: 900; letter-spacing: -.02em; }
  .lp-nav__logo span { color: var(--lp-lime); }
  .lp-nav__right { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(26,25,23,.45); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 999px; border: 1px solid rgba(245,245,240,.08); box-shadow: 0 4px 24px rgba(0,0,0,.25); }
  .lp-nav__login { font-size: 13px; font-weight: 400; color: rgba(245,245,240,.65); padding: 8px 18px; border-radius: 999px; transition: color .2s, background .2s; }
  .lp-nav__login:hover { color: var(--lp-text); background: rgba(245,245,240,.08); }
  .lp-nav__cta { background: var(--lp-lime); color: var(--lp-text-dark); padding: 8px 20px; border-radius: 999px; font-size: 13px; font-weight: 700; transition: transform .15s, background .15s; }
  .lp-nav__cta:hover { background: var(--lp-lime-hover); transform: scale(1.03); }

  /* Center nav menu */
  .lp-nav__center { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 101; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(26,25,23,.45); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 999px; border: 1px solid rgba(245,245,240,.08); box-shadow: 0 4px 24px rgba(0,0,0,.25); }
  .lp-nav__center-link { font-size: 13px; font-weight: 400; color: rgba(245,245,240,.65); padding: 8px 18px; border-radius: 999px; transition: color .2s, background .2s; letter-spacing: .01em; }
  .lp-nav__center-link:hover { color: var(--lp-text); background: rgba(245,245,240,.08); }

  /* HERO */
  .lp-hero { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; overflow: hidden; }
  .lp-hero__bg { position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80') center/cover no-repeat; filter: brightness(.35); }
  .lp-hero__overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(26,25,23,.3) 0%, rgba(26,25,23,.7) 100%); }
  .lp-hero__content { position: relative; z-index: 2; padding: 0 24px; max-width: 800px; }
  .lp-hero__title { font-size: clamp(40px, 7vw, 80px); font-weight: 900; line-height: 1.05; letter-spacing: -.03em; margin-bottom: 24px; color: #fff; }
  .lp-hero__sub { font-size: clamp(16px, 2vw, 20px); font-weight: 300; color: rgba(255,255,255,.7); line-height: 1.6; margin-bottom: 40px; max-width: 540px; margin-left: auto; margin-right: auto; }
  .lp-hero__actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .lp-btn-lime { background: var(--lp-lime); color: var(--lp-text-dark); padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 700; transition: transform .15s, background .15s, box-shadow .15s; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; font-family: inherit; letter-spacing: .01em; }
  .lp-btn-lime:hover { background: var(--lp-lime-hover); transform: translateY(-2px); box-shadow: 0 8px 32px rgba(214,255,63,.25); }
  .lp-btn-outline { border: 1.5px solid rgba(245,245,240,.25); color: var(--lp-text); padding: 16px 36px; border-radius: 14px; font-size: 16px; font-weight: 400; transition: border-color .2s, transform .15s; display: inline-flex; align-items: center; justify-content: center; background: transparent; cursor: pointer; font-family: inherit; }
  .lp-btn-outline:hover { border-color: rgba(245,245,240,.5); transform: translateY(-2px); }

  /* Scroll indicator */
  .lp-hero__scroll { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--lp-text-muted); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
  .lp-hero__scroll-line { width: 1px; height: 40px; background: linear-gradient(180deg, var(--lp-lime), transparent); animation: scrollDown 2s ease-in-out infinite; }

  /* SECTIONS */
  .lp-section { padding: 120px 32px; max-width: var(--lp-max-w); margin: 0 auto; }
  .lp-section-label { display: inline-block; font-size: 12px; font-weight: 700; color: var(--lp-lime); letter-spacing: .15em; text-transform: uppercase; margin-bottom: 16px; }
  .lp-section-title { font-size: clamp(32px, 5vw, 56px); font-weight: 900; line-height: 1.1; letter-spacing: -.03em; margin-bottom: 20px; }
  .lp-section-sub { font-size: 18px; font-weight: 300; color: var(--lp-text-muted); line-height: 1.6; max-width: 520px; }

  /* FEATURES */
  .lp-features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 64px; }
  .lp-feat-card { background: var(--lp-bg2); border-radius: var(--lp-radius-lg); padding: 48px 40px; border: 1px solid rgba(245,245,240,.06); transition: transform .3s, border-color .3s; position: relative; overflow: hidden; }
  .lp-feat-card:hover { transform: translateY(-4px); border-color: rgba(214,255,63,.15); }
  .lp-feat-card--wide { grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .lp-feat-icon { width: 48px; height: 48px; background: var(--lp-lime-soft); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--lp-lime); }
  .lp-feat-card h3 { font-size: 24px; font-weight: 900; letter-spacing: -.02em; margin-bottom: 12px; color: var(--lp-text); }
  .lp-feat-card p { font-size: 15px; font-weight: 300; color: var(--lp-text-muted); line-height: 1.7; }
  .lp-feat-visual { background: rgba(245,245,240,.04); border-radius: var(--lp-radius); height: 200px; display: flex; align-items: center; justify-content: center; color: var(--lp-text-muted); font-size: 13px; border: 1px solid rgba(245,245,240,.06); }

  /* PRICING */
  .lp-pricing-section { background: var(--lp-bg2); padding: 120px 32px; margin-top: 120px; }
  .lp-pricing-inner { max-width: var(--lp-max-w); margin: 0 auto; text-align: center; }
  .lp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 64px; }
  .lp-price-card { background: rgba(245,245,240,.04); border: 1px solid rgba(245,245,240,.08); border-radius: var(--lp-radius-lg); padding: 40px 32px; text-align: left; position: relative; transition: border-color .3s, transform .3s; }
  .lp-price-card:hover { border-color: rgba(214,255,63,.2); transform: translateY(-4px); }
  .lp-price-card--pop { background: linear-gradient(135deg, rgba(214,255,63,.08), rgba(214,255,63,.02)); border-color: rgba(214,255,63,.3); }
  .lp-price-card--pop::before { content: 'En Popüler'; position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--lp-lime); color: var(--lp-text-dark); font-size: 11px; font-weight: 700; padding: 6px 20px; border-radius: 999px; letter-spacing: .05em; text-transform: uppercase; }
  .lp-price-card__name { font-size: 14px; font-weight: 700; color: var(--lp-lime); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 8px; }
  .lp-price-card__desc { font-size: 14px; color: var(--lp-text-muted); margin-bottom: 24px; font-weight: 300; }
  .lp-price-card__price { font-size: 52px; font-weight: 900; letter-spacing: -.03em; color: var(--lp-text); margin-bottom: 4px; }
  .lp-price-card__period { font-size: 14px; color: var(--lp-text-muted); font-weight: 300; margin-bottom: 32px; }
  .lp-price-card__features { list-style: none; margin-bottom: 32px; padding: 0; }
  .lp-price-card__features li { display: flex; align-items: center; gap: 12px; font-size: 14px; color: rgba(245,245,240,.7); padding: 8px 0; font-weight: 300; }
  .lp-price-card__features li::before { content: ''; width: 18px; height: 18px; border-radius: 50%; background: var(--lp-lime-soft); flex-shrink: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' stroke='%23d6ff3f' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='3,8 6.5,12 13,4'/%3E%3C/svg%3E"); background-size: 10px; background-position: center; background-repeat: no-repeat; }
  .lp-price-card__cta { display: block; width: 100%; text-align: center; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700; transition: transform .15s, background .15s; border: none; cursor: pointer; font-family: inherit; }
  .lp-price-card__cta--lime { background: var(--lp-lime); color: var(--lp-text-dark); }
  .lp-price-card__cta--lime:hover { background: var(--lp-lime-hover); transform: scale(1.02); }
  .lp-price-card__cta--ghost { border: 1px solid rgba(245,245,240,.15); color: var(--lp-text); background: transparent; }
  .lp-price-card__cta--ghost:hover { border-color: rgba(245,245,240,.3); transform: scale(1.02); }

  /* DEMO FORM */
  .lp-demo-section { padding: 120px 32px; max-width: 640px; margin: 0 auto; text-align: center; }
  .lp-demo-form { display: flex; flex-direction: column; gap: 16px; margin-top: 48px; text-align: left; }
  .lp-demo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .lp-demo-label { font-size: 12px; font-weight: 700; color: var(--lp-text-muted); letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; }
  .lp-demo-input { width: 100%; background: var(--lp-bg2); border: 1px solid rgba(245,245,240,.1); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: var(--lp-text); font-family: inherit; outline: none; transition: border-color .2s; }
  .lp-demo-input::placeholder { color: rgba(245,245,240,.25); }
  .lp-demo-input:focus { border-color: var(--lp-lime); }

  /* SSS */
  .lp-faq-item { border-bottom: 1px solid rgba(245,245,240,.08); }
  .lp-faq-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 20px 0; text-align: left; color: var(--lp-text); font-weight: 500; font-size: 16px; background: none; border: none; cursor: pointer; font-family: inherit; }
  .lp-faq-btn:hover { color: var(--lp-lime); }
  .lp-faq-chevron { width: 16px; height: 16px; transition: transform .3s; flex-shrink: 0; margin-left: 16px; color: var(--lp-text-muted); }
  .lp-faq-chevron.open { transform: rotate(180deg); }

  /* FOOTER */
  .lp-footer { border-top: 1px solid rgba(245,245,240,.06); padding: 48px 32px; }
  .lp-footer__inner { max-width: var(--lp-max-w); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
  .lp-footer__brand { font-size: 18px; font-weight: 900; }
  .lp-footer__brand span { color: var(--lp-lime); }
  .lp-footer__copy { font-size: 13px; color: var(--lp-text-muted); }
  .lp-footer__links { display: flex; gap: 24px; }
  .lp-footer__links a { font-size: 13px; color: var(--lp-text-muted); transition: color .2s; text-decoration: none; }
  .lp-footer__links a:hover { color: var(--lp-text); }

  @media (max-width: 768px) {
    .lp-nav__center { display: none; }
    .lp-section { padding: 80px 20px; }
    .lp-features-grid { grid-template-columns: 1fr; }
    .lp-feat-card--wide { grid-column: span 1; grid-template-columns: 1fr; }
    .lp-pricing-grid { grid-template-columns: 1fr; }
    .lp-pricing-section { padding: 80px 20px; }
    .lp-demo-row { grid-template-columns: 1fr; }
    .lp-footer__inner { flex-direction: column; gap: 16px; text-align: center; }
  }
`;

const PRICING = [
  {
    name: "Başlangıç", price: "₺0", period: "Sonsuza kadar ücretsiz",
    desc: "Küçük restoranlar için",
    features: ["1 salon", "10 masa", "Temel rezervasyon", "7 gün geçmiş"],
    cta: "Ücretsiz Başla", ctaStyle: "ghost", ctaHref: "/register", highlight: false,
  },
  {
    name: "Profesyonel", price: "₺299", period: "/ay · 14 gün ücretsiz",
    desc: "Büyüyen restoranlar için",
    features: ["3 salon", "50 masa", "Gelişmiş rezervasyon", "Sınırsız geçmiş", "Öncelikli destek", "Çakışma uyarıları"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: "lime", ctaHref: "/register", highlight: true,
  },
  {
    name: "İşletme", price: "₺599", period: "/ay",
    desc: "Büyük işletmeler için",
    features: ["Sınırsız salon", "Sınırsız masa", "API erişimi", "Özel destek hattı", "Beyaz etiket", "Kapora sistemi"],
    cta: "İletişime Geç", ctaStyle: "ghost", ctaHref: null, highlight: false,
  },
];

const FAQ = [
  { q: "Ücretsiz plan ne kadar süre kullanılabilir?", a: "Süresiz. Ücretsiz plan için herhangi bir zaman sınırı yok. 1 salon ve 10 masa ile sonsuza kadar kullanabilirsiniz." },
  { q: "Verilerim güvende mi?", a: "Evet. Verileriniz Supabase altyapısında, şifreli bağlantıyla saklanır. Her restoranın verisine yalnızca o restoran sahibi erişebilir." },
  { q: "Kapora sistemi ne zaman gelecek?", a: "Müşterilerin rezervasyon sırasında kapora ödeyebileceği sistem 2025 içinde planlanıyor. Erken erişim için bize ulaşın." },
  { q: "Mevcut sistemimden geçiş yapabilir miyim?", a: "Evet. Excel, Google Sheets veya başka bir sistemden geçiş için destek ekibimiz yardımcı olur." },
  { q: "Hangi cihazlarda çalışır?", a: "Tüm modern tarayıcılarda çalışır. Tablet ve masaüstü için optimize edilmiştir." },
  { q: "İptal etmek istesem ne olur?", a: "İstediğiniz zaman iptal edebilirsiniz, bağlayıcılık yok. Verilerinizi dışa aktarma seçeneği de sunuyoruz." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-faq-item">
      <button className="lp-faq-btn" onClick={() => setOpen(v => !v)}>
        <span>{q}</span>
        <svg className={`lp-faq-chevron ${open ? "open" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="3,6 8,11 13,6" />
        </svg>
      </button>
      <div className={`faq-body ${open ? "open" : ""}`}>
        <p style={{ paddingBottom: 20, color: "var(--lp-text-muted)", fontSize: 14, lineHeight: 1.7, fontWeight: 300 }}>{a}</p>
      </div>
    </div>
  );
}

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
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <div style={{ width: 56, height: 56, background: "var(--lp-lime-soft)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--lp-lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
        </div>
        <p style={{ fontSize: 20, fontWeight: 900 }}>Teşekkürler!</p>
        <p style={{ color: "var(--lp-text-muted)", marginTop: 8, fontSize: 14 }}>En kısa sürede size dönüş yapacağız.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="lp-demo-form">
      {error && <p style={{ color: "#f87171", fontSize: 13, background: "rgba(248,113,113,.1)", padding: 12, borderRadius: 12 }}>{error}</p>}
      <div className="lp-demo-row">
        <div>
          <div className="lp-demo-label">Ad Soyad</div>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmet Yılmaz" className="lp-demo-input" />
        </div>
        <div>
          <div className="lp-demo-label">E-posta</div>
          <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmet@restoran.com" className="lp-demo-input" />
        </div>
      </div>
      <div className="lp-demo-row">
        <div>
          <div className="lp-demo-label">Restoran Adı</div>
          <input required value={form.restaurant} onChange={e => setForm(f => ({ ...f, restaurant: e.target.value }))} placeholder="Örnek Restaurant" className="lp-demo-input" />
        </div>
        <div>
          <div className="lp-demo-label">Telefon <span style={{ opacity: .4, textTransform: "none" as const, fontWeight: 300 }}>(opsiyonel)</span></div>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+90 5xx xxx xx xx" className="lp-demo-input" />
        </div>
      </div>
      <button disabled={loading} type="submit" className="lp-btn-lime" style={{ width: "100%", marginTop: 8 }}>
        {loading ? "Gönderiliyor..." : "Demo Talep Et →"}
      </button>
    </form>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useReveal();
  const featRef = useReveal();
  const priceRef = useReveal();
  const faqRef = useReveal();
  const demoRef = useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-body">
      <style>{STYLES}</style>

      {/* NAV */}
      <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="lp-nav__inner">
          <Link to="/" className="lp-nav__logo"><img src="/tablora-logo.png" alt="Tablora" style={{ height: 24 }} /></Link>
          <div className="lp-nav__right">
            <Link to="/login" className="lp-nav__login">Giriş Yap</Link>
            <Link to="/register" className="lp-nav__cta">Ücretsiz Başla</Link>
          </div>
        </div>
      </nav>
      <div className="lp-nav__center">
        <button className="lp-nav__center-link" onClick={() => scrollTo("ozellikler")}>Özellikler</button>
        <button className="lp-nav__center-link" onClick={() => scrollTo("fiyatlandirma")}>Fiyatlandırma</button>
        <button className="lp-nav__center-link" onClick={() => scrollTo("sss")}>SSS</button>
        <button className="lp-nav__center-link" onClick={() => scrollTo("demo")}>Demo</button>
      </div>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero__bg" />
        <div className="lp-hero__overlay" />
        <div className="lp-hero__content" ref={heroRef}>
          <h1 className="lp-hero__title">Rezervasyonu<br />basitleştirin.</h1>
          <p className="lp-hero__sub">Masa planı editörü, akıllı rezervasyon yönetimi ve çakışma kontrolü — tek platform, sıfır Excel.</p>
          <div className="lp-hero__actions">
            <Link to="/register" className="lp-btn-lime">Ücretsiz Başla →</Link>
            <button className="lp-btn-outline" onClick={() => scrollTo("demo")}>Demo Talep Et</button>
          </div>
        </div>
        <div className="lp-hero__scroll">
          <div className="lp-hero__scroll-line" />
          keşfet
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section" id="ozellikler">
        <div className="reveal" ref={featRef}>
          <span className="lp-section-label">Özellikler</span>
          <div className="lp-section-title">Her şey tek panelde.</div>
          <p className="lp-section-sub">Excel tablolarına, WhatsApp kaosuna ve kağıt defterlere son.</p>
        </div>
        <div className="lp-features-grid">
          <div className="lp-feat-card reveal reveal-d1">
            <div className="lp-feat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
            <h3>Sürükle & Bırak Editör</h3>
            <p>Canvas üzerinde masaları özgürce yerleştirin. Kare, yuvarlak, loca, bar — her şekli destekler.</p>
          </div>
          <div className="lp-feat-card reveal reveal-d2">
            <div className="lp-feat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
            <h3>Akıllı Rezervasyon</h3>
            <p>Günlük takvim, otomatik çakışma kontrolü, müşteri notları. Durumu bir bakışta görün.</p>
          </div>
          <div className="lp-feat-card reveal reveal-d3">
            <div className="lp-feat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
            <h3>Günlük Düzenlemeler</h3>
            <p>Özel gün, özel düzen. Yılbaşı veya etkinlikler için masaları yeniden dizin — varsayılan plan hiç bozulmaz.</p>
          </div>
          <div className="lp-feat-card reveal reveal-d4">
            <div className="lp-feat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg></div>
            <h3>Çoklu Salon</h3>
            <p>Ana salon, bahçe, teras — hepsi burada. Her salon için bağımsız plan ve rezervasyon listesi.</p>
          </div>
          <div className="lp-feat-card lp-feat-card--wide reveal">
            <div>
              <div className="lp-feat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
              <h3>Dekorasyon Elemanları</h3>
              <p>Kapı, pencere, bitki, bar tezgahı, havuz, kolon — gerçekçi bir salon planı oluşturun. Döndürme ve boyutlandırma desteği.</p>
            </div>
            <div className="lp-feat-visual" style={{ padding: 0, overflow: "hidden", height: "auto" }}>
              <img src="/2.png" alt="Tablora uygulama görünümü" style={{ width: "100%", borderRadius: "var(--lp-radius)", display: "block" }} />
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-pricing-section" id="fiyatlandirma">
        <div className="lp-pricing-inner">
          <div className="reveal" ref={priceRef}>
            <span className="lp-section-label">Fiyatlandırma</span>
            <div className="lp-section-title">Basit ve şeffaf.</div>
            <p className="lp-section-sub" style={{ margin: "0 auto" }}>Gizli ücret yok. İstediğiniz zaman plan değiştirin.</p>
          </div>
          <div className="lp-pricing-grid">
            {PRICING.map(plan => (
              <div key={plan.name} className={`lp-price-card reveal ${plan.highlight ? "lp-price-card--pop" : ""}`}>
                <div className="lp-price-card__name">{plan.name}</div>
                <div className="lp-price-card__desc">{plan.desc}</div>
                <div className="lp-price-card__price">{plan.price}</div>
                <div className="lp-price-card__period">{plan.period}</div>
                <ul className="lp-price-card__features">
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                {plan.ctaHref ? (
                  <Link to={plan.ctaHref} className={`lp-price-card__cta lp-price-card__cta--${plan.ctaStyle}`}>{plan.cta}</Link>
                ) : (
                  <button onClick={() => scrollTo("demo")} className={`lp-price-card__cta lp-price-card__cta--${plan.ctaStyle}`}>{plan.cta}</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SSS */}
      <section className="lp-section" id="sss">
        <div className="reveal" ref={faqRef}>
          <span className="lp-section-label">SSS</span>
          <div className="lp-section-title">Sıkça sorulanlar</div>
        </div>
        <div style={{ maxWidth: 640, marginTop: 48 }}>
          {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* DEMO */}
      <section className="lp-demo-section" id="demo">
        <div className="reveal" ref={demoRef}>
          <span className="lp-section-label">Demo</span>
          <div className="lp-section-title">Canlı görmek<br />ister misiniz?</div>
          <p className="lp-section-sub" style={{ margin: "0 auto" }}>Formu doldurun, 24 saat içinde dönelim.</p>
        </div>
        <DemoForm />
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand"><img src="/tablora-logo.png" alt="Tablora" style={{ height: 20 }} /></div>
          <div className="lp-footer__copy">© 2026 Tüm hakları saklıdır.</div>
          <div className="lp-footer__links">
            <a href="#">Gizlilik Politikası</a>
            <a href="#">Kullanım Koşulları</a>
            <Link to="/login">Giriş Yap</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
