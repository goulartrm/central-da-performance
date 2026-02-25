"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/api";

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
  const [userRole, setUserRole] = useState<string>("user");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Fetch user role from backend when session changes
  useEffect(() => {
    if (session?.user) {
      fetchUserRole();
    } else {
      setUserRole("user");
    }
  }, [session]);

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!isLoading && session?.user && pathname === "/login") {
      router.push("/");
    }
  }, [isLoading, session, pathname, router]);

  const loadSession = async () => {
    try {
      const result = await authClient.getSession();
      const sessionData = result.data || null;
      setSession(sessionData);

      // Get backend JWT using email from Neon Auth session
      if (sessionData?.user?.email) {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const backendUrl = apiBaseUrl.startsWith('http')
            ? `${apiBaseUrl}/api/auth/get-backend-token`
            : `/api/auth/get-backend-token`;

          const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: sessionData.user.email,
              name: sessionData.user.name,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              api.setToken(data.token);
              // Update the role from the backend response
              if (data.user?.role) {
                setUserRole(data.user.role);
              }
            }
          } else {
            console.error('Failed to get backend token:', await response.text());
          }
        } catch (fetchError) {
          console.error('Failed to get backend token:', fetchError);
        }
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setSession(null);
      api.clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRole = async () => {
    // Role is now set during token exchange, but this can be used as a fallback
    // Only fetch if we don't have a role yet
    if (userRole !== "user") return;

    try {
      // Use the api client which has the token
      const response = await api.getCurrentUser();
      setUserRole(response.user.role);
    } catch (error) {
      console.error("Failed to fetch user role:", error);
      setUserRole("user");
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
      setSession(null);
      setUserRole("user");
      api.clearToken();
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const refreshSession = async () => {
    await loadSession();
  };

  // Determine if user is superadmin based on email domain
  const isVectorEmail = session?.user?.email?.endsWith('@vetorimobi.com.br') || false;

  // Convert Neon Auth user to local User type for backward compatibility
  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: isVectorEmail ? 'superadmin' : userRole,
        created_at: session.user.createdAt,
      }
    : null;

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: !!session?.user,
    isAdmin: isVectorEmail || userRole === "admin" || userRole === "superadmin",
    isSuperAdmin: isVectorEmail || userRole === "superadmin",
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
