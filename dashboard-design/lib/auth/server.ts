import { createAuthServer, neonAuth } from '@neondatabase/auth/next/server';

// Server-side auth instance for use in Server Components, Server Actions, and Route Handlers
// Lazy initialization to avoid build-time requirement for NEON_AUTH_BASE_URL
let authServerInstance: ReturnType<typeof createAuthServer> | null = null;

export function getAuthServer() {
  if (!authServerInstance) {
    authServerInstance = createAuthServer();
  }
  return authServerInstance;
}

// Export a proxy for backward compatibility
export const authServer = new Proxy({} as ReturnType<typeof createAuthServer>, {
  get(target, prop) {
    return getAuthServer()[prop as keyof ReturnType<typeof createAuthServer>];
  },
});

// Utility function to get session in Server Components
export { neonAuth };
