import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: 'user' | 'admin';
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  updateProfile: (data: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'phone'>>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingUidRef = useRef<string | null>(null);

  // Loads the profile for a user. If the profile row is missing (e.g. the
  // signup trigger didn't fire), create one on the fly so the user is never
  // stuck without a role. Falls back to the JWT app_metadata role when the
  // profile row can't be read (RLS may block it for brand-new users until
  // the session token refreshes).
  const loadProfile = useCallback(async (uid: string, fallbackUser?: User | null): Promise<Profile | null> => {
    // Prevent concurrent loads for the same uid from racing each other.
    if (loadingUidRef.current === uid) return null;
    loadingUidRef.current = uid;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, role')
        .eq('id', uid)
        .maybeSingle();

      let result: Profile | null = (data as Profile | null) ?? null;

      // If RLS blocked the read (error) or the row is missing, try to create
      // it. The handle_new_user trigger normally handles this, but this is a
      // safety net for users created before the trigger existed or when the
      // trigger failed.
      if (!result && !error) {
        const fullName = (fallbackUser?.user_metadata?.full_name as string) || '';
        const { error: insertError } = await supabase.from('profiles').upsert(
          { id: uid, full_name: fullName, role: 'user' },
          { onConflict: 'id' }
        );
        if (!insertError) {
          const { data: retry } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, role')
            .eq('id', uid)
            .maybeSingle();
          result = (retry as Profile | null) ?? null;
        }
      }

      // If we still have no profile (e.g. RLS blocked both the read and the
      // upsert), derive a minimal profile from the JWT so the UI can render
      // and the admin check can still resolve for users whose role lives in
      // app_metadata.
      if (!result && fallbackUser) {
        const jwtRole = (fallbackUser.app_metadata?.role as string) || 'user';
        result = {
          id: uid,
          full_name: (fallbackUser.user_metadata?.full_name as string) || '',
          avatar_url: null,
          phone: null,
          role: jwtRole === 'admin' ? 'admin' : 'user',
        };
      }

      setProfile(result);
      return result;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Profile load error:', err);
      return null;
    } finally {
      loadingUidRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await loadProfile(data.user.id, data.user);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  // Force a fresh read from the database — bypasses any stale state and
  // returns the latest profile so callers can act on the updated role.
  const refreshProfile = async (): Promise<Profile | null> => {
    if (!user) return null;
    return loadProfile(user.id, user);
  };

  const updateProfile = async (data: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'phone'>>) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) await refreshProfile();
    return { error: error?.message ?? null };
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
