import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { createRestaurant, getRestaurantForUser, setRestaurantId } from "../lib/api";

interface AuthState {
  user: User | null;
  restaurantId: string | null;
  restaurantName: string | null;
  loading: boolean;
  loadingMessage: string;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, restaurantId: null, restaurantName: null, loading: true, loadingMessage: "Yükleniyor..." });
  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function handleUser(user: User) {
      // Aynı kullanıcı için tekrar çalışma (SIGNED_IN + INITIAL_SESSION çakışması)
      if (handledUserIdRef.current === user.id) {
        console.log("[auth] handleUser skipped (already handled):", user.id);
        return;
      }
      handledUserIdRef.current = user.id;

      try {
        console.log("[auth] handleUser start:", Date.now());
        setAuthState(prev => ({ ...prev, loadingMessage: "Hesap bilgileri yükleniyor..." }));

        const restaurant = await getRestaurantForUser(user.id);
        console.log("[auth] getRestaurantForUser done:", Date.now(), restaurant ? "found" : "not found");

        if (restaurant) {
          setRestaurantId(restaurant.id);
          setAuthState({ user, restaurantId: restaurant.id, restaurantName: restaurant.name, loading: false, loadingMessage: "" });
        } else {
          // OAuth kullanıcısı (Google vb.) için otomatik restoran oluştur
          const isOAuth = user.app_metadata?.provider !== "email";
          if (isOAuth) {
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Restoranım";
            console.log("[auth] createRestaurant start:", Date.now());
            setAuthState(prev => ({ ...prev, loadingMessage: "Hesabınız hazırlanıyor..." }));
            const created = await createRestaurant(user.id, name);
            console.log("[auth] createRestaurant done:", Date.now());
            setRestaurantId(created.id);
            setAuthState({ user, restaurantId: created.id, restaurantName: created.name, loading: false, loadingMessage: "" });
          } else {
            // E-posta kullanıcısı — restoran yok (kayıt yarım kalmış)
            setAuthState({ user, restaurantId: null, restaurantName: null, loading: false, loadingMessage: "" });
          }
        }
      } catch {
        setAuthState({ user, restaurantId: null, restaurantName: null, loading: false, loadingMessage: "" });
      }
    }

    // Sadece onAuthStateChange kullan — Supabase v2'de INITIAL_SESSION event'i
    // mevcut session'ı otomatik yayınlar, getSession() ayrıca çağırmak race condition yaratır.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth] onAuthStateChange:", event, Date.now());
      if (session?.user) {
        handleUser(session.user);
      } else {
        setAuthState({ user: null, restaurantId: null, restaurantName: null, loading: false, loadingMessage: "" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    handledUserIdRef.current = null;
    localStorage.removeItem("rezerve-v1");
    await supabase.auth.signOut();
    setAuthState({ user: null, restaurantId: null, restaurantName: null, loading: false, loadingMessage: "" });
  }

  async function signUp(email: string, password: string, restaurantName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      const restaurant = await createRestaurant(data.user.id, restaurantName);
      setRestaurantId(restaurant.id);
      setAuthState(prev => ({ ...prev, restaurantId: restaurant.id, restaurantName: restaurant.name }));
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
    });
    if (error) throw error;
  }

  return { ...authState, signIn, signOut, signUp, signInWithGoogle };
}
