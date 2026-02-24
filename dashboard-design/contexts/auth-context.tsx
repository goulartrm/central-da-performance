"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";

// Neon Auth session types
interface NeonSession {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  } | null;
  user: {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    image?: string;
  } | null;
}

// Local user type for backward compatibility
export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: NeonSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<NeonSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!isLoading && session?.user && pathname === "/login") {
      router.push("/");
    }
  }, [isLoading, session, pathname, router]);

  const loadSession = async () => {
    try {
      const result = await authClient.getSession();
      setSession(result.data || null);
    } catch (error) {
      console.error("Failed to load session:", error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setSession(null);
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const refreshSession = async () => {
    await loadSession();
  };

  // Convert Neon Auth user to local User type for backward compatibility
  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: "user", // Default role, will be managed separately
        created_at: session.user.createdAt,
      }
    : null;

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!session?.user,
    isAdmin: false, // Will be managed via Neon Auth roles
    isSuperAdmin: false, // Will be managed via Neon Auth roles
    isLoading,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
