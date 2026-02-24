import { createAuthServer, neonAuth } from '@neondatabase/auth/next/server';

// Server-side auth instance for use in Server Components, Server Actions, and Route Handlers
export const authServer = createAuthServer();

// Utility function to get session in Server Components
export { neonAuth };
