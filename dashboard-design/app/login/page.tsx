"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Redirect to Neon Auth sign-in page
  useEffect(() => {
    router.push("/auth/sign-in");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted-50">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
        <p className="text-sm text-muted-500">Redirecting to sign in...</p>
      </div>
    </div>
  );
}
