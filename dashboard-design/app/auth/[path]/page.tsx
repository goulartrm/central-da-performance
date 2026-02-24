import { AuthView } from '@neondatabase/auth/react';

export const dynamicParams = false;

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted-50">
      <AuthView path={path} />
    </main>
  );
}
