import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { createRestaurant, getRestaurantForUser, setRestaurantId } from "../lib/api";

interface AuthState {
  user: User | null;
  restaurantId: string | null;
  restaurantName: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, restaurantId: null, restaurantName: null, loading: true });

  useEffect(() => {
    async function handleUser(user: User) {
      try {
        const restaurant = await getRestaurantForUser(user.id);
        if (restaurant) {
          setRestaurantId(restaurant.id);
          setAuthState({ user, restaurantId: restaurant.id, restaurantName: restaurant.name, loading: false });
        } else {
          // OAuth kullanıcısı (Google vb.) için otomatik restoran oluştur
          const isOAuth = user.app_metadata?.provider !== "email";
          if (isOAuth) {
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Restoranım";
            const created = await createRestaurant(user.id, name);
            setRestaurantId(created.id);
            setAuthState({ user, restaurantId: created.id, restaurantName: created.name, loading: false });
          } else {
            // E-posta kullanıcısı — restoran yok (kayıt yarım kalmış)
            setAuthState({ user, restaurantId: null, restaurantName: null, loading: false });
          }
        }
      } catch {
        setAuthState({ user, restaurantId: null, restaurantName: null, loading: false });
      }
    }

    // Sadece onAuthStateChange kullan — Supabase v2'de INITIAL_SESSION event'i
    // mevcut session'ı otomatik yayınlar, getSession() ayrıca çağırmak race condition yaratır.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleUser(session.user);
      } else {
        setAuthState({ user: null, restaurantId: null, restaurantName: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    localStorage.removeItem("rezerve-v1");
    await supabase.auth.signOut();
    setAuthState({ user: null, restaurantId: null, restaurantName: null, loading: false });
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
      options: { redirectTo: window.location.origin + "/app" },
    });
    if (error) throw error;
  }

  return { ...authState, signIn, signOut, signUp, signInWithGoogle };
}
