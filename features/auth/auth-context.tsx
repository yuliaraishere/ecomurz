'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import type { AuthUser } from './types';
import { useRouter } from '@/i18n/routing';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const mapSupabaseUser = (sbUser: any): AuthUser | null => {
    if (!sbUser || !sbUser.email) return null;
    return {
      id: sbUser.id,
      email: sbUser.email,
      role: (sbUser.user_metadata?.role as 'CUSTOMER' | 'ADMIN') || 'CUSTOMER',
      fullName:
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.name ||
        sbUser.email.split('@')[0],
      createdAt: sbUser.created_at,
    };
  };

  const refreshUser = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();
      setUser(mapSupabaseUser(sbUser));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Initial check
    void refreshUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSupabaseUser(session?.user));
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
