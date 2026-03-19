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
      const restaurant = await getRestaurantForUser(user.id);
      if (restaurant) {
        setRestaurantId(restaurant.id);
        setAuthState({ user, restaurantId: restaurant.id, loading: false });
      } else {
        // Kullanıcı var ama restoran yok — kayıt yarım kalmış olabilir
        setAuthState({ user, restaurantId: null, loading: false });
      }
    }

    // Mevcut session'ı kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUser(session.user);
      } else {
        setAuthState({ user: null, restaurantId: null, loading: false });
      }
    });

    // Auth değişikliklerini dinle
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
