import { AccountView } from '@neondatabase/auth/react';

export const dynamicParams = false;

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;

  return (
    <main className="min-h-screen bg-muted-50 p-8">
      <div className="max-w-2xl mx-auto">
        <AccountView path={path} />
      </div>
    </main>
  );
}
