import { useState } from "react";
import { Link } from "react-router-dom";

interface RegisterPageProps {
  onRegister: (email: string, password: string, restaurantName: string) => Promise<void>;
  onGoToLogin: () => void;
}

export function RegisterPage({ onRegister, onGoToLogin }: RegisterPageProps) {
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    try {
      await onRegister(email, password, restaurantName);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? translateError(err.message) : "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Kart */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-extrabold text-indigo-600 tracking-tight">
              Rezerve
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-3">Restoranınla birlikte başla</h1>
            <p className="text-gray-500 text-sm mt-1">Ücretsiz hesap oluştur, hemen başla</p>
          </div>

          {/* Başarı mesajı */}
          {success ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Doğrulama e-postası gönderildi!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                <span className="font-medium text-gray-700">{email}</span> adresine bir onay linki gönderdik.
                Giriş yapmadan önce e-postanı onaylamalısın.
              </p>
              <button
                onClick={onGoToLogin}
                className="mt-6 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Giriş sayfasına git →
              </button>
            </div>
          ) : (
            <>
              {/* Hata mesajı */}
              {error && (
                <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Restoran Adı</label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Örnek: Deniz Restaurant"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-posta</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@restoran.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Şifre
                    <span className="text-gray-400 font-normal ml-1">(en az 6 karakter)</span>
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Hesap oluşturuluyor...
                    </span>
                  ) : "Kayıt Ol"}
                </button>
              </form>

              {/* Alt link */}
              <p className="text-center text-sm text-gray-500 mt-6">
                Zaten hesabın var mı?{" "}
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  Giriş Yap
                </button>
              </p>
            </>
          )}
        </div>

        {/* Ana sayfa linki */}
        <div className="text-center mt-5">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ana Sayfa
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
