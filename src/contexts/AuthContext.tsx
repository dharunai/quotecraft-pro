import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  companyId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { fullName?: string, companyName?: string, mode?: 'create' | 'join', companyCode?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hard 3s timeout wrapper for any promise
function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Get session with 3s timeout
        const sessionResult = await withTimeout(
          supabase.auth.getSession()
        );

        const currentSession = sessionResult?.data?.session ?? null;

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // If user exists, try to find their company (with timeout)
        if (currentSession?.user) {
          try {
            const profileResult = await withTimeout(
              Promise.resolve(supabase.from('profiles').select('company_id').eq('user_id', currentSession.user.id).maybeSingle())
            );
            // @ts-ignore
            if (isMounted && profileResult?.data?.company_id) {
              // @ts-ignore
              setCompanyId(profileResult.data.company_id);
            }
          } catch {
            // Ignore - companyId stays null
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          try {
            const profileResult = await withTimeout(
              Promise.resolve(supabase.from('profiles').select('company_id').eq('user_id', newSession.user.id).maybeSingle())
            );
            // @ts-ignore
            if (isMounted && profileResult?.data?.company_id) {
              // @ts-ignore
              setCompanyId(profileResult.data.company_id);
            }
          } catch {
            // Ignore
          }
        } else {
          setCompanyId(null);
        }
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, options?: { fullName?: string, companyName?: string, mode?: 'create' | 'join', companyCode?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: options?.fullName,
          company_name: options?.companyName,
          mode: options?.mode || 'create',
          company_code: options?.companyCode
        },
        emailRedirectTo: window.location.origin + '/dashboard'
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, companyId, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
