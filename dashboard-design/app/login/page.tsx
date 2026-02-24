"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity } from "lucide-react";

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect to Neon Auth sign-in page with callback URL
  useEffect(() => {
    const redirectTo = searchParams.get("redirect") || "/";
    // Neon Auth will handle redirect after sign-in
    router.push(`/auth/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted-50">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-500">Redirecting to sign in...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted-50">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-500">Loading...</p>
        </div>
      </div>
    }>
      <LoginRedirect />
    </Suspense>
  );
}
