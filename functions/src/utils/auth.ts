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
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      response.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    await next();
  } catch (error) {
    console.error('Authentication error:', error);
    response.status(401).json({ error: 'Invalid token' });
  }
}; 