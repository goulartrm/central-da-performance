'use client';

import { createAuthClient } from '@neondatabase/auth/next';

// Lazy initialization to avoid potential build-time issues
let authClientInstance: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  if (!authClientInstance) {
    authClientInstance = createAuthClient();
  }
  return authClientInstance;
}

// Export a proxy for backward compatibility
export const authClient = new Proxy({} as ReturnType<typeof createAuthClient>, {
  get(target, prop) {
    return getAuthClient()[prop as keyof ReturnType<typeof createAuthClient>];
  },
});
