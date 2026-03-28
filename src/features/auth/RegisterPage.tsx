import { useState } from "react";
import { Link } from "react-router-dom";

interface RegisterPageProps {
  onRegister: (email: string, password: string, restaurantName: string) => Promise<void>;
  onGoToLogin: () => void;
  onGoogleSignIn: () => void;
}

export function RegisterPage({ onRegister, onGoToLogin, onGoogleSignIn }: RegisterPageProps) {
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      await onRegister(email, password, restaurantName);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? "";
      setError(msg ? translateError(msg) : "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700, color: "rgba(245,245,240,.55)",
    letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#1a1917", border: "1px solid rgba(245,245,240,.1)",
    borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#f5f5f0",
    fontFamily: "'Outfit', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 16,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1a1917", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#2c2a28", borderRadius: 28, border: "1px solid rgba(245,245,240,.06)", padding: "48px 40px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/">
            <img src="/tablora-logo.png" alt="Tablora" style={{ height: 32, margin: "0 auto", display: "block" }} />
          </Link>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f5f5f0", textAlign: "center", marginBottom: 8, letterSpacing: "-.02em" }}>Restoranınla birlikte başla</h1>
        <p style={{ fontSize: 14, color: "rgba(245,245,240,.55)", textAlign: "center", marginBottom: 32, fontWeight: 300 }}>Ücretsiz hesap oluştur, hemen başla</p>

        {/* Başarı ekranı */}
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f0", marginBottom: 8 }}>Doğrulama e-postası gönderildi!</h2>
            <p style={{ fontSize: 14, color: "rgba(245,245,240,.55)", lineHeight: 1.6 }}>
              <span style={{ color: "#f5f5f0", fontWeight: 500 }}>{email}</span> adresine bir onay linki gönderdik.
              Giriş yapmadan önce e-postanı onaylamalısın.
            </p>
            <button
              onClick={onGoToLogin}
              style={{ marginTop: 24, fontSize: 14, color: "#d6ff3f", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              Giriş sayfasına git →
            </button>
          </div>
        ) : (
          <>
            {/* Google butonu */}
            <button
              type="button"
              onClick={onGoogleSignIn}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "13px 16px", background: "transparent", border: "1px solid rgba(245,245,240,.15)",
                borderRadius: 12, color: "#f5f5f0", fontSize: 14, fontWeight: 500,
                fontFamily: "'Outfit', sans-serif", cursor: "pointer", marginBottom: 24,
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google ile devam et
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(245,245,240,.08)" }} />
              <span style={{ fontSize: 12, color: "rgba(245,245,240,.3)", fontWeight: 400 }}>veya e-posta ile kayıt ol</span>
              <div style={{ flex: 1, height: 1, background: "rgba(245,245,240,.08)" }} />
            </div>

            {/* Hata mesajı */}
            {error && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", borderRadius: 12, color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div>
                <label style={labelStyle}>Restoran Adı</label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Örnek: Deniz Restaurant"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>E-posta</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@restoran.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Şifre <span style={{ color: "rgba(245,245,240,.3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(en az 6 karakter)</span>
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Şifre Tekrar</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    ...inputStyle,
                    borderColor: confirmPassword && password !== confirmPassword ? "rgba(248,113,113,.5)" : "rgba(245,245,240,.1)",
                    marginBottom: confirmPassword && password !== confirmPassword ? 4 : 16,
                  }}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ fontSize: 12, color: "#f87171", marginBottom: 16 }}>Şifreler eşleşmiyor</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (Boolean(confirmPassword) && password !== confirmPassword)}
                style={{
                  width: "100%", padding: "14px", background: "#d6ff3f", color: "#1a1a1a",
                  borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading || (Boolean(confirmPassword) && password !== confirmPassword) ? 0.6 : 1,
                  marginTop: 8,
                }}
              >
                {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
              </button>
            </form>

            {/* Alt link */}
            <p style={{ textAlign: "center", fontSize: 14, color: "rgba(245,245,240,.55)", marginTop: 24 }}>
              Zaten hesabın var mı?{" "}
              <button
                type="button"
                onClick={onGoToLogin}
                style={{ background: "none", border: "none", color: "#d6ff3f", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}
              >
                Giriş Yap
              </button>
            </p>
          </>
        )}

        {/* Ana sayfa linki */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link to="/" style={{ fontSize: 13, color: "rgba(245,245,240,.3)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            ← Ana Sayfa
          </Link>
        </div>

      </div>
    </div>
  );
}

function translateError(message: string): string {
  if (message.includes("User already registered")) return "Bu e-posta adresi zaten kayıtlı.";
  if (message.includes("Password should be")) return "Şifre en az 6 karakter olmalı.";
  if (message.includes("Unable to validate email")) return "Geçerli bir e-posta adresi gir.";
  if (message.includes("Too many requests")) return "Çok fazla deneme. Lütfen biraz bekle.";
  return message;
}
