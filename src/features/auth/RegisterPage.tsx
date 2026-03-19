import { useState } from "react";

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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center space-y-4">
            <div className="text-4xl">✉️</div>
            <h2 className="text-white font-semibold text-lg">E-postanı Onayla</h2>
            <p className="text-gray-400 text-sm">
              <strong className="text-white">{email}</strong> adresine onay linki gönderdik.
              Giriş yapmadan önce e-postanı onaylamalısın.
            </p>
            <button
              onClick={onGoToLogin}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Giriş sayfasına dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Rezerve</h1>
          <p className="text-gray-400 mt-2 text-sm">Restoranınla birlikte başla</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <h2 className="text-white font-semibold text-lg">Kayıt Ol</h2>

          {error ? (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-gray-400 text-sm">Restoran Adı</label>
            <input
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Örnek: Deniz Restaurant"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-sm">E-posta</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="restoran@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-gray-400 text-sm">Şifre</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
          </button>

          <p className="text-center text-gray-500 text-sm">
            Zaten hesabın var mı?{" "}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Giriş Yap
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function translateError(message: string): string {
  if (message.includes("User already registered")) return "Bu e-posta adresi zaten kayıtlı.";
  if (message.includes("Password should be")) return "Şifre en az 6 karakter olmalı.";
  if (message.includes("Unable to validate email")) return "Geçerli bir e-posta adresi gir.";
  if (message.includes("Too many requests")) return "Çok fazla deneme. Biraz bekle.";
  return message;
}
