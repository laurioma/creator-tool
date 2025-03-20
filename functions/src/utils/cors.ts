import { HttpsFunction, onRequest } from 'firebase-functions/v2/https';
import { Response } from 'express';
import { AuthenticatedRequest } from '../utils/auth';

const ALLOWED_ORIGINS = ['https://reactapp-c5e96.web.app', 'http://localhost:3000'];

export function withCors(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): HttpsFunction {
  return onRequest(async (request: AuthenticatedRequest, response) => {
    const origin = request.headers.origin;
    
    // Set CORS headers if origin is allowed
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Access-Control-Allow-Credentials', 'true');
      response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.set('Access-Control-Max-Age', '3600');
    }

    // Handle preflight request
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Call the actual handler
    await handler(request, response);
  });
} 