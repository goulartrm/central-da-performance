"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

// Public routes that don't require authentication
const publicRoutes = ["/login", "/auth/sign-in", "/auth/sign-up", "/auth/forgot-password"];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check while loading or for public routes
    if (isLoading || publicRoutes.includes(pathname)) {
      return;
    }

    // Also check if it's an auth route (starts with /auth/)
    const isAuthRoute = pathname.startsWith("/auth/");
    if (isAuthRoute) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted-50">
        <div className="animate-pulse text-muted-500">Carregando...</div>
      </div>
    );
  }

  // For public routes or authenticated users, render children
  if (publicRoutes.includes(pathname) || pathname.startsWith("/auth/") || isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted-50">
      <div className="animate-pulse text-muted-500">Redirecionando...</div>
    </div>
  );
}
