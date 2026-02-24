import { authApiHandler } from '@neondatabase/auth/next/server';

// Lazy initialization to avoid build-time requirement for NEON_AUTH_BASE_URL
// Only initialize the handler when the route is actually accessed
let handler: ReturnType<typeof authApiHandler> | null = null;

function getHandler() {
  if (!handler) {
    handler = authApiHandler();
  }
  return handler;
}

export const GET = (req: Request, context: any) => getHandler().GET(req, context);
export const POST = (req: Request, context: any) => getHandler().POST(req, context);
export const PUT = (req: Request, context: any) => getHandler().PUT(req, context);
export const DELETE = (req: Request, context: any) => getHandler().DELETE(req, context);
export const PATCH = (req: Request, context: any) => getHandler().PATCH(req, context);
