import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { createRestaurant, getRestaurantForUser, setRestaurantId } from "../lib/api";

interface AuthState {
  user: User | null;
  restaurantId: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, restaurantId: null, loading: true });

  useEffect(() => {
    async function handleUser(user: User) {
      try {
        const restaurant = await getRestaurantForUser(user.id);
        if (restaurant) {
          setRestaurantId(restaurant.id);
          setAuthState({ user, restaurantId: restaurant.id, loading: false });
        } else {
          // Kullanıcı var ama restoran yok (kayıt yarım kalmış)
          setAuthState({ user, restaurantId: null, loading: false });
        }
      } catch {
        // Restoran çekilemedi — auth yüklemeyi yine de bitir
        setAuthState({ user, restaurantId: null, loading: false });
      }
    }

    // Sadece onAuthStateChange kullan — Supabase v2'de INITIAL_SESSION event'i
    // mevcut session'ı otomatik yayınlar, getSession() ayrıca çağırmak race condition yaratır.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleUser(session.user);
      } else {
        setAuthState({ user: null, restaurantId: null, loading: false });
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
    setAuthState({ user: null, restaurantId: null, loading: false });
  }

  async function signUp(email: string, password: string, restaurantName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      const restaurant = await createRestaurant(data.user.id, restaurantName);
      setRestaurantId(restaurant.id);
      setAuthState(prev => ({ ...prev, restaurantId: restaurant.id }));
    }
  }

  return { ...authState, signIn, signOut, signUp };
}
