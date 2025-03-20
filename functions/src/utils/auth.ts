import { getAuth } from 'firebase-admin/auth';
import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

type NextFunction = () => Promise<void> | void;

export const authenticateRequest = async (
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('Authentication attempt - Headers:', request.headers);
    const authHeader = request.headers.authorization;
    console.log('Auth header:', authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No valid Bearer token found in headers');
      response.status(401).json({ 
        error: 'No token provided',
        headers: request.headers
      });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Token length:', token.length);
    
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      console.log('Token verified successfully for user:', decodedToken.uid);
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email
      };
      await next();
    } catch (verifyError: any) {
      console.error('Token verification failed:', verifyError);
      response.status(401).json({ 
        error: 'Invalid token',
        details: verifyError?.message || 'Unknown verification error'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    response.status(401).json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 