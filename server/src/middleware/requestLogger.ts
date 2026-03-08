import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  (req as any).requestId = requestId;
  
  const start = Date.now();
  
  // Log request
  console.log(`[${requestId}] 📥 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${requestId}] 📦 Request body:`, JSON.stringify(req.body, null, 2));
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`[${requestId}] ${statusEmoji} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
}
